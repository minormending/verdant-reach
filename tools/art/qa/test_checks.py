"""Synthetic positive and negative fixtures; no generated art is modified."""
import unittest
import numpy as np
from checks import *


def leaf():
    ix = np.full((56, 56), T, np.uint8)
    ix[8:55, 12:48] = 2
    ix[8, 12:48] = ix[54, 12:48] = 0
    ix[8:55, 12] = ix[8:55, 47] = 0
    ix[10, 15:22] = 3
    return ix


def tile(value=80):
    a = np.full((16, 16, 4), value, np.uint8)
    a[..., 3] = 255
    return a


class FaceTests(unittest.TestCase):
    def test_clean_leaf(self):
        self.assertEqual(face_risk(leaf())['status'], 'PASS')

    def test_eye_glint(self):
        ix = leaf(); ix[22:24, 22:24] = 0; ix[21, 22] = 3
        r = face_risk(ix)
        self.assertEqual(r['status'], 'FAIL')
        self.assertEqual(r['coordinates'][0]['kind'], 'eye_glint')
        self.assertEqual((r['coordinates'][0]['x'], r['coordinates'][0]['y']), (22, 22))

    def test_dark_tone_eye_and_far_glint(self):
        ix = leaf(); ix[22, 22] = 1; ix[20, 22] = 3
        self.assertEqual(face_risk(ix)['status'], 'FAIL')
        ix[20, 22] = 2; ix[19, 22] = 3
        self.assertEqual(face_risk(ix)['status'], 'PASS')

    def test_pair_and_unpaired(self):
        ix = leaf(); ix[23, 22] = 0; ix[23, 28] = 1
        self.assertTrue(any(f['kind'] == 'eye_pair' for f in face_risk(ix)['coordinates']))
        ix[23, 28] = 2; ix[23, 24] = 1
        self.assertTrue(any(f['kind'] == 'eye_pair' for f in face_risk(ix)['coordinates']))
        ix[23, 24] = 2; ix[23, 32] = 1
        self.assertEqual(face_risk(ix)['status'], 'PASS')

    def test_mouth_and_long_rib(self):
        ix = leaf(); ix[25, 22:28] = 0
        self.assertEqual(face_risk(ix)['coordinates'][0]['kind'], 'mouth_slit')
        ix[25, 22:32] = 0
        self.assertEqual(face_risk(ix)['status'], 'PASS')

    def test_diagonal_rib_and_busy_texture(self):
        ix = leaf()
        for i in range(10): ix[20+i, 20+i] = 0
        ix[20, 21] = 3
        self.assertEqual(face_risk(ix)['status'], 'PASS')
        ix = leaf()
        for x in (22, 26, 30): ix[22, x] = 0; ix[21, x] = 3
        self.assertEqual(face_risk(ix)['status'], 'PASS')

    def test_blob_at_transparency_is_not_enclosed(self):
        ix = leaf(); ix[7, 20] = 1; ix[9, 20] = 3
        self.assertEqual(face_risk(ix)['status'], 'PASS')


