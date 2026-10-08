"""Deterministic original creature authoring for verdant.species/2.

Colours are material ramps, not palette indexes. All geometry uses integer
pixels; lighting is quantised into solid clusters, never gradient dithering.
"""
from __future__ import annotations
import colorsys
import math
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from artkit import bundles as B
from artkit.core import ART, to_rgba
from artkit.palette import rgb_of

OUTLINE = '#2a2230'


def material_ramp(base: str, tones: int = 4) -> list[str]:
    """Dark-to-light HSV ramp: cooler saturated shadows, warm soft highlights."""
    if tones not in (3, 4):
        raise ValueError('material ramps have 3 or 4 tones')
    h, s, v = colorsys.rgb_to_hsv(*(c/255 for c in rgb_of(base)))
    def shift(target, amount):
        delta = ((target-h+.5) % 1)-.5
        return (h+delta*amount) % 1
    def colour(hue, sat, value):
        rgb = colorsys.hsv_to_rgb(hue, min(1, max(0, sat)), min(1, max(0, value)))
        return '#%02x%02x%02x' % tuple(round(c*255) for c in rgb)
    shadows = [colour(shift(2/3, .22), s+.14, v*.50)]
    if tones == 4:
        shadows.append(colour(shift(2/3, .10), s+.07, v*.74))
    return shadows+[base.lower(), colour(shift(1/8, .18), s-.12, v+(1-v)*.42)]


def canvas(size=64):
    return Image.new('RGBA', (size, size))


def polygon(image, points, colour):
    ImageDraw.Draw(image).polygon([(round(x), round(y)) for x, y in points], fill=colour)
    return image


def ellipse(image, box, colour):
    ImageDraw.Draw(image).ellipse(tuple(round(n) for n in box), fill=colour)
    return image


def stem(image, points, colour, width=3):
    ImageDraw.Draw(image).line([(round(x), round(y)) for x, y in points], fill=colour, width=width)
    return image


def leaf(image, base, tip, width, ramp):
    """Pointed leaf with a lit upper-left plane and darker lower-right plane."""
    bx, by = base; tx, ty = tip
    dx, dy = tx-bx, ty-by
    length = max(1, math.hypot(dx, dy))
    nx, ny = -dy/length*width/2, dx/length*width/2
    mid = ((bx+tx)/2, (by+ty)/2)
    polygon(image, [base, (mid[0]+nx, mid[1]+ny), tip, (mid[0]-nx, mid[1]-ny)], ramp[-2])
    mask = canvas(image.width)
    polygon(mask, [base, (mid[0]+nx, mid[1]+ny), tip, (mid[0]-nx, mid[1]-ny)], '#ffffff')
    lit = light_top_left(mask, ramp)
    image.alpha_composite(lit)
    return image


def petal(image, box, ramp):
    mask = canvas(image.width)
    ellipse(mask, box, '#ffffff')
    image.alpha_composite(light_top_left(mask, ramp))
    return image


def light_top_left(image, ramp):
    """Directional planes within the opaque mask (three/four solid tones)."""
    a = to_rgba(image).copy(); mask = a[..., 3] > 0
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return Image.fromarray(a)
    y, x = np.indices(mask.shape)
    depth = .55*(x-xs.min())/max(1, int(xs.max()-xs.min())) + .45*(y-ys.min())/max(1, int(ys.max()-ys.min()))
    indexes = np.clip(((1-depth)*len(ramp)).astype(int), 0, len(ramp)-1)
    a[mask, :3] = np.array([rgb_of(c) for c in ramp], np.uint8)[indexes[mask]]
    return Image.fromarray(a)


