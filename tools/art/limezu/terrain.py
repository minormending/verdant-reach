"""Classify 48-tile blob blocks by pixels and reduce them to N/E/S/W masks."""
from collections import Counter
import colorsys
import numpy as np
from PIL import Image

SHEET = 'exteriors:Modern_Exteriors_16x16/Autotiles_16x16/Game_Maker_Studio_Autotiles_16x16.png'
WATER = 'exteriors:Modern_Exteriors_16x16/Animated_16x16/Animated_Terrains_16x16/Water_Tileset_16x16.png'
# Verified block numbers (one-based); fill may come from a related pure block.
TERRAINS = {'path': (1, 1), 'dirt': (2, 2), 'sand': (7, 9), 'water': (3, 3),
            'paving': (19, 19), 'stone_path': (21, 21), 'grass': (12, 12)}


def strips(a):
    # Mid-edge strips ignore the blob's inner-corner decorations.
    return [a[:2, 5:11], a[5:11, -2:], a[-2:, 5:11], a[5:11, :2]]


def palette(a):
    pixels = a.reshape(-1, 4)
    colors = Counter(tuple(p) for p in pixels if p[3])
    return np.array([c for c, _ in colors.most_common(8)], dtype=np.int32)


def distance(a, colors):
    if not len(colors):
        return 0.0 if not np.any(a[..., 3]) else 255.0
    pixels = a.astype(np.int32).reshape(-1, 4)
    # Alpha is part of the metric: transparent transitions never match a fill.
    return float(np.min(np.mean(np.abs(pixels[:, None] - colors[None]), axis=2), axis=1).mean())


def color_name(rgb):
    r, g, b = map(int, rgb[:3])
    if max(r, g, b) - min(r, g, b) < 24:
        return 'charcoal' if r < 80 else 'grey' if r < 175 else 'ivory'
    if b > r and b > g:
        return 'blue'
    if g > r * 1.08 and g > b:
        return 'green'
    if r > 180 and r >= g >= b and r - b < 65:
        return 'beige'
    if r > b * 1.3 and g > b * 1.2:
        return 'rust' if r > g * 1.4 else 'sand' if r > 190 else 'earth'
    return 'rust' if r > g else 'teal'


def classify(sheet):
    if sheet.width != 192 or sheet.height != 26 * 64:
        raise ValueError(f'expected 26 12x4 blocks, got {sheet.size}')
    blocks = []
    for number in range(1, 27):
        tiles = [np.array(sheet.crop((x * 16, (number - 1) * 64 + y * 16, (x + 1) * 16, (number - 1) * 64 + (y + 1) * 16))) for y in range(4) for x in range(12)]
        # The fill has matching centre and four edges. Prefer opaque tiles;
        # for patterned fills compare palettes, rather than exact pixels.
        def score(i):
            a = tiles[i]
            colors = palette(a[4:12, 4:12])
            return sum(distance(edge, colors) for edge in strips(a)) + (1 - (a[..., 3] > 0).mean()) * 255
        fill = min(range(48), key=lambda i: (score(i), i))
        colors = Counter(tuple(p) for p in tiles[fill].reshape(-1, 4) if p[3])
        names = list(dict.fromkeys(color_name(c) for c, _ in colors.most_common(4)))
        blocks.append({'block': number, 'name': '-'.join(names) or 'transparent', 'fill': fill,
                       'colors': ['#%02x%02x%02x' % c[:3] for c, _ in colors.most_common(4)], 'tiles': tiles})
    return blocks


def pick_masks(tiles, fill):
    colors = palette(fill)
    # Water's interior wave/shore shading belongs to the same blue hue even
    # when it differs in value from the flat fill. Green and brown shores do not.
    dominant = colors[0]
    if color_name(dominant) == 'blue' and int(dominant[0]) < int(dominant[1]) * 0.6:
        hue = colorsys.rgb_to_hsv(*(float(v) / 255 for v in dominant[:3]))[0]
        all_colors = Counter(tuple(p) for a in tiles for p in a.reshape(-1, 4) if p[3])
        colors = np.array([c for c in all_colors if min(abs(colorsys.rgb_to_hsv(*(v / 255 for v in c[:3]))[0] - hue), 1 - abs(colorsys.rgb_to_hsv(*(v / 255 for v in c[:3]))[0] - hue)) < 0.10], dtype=np.int32)
    def inside(edge):
        pixels = edge.astype(np.int32).reshape(-1, 4)
        delta = np.min(np.mean(np.abs(pixels[:, None] - colors[None]), axis=2), axis=1)
        # An inner corner can colour part of an otherwise continuous edge.
        # A real exposed edge has no fill through its middle strip.
        return float((delta <= 3).mean()) >= 0.25
    signatures = [sum(bit for bit, edge in zip((1, 2, 4, 8), strips(a)) if inside(edge)) for a in tiles]
    result = {}
    for mask in range(16):
        def score(i):
            mismatch = (signatures[i] ^ mask).bit_count()
            # Ignore inner corners; prefer the fullest centre among ties.
            return mismatch, distance(tiles[i][5:11, 5:11], colors), i
        result[mask] = min(range(len(tiles)), key=score)
    return result


def outdoor_images(sources):
    blocks = classify(sources.sheet(SHEET))
    images, report = {}, []
    for key, (block, fill_block) in TERRAINS.items():
        entry, pure = blocks[block - 1], blocks[fill_block - 1]
        fill = pure['tiles'][pure['fill']]
        images[key] = fill
        picks = pick_masks(entry['tiles'], fill)
        if key != 'grass':
            for mask, cell in picks.items():
                images[f'{key}@{mask}'] = entry['tiles'][cell]
        else:
            colors = palette(fill)
            variants = [a for a in pure['tiles'] if all(distance(edge, colors) < 2 for edge in strips(a)) and not np.array_equal(a, fill)]
            unique = []
            for a in variants:
                if not any(np.array_equal(a, b) for b in unique):
                    unique.append(a)
            for n, a in enumerate(unique[:3], 1):
                images[f'grass~{n}'] = a
        report.append({'key': key, 'block': block, 'fill_block': fill_block, 'fill_cell': pure['fill'], 'masks': picks})
    # Animated sheet uses sand shores and a brighter turquoise fill than the
    # selected grass-shore water. Only exact fill compatibility is accepted.
    animated = sources.sheet(WATER)
    base = images['water']
    cells = [np.array(animated.crop((x, y, x + 16, y + 16))) for y in range(0, animated.height - 15, 16) for x in range(0, animated.width - 15, 16)]
    for i, a in enumerate(cells):
        if np.array_equal(a, base) and i + 1 < len(cells) and not np.array_equal(cells[i + 1], base) and all(distance(e, palette(base)) < 2 for e in strips(cells[i + 1])):
            images['water__2'] = cells[i + 1]
            break
    return images, [{k: v for k, v in b.items() if k != 'tiles'} for b in blocks], report
