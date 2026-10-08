"""Measurable art heuristics. Index arrays use crystal.kit's 255 transparency."""
from __future__ import annotations
import math
import numpy as np
from PIL import Image

T = 255
LIMITS = {'baby': (38, 44, .22, .38), 'teen': (44, 52, .28, .48),
          'adult': (52, 56, .38, .62)}
SEAM_THRESHOLD = 16


def result(level, failed, value, **details):
    return {'status': ('FAIL' if level == 'error' else 'WARN') if failed else 'PASS',
            'level': level, 'value': value, **details}


def components(mask, diagonal=False):
    """Connected components (optionally 8-way), as lists of (x, y)."""
    seen = np.zeros(mask.shape, bool)
    h, w = mask.shape
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        stack, comp = [(int(x), int(y))], []
        seen[y, x] = True
        while stack:
            xx, yy = stack.pop()
            comp.append((xx, yy))
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), *(((-1, -1), (-1, 1), (1, -1), (1, 1)) if diagonal else ())):
                nx, ny = xx+dx, yy+dy
                if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((nx, ny))
        yield comp


def face_risk(ix, scale=1):
    """Small enclosed dark components; seed lattices are repetitive texture."""
    h, w = ix.shape
    radius = round(2*scale)
    dot_area = math.ceil(4*scale*scale)
    dot_span = math.ceil(scale)
    pair_span = round(8*scale)
    blobs, slits = [], []
    for comp in components((ix == 0) | (ix == 1), diagonal=True):
        xs, ys = zip(*comp)
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        if not (0 < x0 <= x1 < w-1 and 0 < y0 <= y1 < h-1):
            continue
        pixels = set(comp)
        rim = {(x+dx, y+dy) for x, y in comp for dx in range(-1, 2)
               for dy in range(-1, 2)} - pixels
        if not all(0 <= x < w and 0 <= y < h and ix[y, x] in (2, 3) for x, y in rim):
            continue
        halo = {(x+dx, y+dy) for x, y in comp for dx in range(-radius, radius+1)
                for dy in range(-radius, radius+1)} - pixels
        isolated = all(0 <= x < w and 0 <= y < h and ix[y, x] in (2, 3) for x, y in halo)
        if 1 <= len(comp) <= dot_area and x1-x0 <= dot_span and y1-y0 <= dot_span:
            glint = any(ix[y, x] == 3 for xx, yy in comp
                        for y in range(max(0, yy-radius), min(h, yy+radius+1))
                        for x in range(max(0, xx-radius), min(w, xx+radius+1)))
            blobs.append({'x': x0, 'y': y0, 'pixels': len(comp), 'glint': glint,
                          'isolated': isolated, 'core': pixels, 'halo': halo})
        if isolated and y0 == y1 and 3 <= len(comp) <= pair_span:
            slits.append({'kind': 'mouth_slit', 'x': x0, 'y': y0, 'pixels': len(comp)})
    flags = []
    # Three or more nearby compact dots form seed/flower texture, not an eye.
    def textured(b):
        return sum(abs(b['x']-c['x']) <= pair_span and abs(b['y']-c['y']) <= pair_span
                   for c in blobs) >= 3
    for b in blobs:
        if b['glint'] and b['isolated'] and not textured(b):
            flags.append({'kind': 'eye_glint', **{k: b[k] for k in ('x', 'y', 'pixels', 'glint')}})
    for n, b in enumerate(blobs):
        for c in blobs[n+1:]:
            pair_halo = (b['halo'] | c['halo']) - b['core'] - c['core']
            clear = all(0 <= x < w and 0 <= y < h and ix[y, x] in (2, 3) for x, y in pair_halo)
            if clear and 2 <= abs(b['x']-c['x']) <= pair_span and abs(b['y']-c['y']) <= dot_span and not textured(b) and not textured(c):
                flags.append({'kind': 'eye_pair', 'coordinates': [[b['x'], b['y']], [c['x'], c['y']]]})
    flags.extend(slits)
    return result('error', bool(flags), len(flags), coordinates=flags)