class GeometryTests(unittest.TestCase):
    def test_classes(self):
        for cls, extent, width in [('baby', 40, 24), ('teen', 48, 27)]:
            ix = np.full((56, 56), T, np.uint8)
            ix[56-extent:56, 18:18+width] = 2
            self.assertEqual(size_class(ix, cls)['status'], 'PASS')
        ix = np.full((56, 56), T, np.uint8); ix[:, 13:43] = 2
        self.assertNotEqual(size_class(ix, 'adult')['status'], 'FAIL')
        self.assertEqual(size_class(leaf(), 'adult')['status'], 'FAIL')
        self.assertEqual(size_class(ix, 'baby')['status'], 'FAIL')

    def test_edge_warning(self):
        ix = np.full((56, 56), T, np.uint8); ix[18:56, 20:45] = 2
        self.assertEqual(size_class(ix, 'baby')['status'], 'WARN')

    def test_adult_edges_warn_but_extent_and_fill_still_fail(self):
        ix = np.full((56, 56), T, np.uint8); ix[1:55, 13:43] = 2
        r = size_class(ix, 'adult')
        self.assertEqual((r['status'], r['level'], r['edges']), ('WARN', 'warn', 0))
        ix = np.full((56, 56), T, np.uint8); ix[:54, 13:43] = 2
        r = size_class(ix, 'adult')
        self.assertEqual((r['status'], r['level'], r['edges']), ('WARN', 'warn', 1))
        for extent, width in [(51, 30), (54, 20), (54, 40)]:
            with self.subTest(extent=extent, width=width):
                ix = np.full((56, 56), T, np.uint8); ix[:extent, :width] = 2
                r = size_class(ix, 'adult')
                self.assertEqual((r['status'], r['level']), ('FAIL', 'error'))

    def test_empty(self):
        self.assertEqual(geometry(np.full((56, 56), T))['extent'], 0)

    def test_grounding(self):
        ix = leaf()
        self.assertEqual(grounding(ix)['status'], 'PASS')
        ix[54] = T
        self.assertEqual(grounding(ix)['status'], 'WARN')
        self.assertEqual(grounding(ix, 'Floating seed')['status'], 'PASS')

    def test_mass(self):
        self.assertEqual(centre_of_mass(leaf())['status'], 'PASS')
        ix = np.full((56, 56), T); ix[:, :10] = 2
        self.assertEqual(centre_of_mass(ix)['status'], 'WARN')

    def test_progression(self):
        ix = leaf(); smaller = ix.copy(); smaller[:20] = T
        self.assertEqual(stage_progression(smaller, ix)['status'], 'PASS')
        self.assertEqual(stage_progression(ix, smaller)['status'], 'FAIL')

    def test_back_fill(self):
        ix = np.full((48, 48), T); ix[:, 8:40] = 2
        self.assertEqual(back_fill(ix)['status'], 'PASS')
        ix[:, 16:40] = T
        self.assertEqual(back_fill(ix)['status'], 'WARN')

    def test_noise(self):
        ix = leaf()
        self.assertEqual(silhouette_noise(ix)['status'], 'PASS')
        for x in range(16, 44, 2): ix[7, x] = 0
        self.assertEqual(silhouette_noise(ix)['status'], 'WARN')
        ix = leaf()
        for x in range(18, 38, 4): ix[22, x] = T
        self.assertEqual(silhouette_noise(ix)['holes'], 5)
        self.assertEqual(silhouette_noise(ix)['status'], 'WARN')


class AnimationTests(unittest.TestCase):
    def test_motion_and_boxes(self):
        a = leaf(); b = a.copy(); b[20:28, 20:28] = 3
        steps = [[0, 12], [1, 30], [0, 1]]
        self.assertEqual(anim_signature([a, b], steps, [(19, 19, 29, 29)])['status'], 'PASS')
        self.assertEqual(anim_signature([a, b], steps, [(1, 1, 3, 3)])['status'], 'WARN')
        self.assertEqual(anim_signature([a, b], steps, None)['status'], 'WARN')
        self.assertEqual(anim_signature([a, a], steps, [(0, 0, 56, 56)])['status'], 'WARN')

    def test_unused_frame_does_not_count(self):
        a = leaf(); b = a.copy(); b[20:28, 20:28] = 3
        self.assertEqual(anim_signature([a, b], [[0, 48]], [(0, 0, 56, 56)])['status'], 'WARN')


class HashTests(unittest.TestCase):
    def test_hashes_and_clone_exclusion(self):
        rng = np.random.default_rng(42)
        a = rng.integers(0, 256, (56, 56, 4), dtype=np.uint8); a[..., 3] = 255
        b = a[::-1, ::-1].copy()
        ha, hb = hashes(a), hashes(b)
        self.assertEqual(hash_distance(ha, ha), (0, 0))
        self.assertGreater(sum(hash_distance(ha, hb)), 20)
        self.assertEqual(clone_risk(ha, [('other', 'b', ha)], 'a', 'self')['status'], 'WARN')
        self.assertEqual(clone_risk(ha, [('other', 'a', ha)], 'a', 'self')['status'], 'PASS')
        self.assertEqual(clone_risk(ha, [('other', 'b', hb)], 'a', 'self')['status'], 'PASS')