def outline_pass(image, colour=OUTLINE, *, sel_out=None):
    """One-pixel exterior cardinal outline; optional lighter ink on lit edges.

    sel_out maps lit fill colours to their material's dark outline shade.
    """
    a = to_rgba(image).copy(); op = a[..., 3] > 0
    source = a.copy(); h, w = op.shape
    lit = {tuple(rgb_of(k)): rgb_of(v) for k, v in (sel_out or {}).items()}
    for y in range(h):
        for x in range(w):
            if op[y, x]:
                continue
            neighbours = [(xx, yy) for xx, yy in ((x+1,y), (x,y+1), (x-1,y), (x,y-1))
                          if 0 <= xx < w and 0 <= yy < h and op[yy, xx]]
            if not neighbours:
                continue
            ink = rgb_of(colour)
            # Only north/west-facing exterior edges meet the incoming light.
            for xx, yy in neighbours:
                if xx >= x and yy >= y and tuple(source[yy, xx, :3]) in lit:
                    ink = lit[tuple(source[yy, xx, :3])]; break
            a[y, x] = (*ink, 255)
    return Image.fromarray(a)


def clustered_texture(image, colour, *, seed=0, count=6, cluster=2):
    """Sparse ≥2px connected patches, clipped to fills; never a gradient."""
    if cluster < 2:
        raise ValueError('texture clusters must be at least 2 pixels')
    a = to_rgba(image).copy(); op = a[..., 3] > 0
    coords = np.argwhere(op)
    rng = np.random.default_rng(seed)
    if len(coords):
        for n in rng.integers(0, len(coords), count):
            y, x = coords[n]
            # Require the whole horizontal cluster, avoiding clipped singleton noise.
            if x+cluster <= a.shape[1] and op[y, x:x+cluster].all():
                a[y, x:x+cluster, :3] = rgb_of(colour)
    return Image.fromarray(a)


def write_species2(id_: str, *, front, back, icon, anim, sport, notes='',
                   credits=None, source=None, tool='tools/art/creatures2/kit2.py',
                   palette=None, moving=None, root=ART) -> bool:
    """Write only valid 64/64/32 frames, respecting edited/imported ownership.

    `moving` boxes use exclusive x1/y1 and live in JSON, so packs carry them.
    An omitted palette is inferred from all frames. A sport is a material map.
    """
    old = B.read_meta('species', id_, root) or {}
    if (old.get('source') or {}).get('kind') in ('edited', 'imported'):
        return False
    from artkit.validate import check_species
    if not 1 <= len(front) <= 8 or len(back) != 1 or len(icon) != 2:
        raise ValueError('need 1–8 fronts, 1 back and 2 icons')
    arrays = {('front' if i == 0 else f'front__{i+1}'): to_rgba(f) for i, f in enumerate(front)}
    arrays.update(back=to_rgba(back[0]), icon=to_rgba(icon[0]), icon__2=to_rgba(icon[1]))
    colours = sorted({'#%02x%02x%02x' % tuple(c) for a in arrays.values() for c in np.unique(a[a[...,3]>0][:,:3], axis=0)})
    meta = {'format': 'verdant.species/2', 'size': {'front':64,'back':64,'icon':32},
            'palette': colours if palette is None else palette, 'sport': sport, 'anim': anim,
            'notes': notes, 'credits': credits or f'Original pixel art for Verdant Reach ({tool}).',
            'source': source or {'kind':'generated','tool':tool}, 'moving': moving or []}
    frames = {g: [k+'.png' for k in arrays if B.SPECIES_KINDS[k][0] == g] for g in ('front','back','icon')}
    # Validate in memory before any filesystem mutation.
    bundle = B.Bundle('species', id_, {**meta, 'frames':frames})
    bundle.file = lambda n: Path(__file__)
    bundle.image = lambda n: arrays[n[:-4]]
    problems = []
    check_species(bundle, problems)
    if problems:
        raise ValueError('; '.join(p[2] for p in problems))
    intro = (anim or {}).get('intro', [])
    if not intro or intro[-1][0] != 0 or not 36 <= sum(t for _, t in intro) <= 72:
        raise ValueError('intro must last 36–72 ticks and end on frame 0')
    for steps in (intro, (anim or {}).get('idle', [])):
        if any(not isinstance(f, int) or not 0 <= f < len(front) or not isinstance(t, int) or t <= 0 for f,t in steps):
            raise ValueError('invalid animation step')
    for box in moving or []:
        if len(box) != 4 or any(not isinstance(n, int) for n in box) or not (0 <= box[0] < box[2] <= 64 and 0 <= box[1] < box[3] <= 64):
            raise ValueError('invalid moving box')
    B.write_species(id_, arrays, meta, root)
    return True
