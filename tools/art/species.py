"""REFERENCE ONLY (Round 1 photo auto-trace). Not run by build_all.py.

It would replace the hand-pixelled species bundles, so it refuses to write
unless given --overwrite-hand-art. The `traced` art pack
(tools/art/import_traced.py) reuses its back-view tracer instead.

Species sprites -> public/art/species/<id>/ (front, back, icon, icon__2)

Sources: the photo -> GBC sprite pipeline in
  /Users/kevinramdath/projects/research/creature-sprites
(photos in photos/game/<line>/, traced sprites in out/game/<line>/<stage>.png).
Run that pipeline first:
  .venv/bin/python tool/spritify.py photos/game/* --out out/game

front.png   the pipeline's 56x56 sprite (faces left), copied as RGBA.
back.png    48x48 back view, derived here (plants are nearly symmetric):
            the same oriented cut-out, mirrored, cropped to its upper ~2/3
            (seen from behind and slightly above, cut off by the bottom of
            the frame like a GBC back sprite), traced again at 4x with the
            pipeline's tracer, highlights knocked back and the palette's
            colours shaded ~12% darker, then re-outlined (no outline along
            the cut edge).
icon.png    16x16 party icon: the cut-out traced at 8x and reduced with the
icon__2.png pipeline's feature-aware reduction (features keep priority over
            averaging), outlined; frame 2 bobs one pixel.

Must run with the creature-sprites venv (needs cv2 + the pipeline modules):
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

import gbc

CS = Path("/Users/kevinramdath/projects/research/creature-sprites")
sys.path.insert(0, str(CS / "tool"))
import hires  # noqa: E402
import spritify as S  # noqa: E402

S.set_out(CS / "out" / "game")
PHOTOS = CS / "photos" / "game"
OUT = CS / "out" / "game"

# line folder -> [(stage, species id)]
LINES = {
    "oak": [("baby", "oak_acorn"), ("teen", "oak_sapling"), ("adult", "great_oak")],
    "chili": [("baby", "chili_blossom"), ("teen", "green_chili"), ("adult", "red_chili")],
    "water_lily": [("baby", "lily_seedpod"), ("teen", "lily_pad"), ("adult", "giant_water_lily")],
    "dandelion": [("baby", "dandelion_bud"), ("teen", "dandelion"), ("adult", "dandelion_clock")],
    "bramble": [("baby", "bramble_blossom"), ("teen", "bramble_berry"), ("adult", "blackberry")],
    "sunflower": [("baby", "sunflower_seedling"), ("teen", "sunflower_bud"), ("adult", "sunflower")],
    "pumpkin": [("baby", "pumpkin_blossom"), ("teen", "green_pumpkin"), ("adult", "pumpkin")],
    "fern": [("baby", "fern_fiddlehead"), ("teen", "unfurling_fern"), ("adult", "ostrich_fern")],
    "venus_flytrap": [("baby", "flytrap_seedling"), ("teen", "young_flytrap"), ("adult", "venus_flytrap")],
    "sundew": [("baby", "sundew_rosette"), ("adult", "sundew")],
    "maple": [("baby", "maple_samara"), ("teen", "maple_sapling"), ("adult", "sugar_maple")],
    "nettle": [("baby", "nettle_sprout"), ("adult", "stinging_nettle")],
    "moonflower": [("baby", "moonflower_seed"), ("teen", "moonflower_vine"), ("adult", "moonflower")],
}

BACK = 48
BACK_KEEP = 0.68      # upper share of the subject kept in the back view
BACK_ZOOM = 1.3       # back sprites sit closer to the camera (Crystal backs fill the frame)
SHADE = 0.86          # colour multiplier for the back view's two mid tones


def stage_cfg(line: str, stage: str) -> tuple[dict, Image.Image]:
    """The same per-stage settings and oriented cut-out spritify.process uses."""
    d = PHOTOS / line
    sources = json.loads((d / "sources.json").read_text()) if (d / "sources.json").exists() else {}
    overrides = json.loads((d / "sprite.json").read_text()) if (d / "sprite.json").exists() else {}
    species_cfg = {k: v for k, v in overrides.items() if k not in S.STAGES}
    cfg = {**species_cfg, **overrides.get(stage, {})}
    name = cfg.get("photo") or next((p.name for p in sorted(d.glob(f"{stage}.*"))), None)
    src = sources.get(name, {})
    rgba = S.cutout(d / name)
    if "crop" in cfg:
        rgba = rgba.crop(tuple(cfg["crop"]))
    if cfg.get("rotate"):
        rgba = rgba.rotate(cfg["rotate"], Image.BICUBIC, expand=True)
    if cfg.get("flip", src.get("facing", "left") == "right"):
        rgba = ImageOps.mirror(rgba)
    return cfg, rgba


def front_palette(front: Image.Image) -> list[tuple]:
    """The sprite's 4 colours (black, dark, light, white) from the indexed PNG."""
    assert front.mode == "P", front.mode
    p = front.getpalette()[:12]
    return [tuple(p[i:i + 3]) for i in range(0, 12, 3)]


