"""Render actual Chapter 6 map rows and bundle pixels into 160x144 views.

The current map modules use literal rows, legends, structures and NPCs. Parse
those only; fail loudly on unknown tiles/assets rather than inventing scenery.
The five review spots include the indoor Vents alongside all four outdoor maps.
"""
import re
from PIL import Image, ImageDraw
import kit
from artkit.resolve import Resolver


def pairs(s):
    return {a or b: c for a, b, c in re.findall(r'(?:"([^"]+)"|(\w+)):\s*"([^"]+)"', s)}


def render(name, centre):
    s = (kit.ROOT / "src/world/maps" / f"{name}.ts").read_text()
    shared = (kit.ROOT / "src/world/build.ts").read_text().split('export const LEGEND')[1].split('};')[0]
    legend = pairs(shared)
    if '...OUTDOOR' in s: legend['@'] = 'grass'
    overrides = s.split('legend:', 1)[1].split('tiles:', 1)[0]
    legend.update(pairs(overrides))
    rows = re.findall(r'"([^"]+)"', s.split('tiles: [', 1)[1].split('],', 1)[0])
    border = re.search(r'border: "([^"]+)"', s)[1]
    groups = pairs((kit.ROOT / "src/contracts/constants.ts").read_text().split('export const AUTOTILE')[1].split('};')[0])
    keys = [[legend[c] for c in r] for r in rows]
    w, h = max(map(len, rows)), len(rows)
    resolver = Resolver()
    def key_at(x, y):
        return keys[y][x] if 0 <= y < h and 0 <= x < len(keys[y]) else border
    def image(path):
        im = resolver.image(path)
        if im is None: raise ValueError(f"{name}: missing {path}")
        return im if isinstance(im, Image.Image) else Image.fromarray(im, "RGBA")
    out = Image.new("RGBA", (160, 144))
    left, top = centre[0]-4, centre[1]-4
    for yy in range(9):
        for xx in range(10):
            x, y = left+xx, top+yy
            key = key_at(x, y); stem = key
            group = groups.get(key)
            if group:
                mask = 0
                for bit, dx, dy in ((1,0,-1), (2,1,0), (4,0,1), (8,-1,0)):
                    nx, ny = x+dx, y+dy
                    if not (0 <= nx < w and 0 <= ny < h) or groups.get(key_at(nx, ny)) == group:
                        mask |= bit
                if resolver.image(f"assets/tiles/{key}@{mask}.png") is not None: stem = f"{key}@{mask}"
            else:
                alts = [n for n in (1,2,3) if resolver.image(f"assets/tiles/{key}~{n}.png") is not None]
                def choose(cx, cy, salt=0):
                    r = kit.hash2(cx, cy, salt) % (len(alts)+2)
                    return 0 if r < 2 else alts[r-2]
                n = choose(x, y)
                if n and n == choose(x-1, y): n = choose(x, y, 7)
                if n: stem = f"{key}~{n}"
            out.alpha_composite(image(f"assets/tiles/{stem}.png"), (xx*16, yy*16))
    for key, x, y in re.findall(r'key: "([^"]+)", x: (\d+), y: (\d+)', s.split('structures: [')[1].split('],')[0]):
        out.alpha_composite(image(f"assets/structures/{key}.png"), ((int(x)-left)*16, (int(y)-top)*16))
    for key, x, y in re.findall(r'sprite: "([^"]+)"[^\n]*?x: (\d+), y: (\d+)', s.split('npcs: [')[1].split('],')[0]):
        out.alpha_composite(image(f"assets/characters/{key}.png").crop((0,0,16,16)), ((int(x)-left)*16, (int(y)-top)*16))
    return out


def review_maps():
    spots = [('route_7', (14,17), 'Tidal crossing'),
             ('saltmarsh_harbour', (12,22), 'Harbour docks'),
             ('saltmarsh_harbour', (32,10), 'Lantern point'),
             ('route_8', (23,5), 'Sea and seagrass'),
             ('driftseed_isle', (23,9), 'Island town'),
             ('driftseed_vents', (14,9), 'Basalt and steam')]
    sheet = Image.new('RGBA', (1020,660), '#202830')
    d = ImageDraw.Draw(sheet)
    for i, (name, centre, label) in enumerate(spots):
        x, y = 10+(i%3)*340, 10+(i//3)*330
        d.text((x,y), f'{name}: {label}', fill='#f0e8c8')
        im = render(name, centre).resize((320,288), Image.Resampling.NEAREST)
        sheet.alpha_composite(im, (x,y+24))
    kit.save_png(kit.REVIEW / 'ch6_maps_lead.png', sheet)