def geometry(ix):
    ys, xs = np.nonzero(ix != T)
    if not len(xs):
        return {'extent': 0, 'fill': 0., 'edges': 0, 'bottom': -1, 'com_x': 0.}
    h, w = ix.shape
    return {'extent': int(max(xs.max()-xs.min()+1, ys.max()-ys.min()+1)),
            'fill': float(len(xs)/ix.size),
            'edges': int(xs.min() == 0)+int(xs.max() == w-1)+int(ys.min() == 0)+int(ys.max() == h-1),
            'bottom': int(ys.max()), 'com_x': float(xs.mean())}


def size_class(ix, cls):
    g = geometry(ix)
    lo, hi, flo, fhi = LIMITS[cls]
    fail = not (lo <= g['extent'] <= hi and flo <= g['fill'] <= fhi)
    near = g['extent'] <= lo+1 or g['extent'] >= hi-1 or min(abs(g['fill']-flo), abs(g['fill']-fhi)) <= .02
    warn = near or (cls == 'adult' and g['edges'] < 2)
    return result('error' if fail else 'warn', fail or warn,
                  f"{cls}: {g['extent']}px/{g['fill']:.1%}/{g['edges']} edges", **g)


def grounding(ix, notes=''):
    bottom = geometry(ix)['bottom']
    return result('warn', bottom not in (54, 55) and 'float' not in notes.lower(), bottom)


def centre_of_mass(ix):
    x = geometry(ix)['com_x']
    return result('warn', not 28 <= x <= 34, round(x, 2))


def back_fill(ix):
    fill = geometry(ix)['fill']
    return result('warn', not .60 <= fill <= .85, f'{fill:.1%}', fill=fill)


def stage_progression(previous, current):
    a, b = geometry(previous), geometry(current)
    return result('error', b['fill'] < a['fill'] or b['extent'] < a['extent'],
                  f"{a['extent']}->{b['extent']}px/{a['fill']:.1%}->{b['fill']:.1%}")


def anim_signature(frames, intro, boxes):
    base = frames[0]
    diff = np.zeros(base.shape, bool)
    for f, _ in intro:
        diff |= frames[f] != base
    allow = np.zeros(base.shape, bool)
    for x0, y0, x1, y1 in boxes or []:
        allow[y0:y1, x0:x1] = True
    changed = int(diff.sum())
    share = changed / max(1, int((base != T).sum()))
    inside = float((diff & allow).sum()/changed) if changed else 0.
    return result('warn', share < .02 or inside < .80 or boxes is None,
                  f'{share:.1%} changed/{inside:.1%} inside', changed=changed,
                  change_share=share, inside_share=inside, boxes_missing=boxes is None)


def silhouette_noise(ix, scale=1):
    op = ix != T
    p = np.pad(op, 1)
    n = p[:-2, 1:-1].astype(int)+p[2:, 1:-1]+p[1:-1, :-2]+p[1:-1, 2:]
    # 1px tips have exactly one cardinal neighbour; holes have all eight.
    protrusions = int((op & (n == 1)).sum())
    holes = ~op
    for dy in range(3):
        for dx in range(3):
            if (dx, dy) != (1, 1):
                holes &= p[dy:dy+op.shape[0], dx:dx+op.shape[1]]
    count = int(holes.sum())
    return result('warn', protrusions > round(12*scale) or count > round(4*scale*scale),
                  f'{protrusions} tips/{count} holes', protrusions=protrusions, holes=count)