def outline(tones: np.ndarray, skip_bottom=False) -> np.ndarray:
    body = (tones >= 0) & (tones != hires.LINE)
    ring = ndimage.binary_dilation(body, hires.CROSS) & (tones < 0)
    if skip_bottom:
        ring[-1, :] = False
    out = tones.copy()
    out[ring] = 0
    out[out == hires.LINE] = 0
    return out


def to_rgba(tones: np.ndarray, pal: list[tuple]) -> Image.Image:
    h, w = tones.shape
    a = np.zeros((h, w, 4), np.uint8)
    for t in range(4):
        a[tones == t] = tuple(pal[t]) + (255,)
    return Image.fromarray(a, "RGBA")


def make_back(rgba: Image.Image, cfg: dict, size_class: int, pal: list[tuple]) -> Image.Image:
    m = ImageOps.mirror(rgba)
    m = m.crop(m.getbbox())
    fw, fh = m.size
    keep = int(round(fh * BACK_KEEP))
    crop = m.crop((0, 0, fw, keep))
    crop = crop.crop(crop.getbbox())
    # scale: the full subject's long side would be size_class * zoom (in 48/56 units)
    full_long = size_class * BACK / S.CANVAS * BACK_ZOOM
    long_px = full_long * max(crop.size) / max(fw, fh)
    size = int(min(BACK, round(long_px) + 2))
    k = 4
    rgb, alpha = hires.fit(crop, size, BACK, k, cfg.get("fit", "long"))
    tones, dark, light, mask, lum = hires.trace(rgb, alpha, k, cfg)
    t = hires.reduce(tones, dark, light, mask, lum, k, cfg)
    # the subject sits 1px above the bottom (fit leaves room for an outline): drop it onto the edge
    t = np.vstack([np.full((1, BACK), -1, t.dtype), t[:-1]])
    # light comes from in front: knock highlights back, except along the top rim
    # cropping can leave islands (a leaf whose stem was cut away): keep the
    # main body and any piece big enough to read
    lab, n = ndimage.label(t >= 0, np.ones((3, 3)))
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        keep = 1 + np.nonzero(sizes >= max(25, 0.15 * sizes.max()))[0]
        t[(lab > 0) & ~np.isin(lab, keep)] = -1
    body = t >= 0
    above = np.vstack([np.zeros((1, BACK), bool), body[:-1]])
    if (t == 3).sum() > 0.25 * body.sum():
        # a mostly-white subject (white petals, a seed clock): keep it white and
        # shade only the far (right) rim, or it would turn into the light tone
        right = np.zeros_like(body)
        right[:, :-3] = body[:, 3:]
        t[(t == 3) & ~right] = 2
    else:
        t[(t == 3) & above] = 2
    t = outline(t, skip_bottom=True)
    dpal = [pal[0]] + [S.gbc(np.array(c) * SHADE) for c in pal[1:3]] + [pal[3]]
    return to_rgba(t, dpal)


