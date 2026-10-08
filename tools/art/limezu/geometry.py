"""Measure alpha geometry; public outputs contain tile coordinates only."""
from PIL import Image

BUILDINGS = set('house_large city_house harbour_house house_small lodge barn windmill market market_large herbarium greenhouse cedar_house conservatory'.split())
GARDEN = 'exteriors:Modern_Exteriors_16x16/ME_Theme_Sorter_16x16/17_Garden_16x16.png'
PORTICO_BOX = [136, 2432, 216, 2496]
# Unmapped catalogue entries remain original GBC scenery in the local pack.
UNMAPPED = {'bush': (2, 2), 'dock': (4, 2), 'fountain': (3, 3), 'haybale': (2, 1),
            'hedge_block': (2, 2), 'picnic_table': (3, 2), 'rock_large': (2, 2),
            'scarecrow': (2, 3), 'signpost': (1, 2), 'tree_palm': (3, 4), 'well': (2, 2)}


def trim(image):
    box = image.getchannel('A').getbbox()
    if box is None:
        raise ValueError('mapped prop contains no opaque pixels')
    return image.crop(box)


def measure(image):
    image = trim(image)
    w, h = (image.width + 15) // 16, (image.height + 15) // 16
    canvas = Image.new('RGBA', (w * 16, h * 16))
    canvas.paste(image, ((canvas.width - image.width) // 2, canvas.height - image.height))
    columns = [x for x in range(w) if canvas.getchannel('A').crop((x * 16, h * 16 - 6, (x + 1) * 16, h * 16)).getbbox()]
    fp = {'x': min(columns), 'y': h - 1, 'w': max(columns) - min(columns) + 1, 'h': 1}
    if columns != list(range(min(columns), max(columns) + 1)):
        fp['columns'] = columns
    return canvas, {'w': w, 'h': h, 'footprint': fp}


def door_column(image):
    """Prefer vertical dark jambs/door panels in the bottom eight pixels."""
    scores = []
    for col in range(image.width // 16):
        score = 0
        for x in range(col * 16, col * 16 + 16):
            run = 0
            for y in range(image.height - 8, image.height):
                r, g, b, a = image.getpixel((x, y))
                door = a > 0 and (max(r, g, b) < 115 or (r > g * 1.35 and r > b * 1.25))
                run = run + 1 if door else 0
                score += run * run
        scores.append(score)
    centre = image.width // 32
    return max(range(len(scores)), key=lambda x: (scores[x], -abs(x - centre))) if max(scores) else centre


def prop_image(key, entry, mapping, sources):
    if key == 'house_small':
        entry = mapping['harbour_house']
    if key == 'conservatory':
        greenhouse = trim(sources.crop(GARDEN, mapping['greenhouse']['box']))
        portico = trim(sources.crop(GARDEN, PORTICO_BOX))
        im = Image.new('RGBA', (greenhouse.width * 2, max(greenhouse.height, portico.height)))
        for x in (0, greenhouse.width):
            im.alpha_composite(greenhouse, (x, im.height - greenhouse.height))
        im.alpha_composite(portico, ((im.width - portico.width) // 2, im.height - portico.height))
        return im
    if entry['source'] is None:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from props_fallback import draw_prop
        return draw_prop(key, *UNMAPPED[key])
    return sources.crop(entry['source'], entry['box'])


def measured_props(mapping, sources):
    images, specs = {}, {}
    for key, entry in sorted(mapping.items()):
        if entry['source'] is None and key not in UNMAPPED and key not in {'conservatory', 'house_small'}:
            continue
        image, spec = measure(prop_image(key, entry, mapping, sources))
        if key in BUILDINGS:
            spec['door'] = {'x': image.width // 32 if key == 'conservatory' else door_column(image), 'y': spec['h'] - 1}
        images['prop_' + key], specs['prop_' + key] = image, spec
    return images, specs