def hashes(rgba):
    # Composite over the actual light battle-box background, preserving size.
    rgb = rgba[..., :3].astype(float)
    alpha = rgba[..., 3:4]/255.
    gray = ((rgb*alpha + np.array([224, 232, 208])*(1-alpha)) @ np.array([.299, .587, .114]))
    im = Image.fromarray(gray.astype(np.uint8))
    a = np.asarray(im.resize((8, 8), Image.Resampling.BOX)).astype(float)
    d = np.asarray(im.resize((9, 8), Image.Resampling.BOX)).astype(float)
    return a > a.mean(), d[:, 1:] > d[:, :-1]


def hash_distance(a, b):
    return tuple(int(np.count_nonzero(x != y)) for x, y in zip(a, b))


def clone_risk(own, others, line, own_id):
    pairs = []
    nearest = (64, 64)
    for id_, other_line, h in others:
        if id_ == own_id or other_line == line:
            continue
        ah, dh = hash_distance(own, h)
        if ah+dh < sum(nearest):
            nearest = (ah, dh)
        if ah < 5 and dh < 7:
            pairs.append({'id': id_, 'aHash': ah, 'dHash': dh})
    return result('warn', bool(pairs), f'{len(pairs)} pairs; nearest a/d={nearest[0]}/{nearest[1]}', pairs=pairs)


def edge_difference(a, b):
    """Max of mean RGB difference over black and mean alpha difference."""
    def composite(edge):
        return edge[..., :3].astype(float) * (edge[..., 3:4]/255.)
    return max(float(np.abs(composite(a)-composite(b)).mean()),
               float(np.abs(a[..., 3].astype(float)-b[..., 3].astype(float)).mean()))


def seam(tile):
    x = edge_difference(tile[:, 0], tile[:, -1])
    y = edge_difference(tile[0], tile[-1])
    return result('warn', max(x, y) > SEAM_THRESHOLD, f'x={x:.2f}/y={y:.2f}', horizontal=x, vertical=y)


def grid_artifact(before, after):
    """Warn when a 4x4 repeat gains strong tile-size Fourier components.

    Absolute (not variance-normalized) RGB/alpha energy avoids flagging a
    quieter texture merely because its remaining detail is more periodic.
    Include diagonal components to catch repeated dots as well as borders.
    """
    def energy(tile):
        block = np.tile(tile, (4, 4, 1)).astype(float)
        signal = np.concatenate((block[..., :3] * block[..., 3:4]/255.,
                                 block[..., 3:4]), axis=-1)
        spectrum = np.fft.fft2(signal, axes=(0, 1))/(block.shape[0]*block.shape[1])
        return float(sum(np.abs(spectrum[y, x])**2 for y in (0, 4, -4)
                         for x in (0, 4, -4) if x or y).mean())
    old, new = energy(before), energy(after)
    return result('warn', new > old*1.75 and new-old > 4,
                  f'16px energy={old:.2f}->{new:.2f}', before_energy=old,
                  after_energy=new, ratio=new/old if old else None,
                  delta=new-old)


def autotile_edges(variants):
    """Compare every reciprocal N/E/S/W neighbour, including corner bits.

    variants maps masks 0..15 to lists of RGBA frames (fallbacks resolved).
    """
    bad, worst = [], 0.
    for a, frames in variants.items():
        for b, other in variants.items():
            for axis, bit, reciprocal in (('x', 2, 8), ('y', 4, 1)):
                if not (a & bit and b & reciprocal):
                    continue
                for f in range(max(len(frames), len(other))):
                    left, right = frames[f % len(frames)], other[f % len(other)]
                    diff = edge_difference(left[:, -1] if axis == 'x' else left[-1],
                                           right[:, 0] if axis == 'x' else right[0])
                    worst = max(worst, diff)
                    if diff > 0:
                        bad.append({'masks': [a, b], 'axis': axis, 'frame': f, 'difference': round(diff, 3)})
    return result('error' if worst > SEAM_THRESHOLD else 'warn', bool(bad),
                  f'{len(bad)} mismatches/max={worst:.2f}', mismatches=bad,
                  max_difference=worst)
