"""Modern UI crops and measured stretch regions. No licensed pixels in source."""
import json
from pathlib import Path

PANELS = {'panel_window', 'panel_inset', 'panel_plain', 'highlight', 'slot', 'button_round'}
BARS = {'bar_frame', 'bar_green', 'bar_yellow', 'bar_red', 'bar_blue'}


def slice_insets(image, horizontal=False):
    """Scan central axes inward to the inner fill; preserve asymmetric borders.

    Three-slice bars retain the full height, including their shading. The
    central pixel identifies the flat inner fill, never a transparent corner.
    """
    w, h = image.size
    cx, cy = (w - 1) // 2, (h - 1) // 2
    fill = image.getpixel((cx, cy))
    if fill[3] != 255:
        raise ValueError('slice centre must be opaque')
    def scan(points):
        # An outline may share the fill colour (the selected-row frame).
        # Ignore isolated matches before the contiguous centre region.
        return 1 + max((i for i, p in enumerate(points) if image.getpixel(p) != fill), default=-1)
    left = scan([(x, cy) for x in range(cx + 1)])
    right = scan([(x, cy) for x in range(w - 1, cx - 1, -1)])
    top = 0 if horizontal else scan([(cx, y) for y in range(cy + 1)])
    bottom = 0 if horizontal else scan([(cx, y) for y in range(h - 1, cy - 1, -1)])
    return [left, top, right, bottom]


def luminance(rgb):
    values = [v / 255 for v in rgb[:3]]
    return sum(v * weight for v, weight in zip(
        [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values],
        [.2126, .7152, .0722]))


def panel_colors(image, insets):
    """Darkest opaque border ink, with the required WCAG contrast fallback."""
    w, h = image.size
    l, t, r, b = insets
    fill = image.getpixel((w // 2, h // 2))
    border = [image.getpixel((x, y)) for y in range(h) for x in range(w)
              if (x < l or x >= w - r or y < t or y >= h - b) and image.getpixel((x, y))[3] == 255]
    ink = min(border or [fill], key=luminance)
    a, z = sorted([luminance(ink), luminance(fill)])
    if (z + .05) / (a + .05) < 4.5:
        ink = (58, 42, 30, 255)
    hex_ = lambda c: '#' + ''.join(f'{v:02x}' for v in c[:3])
    return {'ink': hex_(ink), 'fill': hex_(fill)}


def ui_outputs(sources, json_bytes, png_bytes, to_rgba, credits, tool):
    elements = json.loads((Path(__file__).parent / 'mapping/ui.json').read_text())['elements']
    images, result = {}, {}
    for key, spec in sorted(elements.items()):
        if spec['source'] is None:
            continue
        image = sources.crop(spec['source'], spec['box'])
        entry = {'file': key + '.png', 'size': list(image.size),
                 'source': {'kind': 'imported', 'from': spec['source'], 'box': spec['box'], 'tool': tool}}
        if key in PANELS or key in BARS:
            entry['insets'] = slice_insets(image, key in BARS)
            entry['slice'] = 'horizontal' if key in BARS else 'nine'
        if key.startswith('panel_'):
            entry.update(panel_colors(image, entry['insets']))
        images[key] = entry
        result[f'sets/ui_limezu/{key}.png'] = png_bytes(to_rgba(image))
    result['sets/ui_limezu/set.json'] = json_bytes({'format': 'verdant.imageset/1', 'id': 'ui_limezu',
        'logicalDir': 'assets/ui', 'images': images, 'credits': credits})
    return result
