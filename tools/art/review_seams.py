"""Before/after 4x seam sheets, including every changed tile cell.

Run after the generators and QA:
  python tools/art/review_seams.py --ref main --before /tmp/seams-before.json --after /tmp/seams-after.json

Only writes tools/art/review/seams_*.png and seams_report.md. The git ref
supplies before images; PNG assets are read, never repaired by this tool.
"""
import argparse
import io
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from artkit.sheets import explode, group_stems

ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / 'tools/art/review'


def previous(ref, path):
    return subprocess.check_output(['git', 'show', f'{ref}:{path.relative_to(ROOT)}'], cwd=ROOT)


def repeat(tile):
    return np.tile(tile, (3, 3, 1))


def mixed(tiles, key, frame):
    """A 3x3 solid patch: corners, straight edges and fully joined centre."""
    suffix = '__2' if frame == 2 else ''
    patch = np.zeros((48, 48, 4), np.uint8)
    for y, row in enumerate(((6, 14, 12), (7, 15, 13), (3, 11, 9))):
        for x, mask in enumerate(row):
            patch[y*16:y*16+16, x*16:x*16+16] = tiles.get(f'{key}@{mask}{suffix}', tiles[key+suffix])
    return patch


def sheet(tid, cards):
    cols, cw, ch = 4, 412, 230
    im = Image.new('RGB', (cols*cw+16, ((len(cards)+cols-1)//cols)*ch+44), '#202830')
    draw = ImageDraw.Draw(im)
    draw.text((8, 8), f'{tid}: BEFORE (left) / AFTER (right), 3x3 repeats at 4x; mixed cards use neighbouring masks', fill='white')
    for i, (label, before, after) in enumerate(cards):
        x, y = 8+(i % cols)*cw, 40+(i//cols)*ch
        draw.text((x, y), label, fill='white')
        for j, pixels in enumerate((before, after)):
            patch = Image.fromarray(pixels, 'RGBA').resize((192, 192), Image.Resampling.NEAREST)
            im.paste(patch, (x+j*204, y+18), patch)
    im.save(REVIEW / f'seams_{tid}.png')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', default='main')
    parser.add_argument('--before', type=Path, required=True)
    parser.add_argument('--after', type=Path, required=True)
    args = parser.parse_args()
    old_qa, new_qa = (json.loads(p.read_text())['tilesets'] for p in (args.before, args.after))
    REVIEW.mkdir(parents=True, exist_ok=True)
    report = ['# Tile seam review', '', f'Baseline: `{args.ref}`. Every changed cell appears in a 3×3 repeat at 4×, before/after.',
              'Mixed cards additionally show reciprocal masks in a 3×3 patch.', '',
              'Only boundary pixels changed, plus the wall face’s open-north rim (row 1, E2 → E1) to fit shared wood trim.',
              'All other interior pixels and all tileset palettes are unchanged.',
              'Every generated 8×8 quadrant retains at most four colours.', '']
    overview = []
    for path in sorted((ROOT / 'public/art/tilesets').glob('*/tileset.json')):
        tid = path.parent.name
        old_meta = json.loads(previous(args.ref, path))
        new_meta = json.loads(path.read_text())
        old_sheet = np.array(Image.open(io.BytesIO(previous(args.ref, path.parent/old_meta['sheet']))).convert('RGBA'))
        new_sheet = np.array(Image.open(path.parent/new_meta['sheet']).convert('RGBA'))
        before = explode(old_sheet, old_meta['tiles'], old_meta['columns'])
        after = explode(new_sheet, new_meta['tiles'], new_meta['columns'])
        changed = [s for s in after if not np.array_equal(before[s], after[s])]
        if not changed:
            continue
        assert set(map(tuple, old_sheet.reshape(-1, 4))) == set(map(tuple, new_sheet.reshape(-1, 4))), tid
        for s, a in after.items():
            interior = before[s][1:15, 1:15].copy()
            if tid == 'interior' and s in ('wall@0', 'wall@2', 'wall@8', 'wall@10'):
                interior[0] = (232, 216, 176, 255)  # existing E1, the lit wallpaper rim
            assert np.array_equal(interior, a[1:15, 1:15]), (tid, s)
            for y in (0, 8):
                for x in (0, 8):
                    assert len(np.unique(a[y:y+8, x:x+8].reshape(-1, 4), axis=0)) <= 4, (tid, s)
        cards = []
        keys = group_stems(changed)
        for key in sorted(keys):
            group = group_stems(after)[key]
            for frame in sorted(group['base']):
                if group['mask']:
                    cards.append((f'{key} mixed frame {frame}', mixed(before, key, frame), mixed(after, key, frame)))
                    overview.append((f'{tid}/{key} f{frame}', mixed(before, key, frame), mixed(after, key, frame)))
            for s in sorted(s for s in changed if s.split('@')[0].split('~')[0].split('__')[0] == key):
                cards.append((s, repeat(before[s]), repeat(after[s])))
        sheet(tid, cards)
        report += [f'## {tid}', '', f'{len(changed)} changed cells. [Review sheet](seams_{tid}.png).', '',
                   '| Tile/check | Before | After |', '|---|---|---|']
        for name, result in old_qa[tid].items():
            key = name.split(':')[1]
            if key in keys:
                report.append(f'| `{name}` | {result["value"]} | {new_qa[tid][name]["value"]} |')
        report += ['', 'Changed cells:', '', ', '.join(f'`{s}`' for s in sorted(changed)), '']
    (REVIEW / 'seams_report.md').write_text('\n'.join(report)+'\n')
    sheet('overview', overview)


if __name__ == '__main__':
    main()
