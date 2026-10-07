"""Tidal coast and volcanic island tiles, with authored connected edges.

Four-way interiors keep their texture: no seam-hiding border is stamped on
each tile. Planks repeat at four pixels, basalt joints at eight; water and
root contours cross joined boundaries. Only open mask sides receive rims.
"""
import numpy as np
import kit
from kit import line

TILESETS = {"coast": {}, "island": {}}


def put(set_id, key, a, palette):
    assert a.shape == (16, 16) and len(np.unique(a)) <= 4, key
    TILESETS[set_id][key] = kit.image(a, palette)


def salt(alt):
    a = np.full((16, 16), 1, np.uint8)
    # Quiet salt plates, offset in each alternate, never a framed tile.
    marks = [([(2, 3), (5, 3), (6, 4)], [(9, 11), (12, 11)]),
             ([(9, 2), (12, 2)], [(2, 10), (4, 10), (5, 11)]),
             ([(4, 6), (7, 6)], [(11, 13), (13, 13)]),
             ([(10, 5), (13, 5)], [(3, 12), (6, 12)])][alt]
    for pts in marks:
        line(a, pts, 0)
        line(a, [(x, y + 1) for x, y in pts], 2)
    return a


def seagrass(frame, mask):
    a = np.full((16, 16), 1, np.uint8)
    # Small continuous ripples, not a decorative box around the grass.
    a[3, :3] = 0; a[3, 13:] = 0
    a[11, 5:9] = 2
    for x, height, sway in ((3, 6, -1), (6, 9, 1), (10, 7, 1), (13, 10, -1)):
        tip = x + sway * (1 if frame == 1 else 2)
        line(a, [(x, 14), (x, 11), (tip, 14-height)], 3)
        line(a, [(x-1, 13), (x-1, 11), (tip-1, 15-height)], 2)
    # Shoreline foam appears only against a non-water neighbour.
    for bit, pts in ((1, [(2, 1), (13, 1)]), (2, [(14, 2), (14, 13)]),
                     (4, [(2, 14), (13, 14)]), (8, [(1, 2), (1, 13)])):
        if not mask & bit:
            line(a, pts, 0)
    return a


def roots(mask):
    a = np.full((16, 16), 2, np.uint8)
    a[3, :3] = 1; a[3, 13:] = 1
    # Prop roots arch out of the water, rather than looking like trunks.
    for pts in ([(0, 9), (3, 4), (5, 3), (8, 7), (10, 13)],
                [(6, 15), (7, 10), (10, 5), (12, 4), (15, 9)]):
        line(a, [(x+1, y+1) for x, y in pts], 3, 2)
        line(a, pts, 1, 2)
        line(a, [(x-1, y) for x, y in pts[1:-1]], 0)
    # Roots that continue into neighbours keep their arch phase. Open
    # ends terminate in the shallows, leaving a readable irregular edge.
    if not mask & 8: a[:, 0] = 2
    if not mask & 2: a[:, 15] = 2
    if not mask & 1: a[0, :] = 2
    if not mask & 4: a[15, :] = 2
    return a


def pier(mask):
    a = np.full((16, 16), 1, np.uint8)
    for y in range(0, 16, 4):
        a[y, :] = 2
        a[y+1, :] = 0
        a[y+3, :] = 2
    # Board end joints stagger every second course; no tile-size square.
    a[1:3, 7] = 2; a[9:11, 7] = 2
    a[5:7, 3] = 2; a[13:15, 3] = 2
    for bit in (1, 2, 4, 8):
        if mask & bit: continue
        if bit == 1: a[:2, :] = 3; a[2, :] = 0
        if bit == 4: a[14:, :] = 3; a[13, :] = 2
        if bit == 8: a[:, :2] = 3; a[:, 2] = 0
        if bit == 2: a[:, 14:] = 3; a[:, 13] = 2
    # Rope coils and posts at an exposed pier end.
    if not mask & 4:
        for x in (3, 11):
            a[11:14, x:x+2] = 2; a[11, x:x+2] = 0
        a[12, 5:11] = 0
    return a


