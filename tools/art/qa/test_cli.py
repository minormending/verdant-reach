import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
from PIL import Image
import qa


class IntegrationTests(unittest.TestCase):
    def test_metadata_uses_game_stages_including_two_stage_lines(self):
        meta = qa.species_metadata()
        self.assertEqual(meta['oak_acorn']['class'], 'baby')
        self.assertEqual(meta['oak_sapling']['class'], 'teen')
        self.assertEqual(meta['great_oak']['class'], 'adult')
        self.assertEqual(meta['sundew_rosette']['class'], 'teen')
        self.assertEqual(meta['sundew']['class'], 'adult')
        self.assertEqual(set(meta), set(qa.kit.roster_ids()))

    def test_changed_bundle_paths_include_packs_and_removed(self):
        paths = ['public/art/species/oak/front.png', 'public/art/sets/ui/x.png',
                 'public/art/packs/classic/species/oak/front.png',
                 'public/art/tilesets/terrain/sheet.png', 'public/art/index.json']
        self.assertEqual(qa.changed_bundles(paths), ['packs/classic/species/oak',
          'sets/ui', 'species/oak', 'tilesets/terrain'])

    def test_changed_paths_include_worktree_and_untracked(self):
        with patch.object(qa.subprocess, 'run') as verify, patch.object(qa.subprocess, 'check_output',
            side_effect=[b'public/art/species/oak/front.png\0', b'public/art/sets/ui/new.png\0']):
            paths = qa.changed_paths('HEAD')
        self.assertEqual(len(paths), 2)
        self.assertIn('--verify', verify.call_args.args[0])

    def test_changed_sheet_wraps_and_filters_set_images(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            folder = root/'public/art/sets/ui'; folder.mkdir(parents=True)
            (folder/'set.json').write_text(json.dumps({'images': {
                'a': {'file': 'a.png'}, 'b': {'file': 'b.png'}}}))
            Image.new('RGBA', (8, 8), (255, 0, 0, 255)).save(folder/'a.png')
            Image.new('RGBA', (8, 8), (0, 0, 255, 255)).save(folder/'b.png')
            report = {'changed_paths': ['public/art/sets/ui/a.png']}
            with patch.object(qa, 'ROOT', root):
                qa.contact_sheet(['sets/ui']*12+['species/removed'], report, root/'out.png')
            a = np.asarray(Image.open(root/'out.png'))
            self.assertLessEqual(a.shape[1], 1400)
            self.assertGreater(a.shape[0], 100)
            self.assertTrue(np.any(np.all(a == (255, 0, 0), axis=-1)))
            self.assertFalse(np.any(np.all(a == (0, 0, 255), axis=-1)))

    def test_species_sheet_last_intro_frame_and_pack_fallback(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            base = root/'public/art/species/leaf'; base.mkdir(parents=True)
            pack = root/'public/art/packs/test/species/leaf'; pack.mkdir(parents=True)
            js = {'frames': {'front': ['front.png', 'pose.png'], 'back': ['back.png'],
                  'icon': ['icon.png']}, 'anim': {'intro': [[0, 10], [1, 10], [0, 1]]}}
            (base/'species.json').write_text(json.dumps(js)); (pack/'species.json').write_text('{}')
            for name, size in [('front.png', 56), ('pose.png', 56), ('back.png', 48), ('icon.png', 16)]:
                Image.new('RGBA', (size, size), (255, 0, 0, 255)).save(base/name)
            with patch.object(qa, 'ROOT', root):
                qa.contact_sheet(['packs/test/species/leaf'], {'species': {}}, root/'out.png')
            with Image.open(root/'out.png') as image:
                self.assertLessEqual(image.width, 1400)

    def test_face_in_one_intro_frame_is_an_error(self):
        a = np.full((56, 56), qa.kit.T, np.uint8); a[5:55, 8:48] = 2
        b = a.copy(); b[22, 22] = 0; b[21, 22] = 3
        pal = ['#181818', '#286828', '#80c880', '#f8f8f8']
        imgs = {'front': [qa.kit.to_rgba(a, pal), qa.kit.to_rgba(b, pal)],
                'back': [qa.kit.to_rgba(a[:48, :48], pal)]}
        roster = {'synthetic': {'js': {'palette': pal, 'anim': {'intro': [[0, 47], [1, 1], [0, 1]]}},
                  'imgs': imgs, 'meta': {'line': 'test', 'stage': 1, 'class': 'adult'}}}
        with patch.object(qa.kit, 'check', return_value=[]):
            checks = qa.check_species('synthetic', roster, [])
        self.assertEqual(checks['face_risk']['status'], 'FAIL')
        self.assertEqual(checks['face_risk']['coordinates'][0]['frame'], 1)

    def test_exit_status_warnings_vs_errors_and_json(self):
        roster = {'test': {'meta': {'line': 'test'}, 'imgs': {'front': [np.zeros((56, 56, 4), np.uint8)]}}}
        with tempfile.TemporaryDirectory() as temp, patch.object(qa, 'load_roster', return_value=roster), contextlib.redirect_stdout(io.StringIO()):
            output = Path(temp)/'out.json'
            for status, level, expected in [('WARN', 'warn', 0), ('FAIL', 'error', 1), ('PASS', 'error', 0)]:
                with patch.object(qa, 'check_species', return_value={'check': {'status': status, 'level': level, 'value': 1}}):
                    self.assertEqual(qa.main(['--all', '--json', str(output)]), expected)
                self.assertEqual(json.loads(output.read_text())['error_count'], expected)

    def test_deleted_manifest_and_missing_images_get_labelled(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            folder = root/'public/art/characters/test'; folder.mkdir(parents=True)
            with patch.object(qa, 'ROOT', root):
                qa.contact_sheet(['characters/test'], {}, root/'removed.png')
                (folder/'character.json').write_text(json.dumps({'sheet': 'missing.png'}))
                qa.contact_sheet(['characters/test'], {}, root/'missing.png')
            self.assertTrue((root/'removed.png').exists())
            self.assertTrue((root/'missing.png').exists())

    def test_no_changes_creates_explicit_empty_sheet(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)/'empty.png'; qa.contact_sheet([], {}, out)
            with Image.open(out) as image:
                self.assertEqual(image.size, (396, 56))


if __name__ == '__main__':
    unittest.main()
