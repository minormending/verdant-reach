"""Local R2b review, containing licensed pixels: ignored review directory only."""
import json
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw
from build_pack import Sources, roots, HERE, ROOT, PACK, guarded
from gen_props import mappings, prop_specs
from geometry import measured_props
from terrain import outdoor_images, TERRAINS

REVIEW = HERE / 'review'


def guarded_review(path):
    if not path.is_relative_to(REVIEW) or not path.resolve().is_relative_to(REVIEW.resolve()) or REVIEW.is_symlink() or path.is_symlink():
        raise RuntimeError('refusing review outside the ignored local review directory')
    if subprocess.run(['git', 'check-ignore', '-q', '--', str(path.relative_to(ROOT))], cwd=ROOT).returncode:
        raise RuntimeError('review destination is not gitignored')


def render():
    sources = Sources(roots())
    images, _ = measured_props(mappings(), sources)
    specs = prop_specs()
    exterior = json.loads((HERE / 'mapping/exterior_props.json').read_text())
    # Fixed cell width covers the largest 288px building; four columns <=1400px.
    width, cell_w = 1280, 320
    rows, heights = [], []
    keys = sorted(exterior)
    for i in range(0, len(keys), 4):
        row = keys[i:i + 4]
        rows.append(row)
        heights.append(max(images['prop_' + k].height for k in row) + 44)
    terrain, _, _ = outdoor_images(sources)
    height = 30 + sum(heights) + math.ceil(len(TERRAINS) / 4) * 224
    canvas = Image.new('RGBA', (width, height), '#232b31')
    d = ImageDraw.Draw(canvas)
    d.text((8, 8), 'R2b exterior props (1x), doors red; original fallback entries marked GBC; terrain patches (2x)', fill='white')
    top = 30
    for row, rh in zip(rows, heights):
        for n, key in enumerate(row):
            im = images['prop_' + key]
            x, y = n * cell_w + (cell_w - im.width) // 2, top + rh - im.height - 16
            canvas.alpha_composite(im, (x, y))
            fallback = exterior[key]['source'] is None and key not in {'conservatory', 'house_small'}
            d.text((n * cell_w + 8, top + 4), key + (' (GBC)' if fallback else ''), fill='white')
            door = specs['prop_' + key].get('door')
            if door:
                dx, dy = x + door['x'] * 16, y + door['y'] * 16
                d.rectangle((dx, dy, dx + 15, dy + 15), outline='#ff3030', width=1)
                d.text((n * cell_w + 8, top + 16), f"door ({door['x']},{door['y']})", fill='#ff9090')
        top += rh
    for n, key in enumerate(TERRAINS):
        x0, y0 = n % 4 * cell_w + 8, top + n // 4 * 224
        d.text((x0, y0 + 4), f'{key}: block {TERRAINS[key][0]}', fill='white')
        patch = Image.new('RGBA', (96, 96))
        cells = {(x, y) for y in range(1, 5) for x in range(1, 5) if x in {2, 3} or y in {2, 3}}
        for y in range(6):
            for x in range(6):
                if (x, y) in cells:
                    mask = sum(bit for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)) if (x + dx, y + dy) in cells)
                    tile = terrain.get(f'{key}@{mask}', terrain[key])
                else:
                    tile = terrain['grass']
                patch.alpha_composite(Image.fromarray(tile), (x * 16, y * 16))
        canvas.alpha_composite(patch.resize((192, 192), Image.Resampling.NEAREST), (x0, y0 + 24))
    path = REVIEW / 'r2b.png'
    guarded_review(path)
    path.parent.mkdir(exist_ok=True)
    canvas.convert('RGB').save(path)
    print(path.relative_to(ROOT))


if __name__ == '__main__':
    render()