def make_icon(rgba: Image.Image, cfg: dict, pal: list[tuple]) -> tuple[Image.Image, Image.Image]:
    k = 8
    rgb, alpha = hires.fit(rgba, 15, 16, k, "area")   # area: thin subjects stay legible
    t = None
    # wispy subjects can lose their whole body to the thin-part split at 16px:
    # fall back to no split, then to a lower coverage bar
    for extra in ({"thin": k + 1}, {"thin": 0}, {"thin": 0, "coverage": 0.2}):
        icfg = {**cfg, "max_dark": 2, "max_light": 2, **extra}
        tones, dark, light, mask, lum = hires.trace(rgb, alpha, k, icfg)
        try:
            t = outline(hires.reduce(tones, dark, light, mask, lum, k, icfg))
        except IndexError:
            continue
        if (t > 0).sum() >= 12:
            break
    if (t == 0).sum() > 0.6 * (t >= 0).sum():
        # wiry subjects turn to ink at 16px: trace without thin lines or dark features
        icfg = {**cfg, "max_dark": 0, "max_light": 1, "thin": 0, "coverage": 0.3}
        tones, dark, light, mask, lum = hires.trace(rgb, alpha, k, icfg)
        t = outline(hires.reduce(tones, dark, light, mask, lum, k, icfg))
    # frame 1 sits one pixel up; frame 2 (the bob) is the plain fit
    up = np.vstack([t[1:], np.full((1, 16), -1, t.dtype)])
    return to_rgba(up, pal), to_rgba(t, pal)


def build(only: set[str] | None = None) -> list[tuple[str, dict]]:
    made = []
    for line, stages in LINES.items():
        for stage, sid in stages:
            if only and sid not in only and line not in only:
                continue
            src = OUT / line / f"{stage}.png"
            if not src.exists():
                print(f"MISSING {sid}: {src}")
                continue
            front = Image.open(src)
            pal = front_palette(front)
            cfg, rgba = stage_cfg(line, stage)
            f = front.convert("RGBA")
            assert f.size == (56, 56)
            back = make_back(rgba, cfg, S.STAGES[stage], pal)
            i1, i2 = make_icon(rgba, cfg, pal)
            from artkit import emit
            emit.species(sid, {"front": f, "back": back, "icon": i1, "icon__2": i2}, tool="tools/art/species.py")
            made.append((sid, dict(front=f, back=back, icon=i1, icon2=i2)))
            print(f"{sid:20s} <- {line}/{stage}")
    return made


def review(made=None) -> None:
    from PIL import ImageDraw
    rows = []
    for line, stages in LINES.items():
        for stage, sid in stages:
            from artkit.resolve import Resolver
            ims = [Resolver().image(f"assets/species/{sid}/{k}.png") for k in ("front", "back", "icon", "icon__2")]
            if all(a is not None for a in ims):
                rows.append((sid, [Image.fromarray(a, "RGBA") for a in ims]))
    z = 3
    cw = 56 * z + 48 * z + 16 * z * 2 + 40
    ch = 56 * z + 16
    cols = 3
    sheet = Image.new("RGBA", (cols * cw + 10, ((len(rows) + cols - 1) // cols) * ch + 10), (248, 248, 248, 255))
    d = ImageDraw.Draw(sheet)
    for i, (sid, ims) in enumerate(rows):
        x = 10 + (i % cols) * cw
        y = 10 + (i // cols) * ch
        d.text((x, y), sid, fill=(40, 40, 40, 255))
        xx = x
        for im in ims:
            sheet.alpha_composite(gbc.zoom(im, z), (xx, y + 12))
            xx += im.width * z + 8
    sheet.save(gbc.REVIEW / "species.png")
    # fronts only, side by side (the quality pass)
    fr = [(sid, ims[0]) for sid, ims in rows]
    gbc.grid_sheet(fr, 9, 3).save(gbc.REVIEW / "species_fronts.png")


if __name__ == "__main__":
    if "--overwrite-hand-art" not in sys.argv:
        sys.exit("species.py is a reference tool: it would overwrite the hand-pixelled species. "
                 "Pass --overwrite-hand-art if you really mean it.")
    only = set(a for a in sys.argv[1:] if not a.startswith("--")) or None
    build(only)
    review()