class TileTests(unittest.TestCase):
    def test_seam_and_no_seam(self):
        a = tile()
        self.assertEqual(seam(a)['status'], 'PASS')
        a[:, -1, :3] = 240
        self.assertEqual(seam(a)['status'], 'WARN')
        a = tile(); a[-1, :, :3] = 240
        self.assertEqual(seam(a)['status'], 'WARN')

    def test_transparency_disagreement(self):
        a = tile(0); b = a.copy(); b[..., 3] = 0
        self.assertEqual(edge_difference(a[:, 0], b[:, 0]), 255)

    def test_autotile_edges(self):
        variants = {mask: [tile(), tile()] for mask in range(16)}
        self.assertEqual(autotile_edges(variants)['status'], 'PASS')
        variants[2][1][:, -1, :3] = 240
        r = autotile_edges(variants)
        self.assertEqual(r['status'], 'FAIL')
        self.assertTrue(any(m['masks'] == [2, 8] and m['frame'] == 1 for m in r['mismatches']))

    def test_autotile_thresholds_and_reported_difference(self):
        for difference, status, level in [(0, 'PASS', 'warn'), (1, 'WARN', 'warn'),
                                           (16, 'WARN', 'warn'), (17, 'FAIL', 'error')]:
            with self.subTest(difference=difference):
                variants = {mask: [tile()] for mask in range(16)}
                variants[2][0][:, -1, :3] += difference
                r = autotile_edges(variants)
                self.assertEqual((r['status'], r['level']), (status, level))
                self.assertEqual(r['max_difference'], difference)
                self.assertIn(f'max={difference:.2f}', r['value'])
                if difference:
                    self.assertTrue(all(m['difference'] == difference for m in r['mismatches']))

    def test_autotile_fractional_mismatch_warns(self):
        variants = {mask: [tile()] for mask in range(16)}
        variants[2][0][0, -1, :3] += 1
        r = autotile_edges(variants)
        self.assertEqual(r['status'], 'WARN')
        self.assertGreater(r['max_difference'], 0)
        self.assertLess(r['max_difference'], 1)


class GridArtifactTests(unittest.TestCase):
    def test_stamped_border_warns_even_though_edges_match(self):
        before = tile(180)
        after = before.copy()
        after[[0, -1], :, :3] = 40
        after[:, [0, -1], :3] = 40
        self.assertEqual(seam(after)['status'], 'PASS')
        r = grid_artifact(before, after)
        self.assertEqual(r['status'], 'WARN')
        self.assertEqual(r['level'], 'warn')
        self.assertEqual(r['before_energy'], 0)
        self.assertGreater(r['after_energy'], 16)

    def test_existing_pattern_and_continuous_four_pixel_courses_pass(self):
        a = tile(180); a[1::4, :, :3] = 40
        self.assertEqual(grid_artifact(tile(180), a)['status'], 'PASS')
        self.assertEqual(grid_artifact(a, a)['status'], 'PASS')
        b = tile(180); b[[0, -1], :, :3] = 40
        self.assertEqual(grid_artifact(b, b)['status'], 'PASS')
        self.assertEqual(grid_artifact(b, tile(180))['status'], 'PASS')

    def test_brown_trim_on_flat_wall_also_warns(self):
        before = np.full((16, 16, 4), (128, 96, 72, 255), np.uint8)
        after = before.copy()
        after[[0, -1], :, :3] = (152, 80, 40)
        after[:, [0, -1], :3] = (152, 80, 40)
        self.assertEqual(grid_artifact(before, after)['status'], 'WARN')

    def test_hidden_rgb_is_ignored_and_alpha_grid_is_detected(self):
        a = tile(180); a[..., 3] = 0
        b = a.copy(); b[:, 0, :3] = 20
        self.assertEqual(grid_artifact(a, b)['status'], 'PASS')
        b[:, 0, 3] = 255
        self.assertEqual(grid_artifact(a, b)['status'], 'WARN')


if __name__ == '__main__':
    unittest.main()
