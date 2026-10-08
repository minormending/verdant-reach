"""Portrait Generator cards, derived exclusively from walking-character layers.

Only filenames, coordinates and code are public. All pixels stay in the pack.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from limezu.ui import slice_insets

HERE = Path(__file__).parent
GENERATOR = 'ui:48x48/Portrait_Generator_48x48/'


def options():
    return json.loads((HERE / 'mapping/portraits.json').read_text())


def resolve_layers(character, available):
    """Resolve real names against an inventory; never silently drop a layer.

    `available` is relative to Portrait_Generator_48x48, allowing synthetic CI
    inventories without the owner's licensed files.
    """
    def match(pattern, value):
        m = re.fullmatch(pattern, value or '')
        if not m:
            raise ValueError(f'unsupported character layer: {value}')
        return m.groups()
    body, = match(r'Body_(\d+)\.png', character['body'])
    eyes, = match(r'Eyes_(\d+)\.png', character['eyes'])
    style, variant = match(r'Hairstyle_(\d+)_(\d+)\.png', character['hair'])
    layers = [f'Skins_48x48/PG_Skin_48x48_{int(body)}.png',
              f'Eyes_48x48/PG_Eyes_48x48_{int(eyes):02}.png',
              f'Hairstyles_48x48/PG_Hairstyle_{int(style):02}_48x48_{int(variant)}.png']
    if character.get('accessory'):
        number, name, variant = match(r'Accessory_(\d+)_(.+)_(\d+)\.png', character['accessory'])
        if int(number) not in options()['no_accessory']:
            stem = f'Accessories_48x48/PG_Accessory_{int(number):02}_{name}_48x48_'
            candidate = stem + str(int(variant)) + '.png'
            layers.append(candidate if candidate in available else stem + '1.png')
    for layer in layers:
        if layer not in available:
            raise ValueError(f'unresolved portrait layer: {layer}')
    return layers


def nine_slice(image, insets, size):
    from PIL import Image
    l, t, r, b = insets
    w, h = image.size
    sx, sy = [0, l, w-r, w], [0, t, h-b, h]
    dx, dy = [0, l, size-r, size], [0, t, size-b, size]
    out = Image.new('RGBA', (size, size))
    for row in range(3):
        for col in range(3):
            crop = image.crop((sx[col], sy[row], sx[col+1], sy[row+1]))
            if crop.width == 0 or crop.height == 0:
                continue
            out.paste(crop.resize((dx[col+1]-dx[col], dy[row+1]-dy[row]), Image.Resampling.NEAREST), (dx[col], dy[row]))
    return out


def head(sources, layers, pick, config):
    from PIL import Image
    w, h = config['cell']
    x, y = pick
    out = Image.new('RGBA', (w, h))
    for layer in layers:
        sheet = sources.sheet(GENERATOR + layer)
        if list(sheet.size) != config['sheet']:
            raise ValueError(f'portrait sheet geometry changed: {layer}: {sheet.size}')
        out.alpha_composite(sheet.crop((x*w, y*h, (x+1)*w, (y+1)*h)))
    if not out.getbbox():
        raise ValueError(f'empty portrait cell: {layers}, {pick}')
    return out


def cards(heads, slot, size, config):
    """Shared bounds keep the authored blink aligned; head pixels stay 1:1.

    Bottom anchoring preserves the chin and facial features. Only overflow of
    hair/hat may be clipped by the small card; no scaling is ever applied.
    """
    from PIL import Image
    insets = slice_insets(slot)
    bounds = [im.getbbox() for im in heads]
    box = (min(b[0] for b in bounds), min(b[1] for b in bounds),
           max(b[2] for b in bounds), max(b[3] for b in bounds))
    w, h = box[2]-box[0], box[3]-box[1]
    y = size - insets[3] - config['chin_gap'] - h
    out = Image.new('RGBA', (size*len(heads), size))
    for i, im in enumerate(heads):
        card = nine_slice(slot, insets, size)
        # Clip overflow at the top of the card, preserving every lower pixel.
        cropped = im.crop(box)
        if y < 0:
            cropped = cropped.crop((0, -y, w, h))
        x = (size-w)//2
        if x < 0:
            cropped = cropped.crop((-x, 0, -x+size, cropped.height))
        card.alpha_composite(cropped, (max(0, x), max(0, y)))
        out.paste(card, (size*i, 0))
    return out


def portrait_outputs(sources, json_bytes, png_bytes, to_rgba, credits, tool):
    config = options()
    characters = json.loads((HERE/'mapping/characters.json').read_text())['characters']
    root = sources.paths.get('ui')
    if root is None:
        raise ValueError('portraits need LIMEZU_UI or local.json ui root')
    folder = root / GENERATOR.partition(':')[2]
    available = {p.relative_to(folder).as_posix() for p in folder.rglob('*.png')}
    slot_spec = json.loads((HERE/'mapping/ui.json').read_text())['elements']['slot']
    slot = sources.crop(slot_spec['source'], slot_spec['box'])
    heads, layers = {}, {}
    for key, entry in sorted(characters.items()):
        try:
            layers[key] = resolve_layers(entry, available)
            heads[key] = [head(sources, layers[key], config[pick], config) for pick in ('neutral', 'blink')]
        except (OSError, ValueError) as e:
            raise ValueError(f'portrait {key}: {e}') from e
    base = json.loads((HERE.parents[2]/'public/art/sets/portraits/set.json').read_text())
    result = {}
    for set_id, entries, logical in [('portraits', base['images'], 'assets/trainers'),
                                      ('faces', {key: {'size': [48,48]} for key in characters}, 'assets/faces')]:
        images = {}
        for key, entry in sorted(entries.items()):
            character = 'player' if key == 'player_back' else key
            if character not in heads:
                raise ValueError(f'no character mapping for trainer: {key}')
            size = entry['size'][0]
            frames = [head(sources, layers[character], config['back'], config)] if key == 'player_back' else heads[character]
            image = cards(frames, slot, size, config)
            result[f'sets/{set_id}/{key}.png'] = png_bytes(to_rgba(image))
            images[key] = {'file': key+'.png', 'size': [size,size], 'frames': len(frames),
                           'source': {'kind': 'imported', 'tool': tool, 'layers': [GENERATOR+p for p in layers[character]]}}
        result[f'sets/{set_id}/set.json'] = json_bytes({'format': 'verdant.imageset/1', 'id': set_id,
            'logicalDir': logical, 'images': images, 'credits': credits})
    return result