def basalt(alt=0):
    a = np.full((16, 16), 2, np.uint8)
    # Interlocking small column sections continue across the tile edges.
    for y in range(-4, 20, 8):
        offset = 4 if (y // 8) % 2 else 0
        for x in range(-8+offset, 24, 8):
            line(a, [(x, y+3), (x+2, y), (x+5, y)], 1)
            line(a, [(x+5, y), (x+7, y+3), (x+5, y+6), (x+2, y+6), (x, y+3)], 3)
    # Occasional mineral grains are paired pixels, kept away from joins.
    x, y = ((3, 2), (11, 10), (4, 11), (10, 3))[alt]
    a[y, x:x+2] = 0
    return a


def volcanic(mask):
    a = basalt()
    # Exposed basalt columns: pale broken top, deep shade below.
    if not mask & 1:
        a[:2, :] = 2; a[2, :] = 1; a[3, 2:7] = 0
    if not mask & 8: a[:, :2] = 2; a[3:12, 2] = 1
    if not mask & 2: a[:, 14:] = 3
    if not mask & 4: a[13:, :] = 3; a[12, 4:12] = 1
    return a


def cactus(frame):
    a = np.full((16, 16), 0, np.uint8)
    # One low pear pad and a smaller branched cactus amid dry grasses.
    line(a, [(5, 13), (5, 7), (6, 6), (8, 6), (9, 7), (9, 10), (7, 12)], 3, 2)
    line(a, [(6, 11), (6, 7), (8, 7), (8, 10)], 1, 2)
    a[8:10, 7] = 2
    line(a, [(12, 13), (12, 8)], 2, 2)
    line(a, [(10, 9), (10, 11), (12, 11), (14, 10), (14, 8)], 1)
    for x, y in ((2, 6), (2, 14), (11, 4)):
        line(a, [(x, y), (x-1+frame, y-3)], 2)
        line(a, [(x, y), (x+2, y-2)], 1)
    return a


def pool():
    a = np.full((16, 16), 2, np.uint8)
    a[3:13, 3:13] = 1; a[2:14, 5:11] = 1; a[5:11, 2:14] = 1
    line(a, [(3, 9), (3, 5), (5, 3), (10, 3)], 0)
    line(a, [(12, 5), (13, 8), (11, 12), (6, 13)], 3)
    # Five-point shell/star glint; no dark eye-like centres.
    line(a, [(8, 6), (8, 10)], 0)
    line(a, [(6, 8), (10, 8)], 0)
    line(a, [(8, 8), (6, 11)], 0)
    return a


def steam(frame):
    a = np.full((16, 16), 2, np.uint8)
    line(a, [(2, 15), (6, 12), (9, 13), (13, 11)], 3, 2)
    for x, y in ((5, 3), (10, 7)):
        off = frame - 1
        line(a, [(x+off, y+3), (x+off-1, y+2), (x+off-1, y), (x+off+1, y-1)], 1, 2)
        line(a, [(x+off-1, y+1), (x+off-1, y), (x+off+1, y-1)], 0)
    return a



def driftwood():
    a = salt(2)
    # Diagonal bleached log, with a fork, broken end and weathered grain.
    line(a, [(2, 12), (4, 9), (11, 6), (14, 6), (13, 9), (5, 13), (2, 12)], 3, 2)
    line(a, [(3, 11), (10, 7), (13, 7)], 2, 3)
    line(a, [(3, 10), (9, 7), (13, 7)], 0)
    line(a, [(8, 8), (8, 5), (6, 3)], 3, 2)
    line(a, [(7, 8), (7, 5), (5, 3)], 0)
    line(a, [(5, 11), (8, 10), (11, 8)], 3)
    a[10, 3] = 3; a[12, 4] = 0
    return a


def beach_rock():
    a = np.full((16, 16), 1, np.uint8)
    # Three rounded pebbles of different sizes, resting on sand.
    from PIL import Image, ImageDraw
    im = Image.fromarray(a, "L"); d = ImageDraw.Draw(im)
    for box in ((2, 6, 9, 12), (9, 3, 14, 7), (10, 11, 13, 13)):
        d.ellipse(box, fill=3)
        x, y, xx, yy = box
        d.ellipse((x, y, xx-1, yy-1), fill=2)
        d.line([(x+1, y+1), (xx-2, y+1)], fill=0)
    return np.asarray(im).copy()


def fishing_net():
    a = np.full((16, 16), 1, np.uint8)
    # Upright posts, sagging rope and open diamond mesh; sand shows through.
    for x in (2, 13):
        a[2:14, x:x+2] = 3; a[2:12, x] = 2; a[2, x:x+2] = 0
    line(a, [(3, 4), (6, 5), (9, 5), (13, 4)], 3)
    for pts in ([(4, 5), (9, 10), (12, 7)], [(4, 9), (7, 12), (12, 7)],
                [(5, 6), (4, 7), (8, 11), (12, 9)], [(9, 5), (5, 9)],
                [(12, 5), (6, 11)]):
        line(a, pts, 2)
    line(a, [(4, 10), (6, 12), (9, 12), (12, 10)], 0)
    return a


def dry_grass(alt):
    a = np.full((16, 16), 1, np.uint8)
    tufts = [((3, 10), (11, 13)), ((5, 6), (12, 12)),
             ((3, 13), (10, 7)), ((6, 11), (13, 5))][alt]
    for x, y in tufts:
        line(a, [(x-2, y), (x+2, y)], 2)
        line(a, [(x, y), (x-2, y-3)], 2)
        line(a, [(x, y), (x, y-4)], 3)
        line(a, [(x+1, y), (x+3, y-3)], 0)
    return a


def shell_scatter(alt):
    a = salt(alt)
    for x, y in [((3, 5), (11, 11)), ((10, 4), (4, 12)),
                 ((5, 8), (12, 3)), ((3, 11), (11, 7))][alt]:
        line(a, [(x-1, y+2), (x+2, y+2)], 2)
        line(a, [(x-1, y+1), (x-1, y), (x, y-1), (x+1, y-1), (x+2, y+1)], 0)
        a[y+1, x:x+2] = 0; a[y, x] = 2
    return a


def vent_moss(frame):
    a = np.full((16, 16), 2, np.uint8)
    # Exposed basalt facets support low, irregular sulphurous moss cushions.
    line(a, [(0, 4), (3, 1), (8, 1), (10, 4), (8, 7)], 3)
    line(a, [(5, 15), (3, 12), (5, 9), (11, 9), (14, 12), (12, 15)], 3)
    for x, y, w in ((2, 6, 4), (9, 3, 4), (6, 10, 5), (1, 13, 3), (12, 13, 3)):
        line(a, [(x, y+1), (x+1, y-1), (x+w-2, y-1), (x+w, y+1)], 3, 3)
        line(a, [(x, y), (x+1, y-1), (x+w-2, y-1), (x+w-1, y)], 1, 2)
        line(a, [(x+1, y-2), (x+w-2, y-2)], 0)
        # A few shifting mineral highlights give a shimmer, not a walking plant.
        a[y, x+frame-1] = 0
    return a


def build():
    for alt in range(4):
        suffix = f"~{alt}" if alt else ""
        put("coast", "salt_flat"+suffix, salt(alt), kit.SALT)
        put("island", "basalt_floor"+suffix, basalt(alt), kit.BASALT)
        put("coast", "dry_grass"+suffix, dry_grass(alt), kit.DUNE)
        put("coast", "shell_scatter"+suffix, shell_scatter(alt), kit.SALT)
    put("coast", "tide_pool", pool(), kit.POOL)
    put("coast", "driftwood", driftwood(), kit.DRIFTWOOD)
    put("coast", "beach_rock", beach_rock(), kit.SHORE_ROCK)
    put("coast", "fishing_net", fishing_net(), kit.DRIFTWOOD)
    for frame in (1, 2):
        suffix = "__2" if frame == 2 else ""
        put("island", "cactus_scrub"+suffix, cactus(frame), kit.SCRUB)
        put("island", "vent_steam"+suffix, steam(frame), kit.STEAM)
        put("island", "vent_moss"+suffix, vent_moss(frame), kit.VENT_MOSS)
        put("coast", "seagrass_bed"+suffix, seagrass(frame, 15), kit.WATER)
        for mask in range(16):
            put("coast", f"seagrass_bed@{mask}"+suffix, seagrass(frame, mask), kit.WATER)
    for key, fn, ramp, tid in (("mangrove_roots", roots, kit.ROOTS, "coast"),
                                ("pier", pier, kit.WOOD, "coast"),
                                ("volcanic_rock", volcanic, kit.BASALT, "island")):
        put(tid, key, fn(15), ramp)
        for mask in range(16):
            put(tid, f"{key}@{mask}", fn(mask), ramp)
    # Keep original courses while harmonising connected silhouette corners.
    # Four colours total guarantee this never changes a tile's palette budget.
    from tile_edges import join_edges
    for tid, tiles in TILESETS.items():
        arrays = {k: np.asarray(im) for k, im in tiles.items()}
        colours = sorted({tuple(c) for a in arrays.values() for c in a.reshape(-1, 4)})
        rgba = np.array(colours, np.uint8)
        lookup = {c: i for i, c in enumerate(colours)}
        ix = {k: np.array([lookup[tuple(c)] for c in a.reshape(-1, 4)], np.int16).reshape(16, 16) for k, a in arrays.items()}
        joined = join_edges(ix, palette=rgba, texture=("pier", "volcanic_rock"))
        from PIL import Image
        TILESETS[tid] = {k: Image.fromarray(rgba[a], "RGBA") for k, a in joined.items()}
