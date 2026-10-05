"""Shared kit for the Crystal-rule pilot (docs/CRYSTAL_PILOT.md).

Artists draw in PALETTE INDEXES, never in RGB: a frame is a 2-D uint8 array
of 0..3 (palette index) or T (=255, transparent). Then:

    from common import BLACK, WHITE, T, write_species, check, review_sheet
    write_species("sunflower", palette=[BLACK, "#a05818", "#f8c820", WHITE],
                  sport=[BLACK, "#..", "#..", WHITE],
                  front=[f0, f1, f2, f3], back=[b], icon=[i0, i1],
                  anim={"intro": [[0, 8], [1, 6], ..., [0, 1]], "idle": [[0, 40], [1, 6]]},
                  moving=[(x0, y0, x1, y1), ...],   # boxes (end-exclusive) where front frames may differ
                  notes="gesture + what was learned", tool="tools/art/pilot_crystal/sunflower.py")
    problems = check("sunflower")       # [(level, message)], level "error" | "warn"

`write_species` writes public/art/packs/crystal/species/<id>/ (PNGs +
species.json, deterministic via artkit.core) and records `moving` in
tools/art/pilot_crystal/moving.json so `check` (and build.py) can verify it.
It also runs `check` and prints the result. RGBA arrays are accepted too
(they must use exactly the palette colours).

Run this file directly to check every pilot species and write the review
sheet:  $PY tools/art/pilot_crystal/common.py [ids...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from artkit.core import ART, load_json, load_rgba, save_json, save_png  # noqa: E402

# ------------------------------------------------------------ Rule 1 ------
BLACK = "#181818"   # index 0: outline, deepest crevices, cast shadow (shared)
WHITE = "#f8f8f8"   # index 3: highlights only (shared)
T = 255             # transparent in index arrays

PACK = "crystal"
PACK_DIR = ART / "packs" / PACK
SPECIES_DIR = PACK_DIR / "species"
MOVING_JSON = HERE / "moving.json"
REVIEW_DIR = HERE.parent / "review"

LINES = {
    "oak": ["oak_acorn", "oak_sapling", "great_oak"],
    "flytrap": ["flytrap_seedling", "young_flytrap", "venus_flytrap"],
    "sunflower": ["sunflower_seedling", "sunflower_bud", "sunflower"],
}
ALL_IDS = [i for ids in LINES.values() for i in ids]
OWNERS = {"oak": "agent 2", "flytrap": "agent 3", "sunflower": "agent 4"}


def owner(id_: str) -> str:
    for line, ids in LINES.items():
        if id_ in ids:
            return f"{line} line, {OWNERS[line]}"
    return "?"

SIZES = {"front": 56, "back": 48, "icon": 16}
COUNTS = {"front": (1, 8), "back": (1, 1), "icon": (1, 2)}
WHITE_SHARE = (0.05, 0.20)
SMALL_WHITE_MIN = 0.03      # backs and icons: 3% (a 16px icon has ~10 white px at most)
MOVING_WARN = 0.85          # warn when this share of the body changes across the intro
INTRO_TICKS = (36, 72)


def rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def to_rgba(idx: np.ndarray, palette: list[str]) -> np.ndarray:
    """Index array (0..3, T) -> RGBA."""
    idx = np.asarray(idx)
    out = np.zeros(idx.shape + (4,), np.uint8)
    for i, h in enumerate(palette):
        m = idx == i
        out[m, :3] = rgb(h)
        out[m, 3] = 255
    return out


def to_index(a: np.ndarray, palette: list[str]) -> np.ndarray:
    """RGBA -> index array; raises on colours outside the palette or partial alpha."""
    a = np.asarray(a)
    if a.ndim == 2:
        return a.astype(np.uint8)
    out = np.full(a.shape[:2], T, np.uint8)
    op = a[..., 3] == 255
    if ((a[..., 3] > 0) & ~op).any():
        raise ValueError("partial alpha")
    for i, h in enumerate(palette):
        out[op & (a[..., :3] == rgb(h)).all(-1)] = i
    if (op & (out == T)).any():
        raise ValueError("colour not in palette")
    return out


def frame_names(group: str, n: int) -> list[str]:
    return [f"{group}.png" if k == 0 else f"{group}__{k + 1}.png" for k in range(n)]


# ------------------------------------------------------------- writer -----
def write_species(id_: str, *, palette: list[str], sport: list[str], front: list, back: list,
                  icon: list, anim: dict, notes: str, tool: str, credits: str | None = None,
                  moving: list[tuple[int, int, int, int]] | None = None, verbose: bool = True) -> list:
    """Write one pack species bundle and return check(id_)."""
    d = SPECIES_DIR / id_
    d.mkdir(parents=True, exist_ok=True)
    frames: dict[str, list[str]] = {}
    keep: set[str] = {"species.json"}
    for group, imgs in (("front", front), ("back", back), ("icon", icon)):
        names = frame_names(group, len(imgs))
        frames[group] = names
        for name, im in zip(names, imgs):
            idx = to_index(im, palette)
            save_png(d / name, to_rgba(idx, palette))
            keep.add(name)
    for f in d.glob("*.png"):
        if f.name not in keep:
            f.unlink()
    data = {
        "format": "verdant.species/1", "id": id_, "palette": palette, "sport": sport,
        "frames": frames, "anim": anim,
        "credits": credits or ("Original pixel art for Verdant Reach (Crystal-rule pilot), hand-pixelled in "
                               f"{tool}. Drawn under the pilot's palette and animation rules; no sprite from "
                               "any other game was copied, traced or imported."),
        "source": {"kind": "generated", "tool": tool},
        "notes": notes,
    }
    save_json(d / "species.json", data)
    mv = load_json(MOVING_JSON) if MOVING_JSON.exists() else {}
    mv[id_] = [list(map(int, b)) for b in (moving or [])]
    save_json(MOVING_JSON, dict(sorted(mv.items())))
    probs = check(id_)
    if verbose:
        report(id_, probs)
    return probs


# ------------------------------------------------------------ checker -----
def load_species(id_: str) -> tuple[dict, dict[str, list[np.ndarray]]]:
    d = SPECIES_DIR / id_
    js = load_json(d / "species.json")
    imgs = {g: [load_rgba(d / n) for n in js["frames"].get(g, [])] for g in SIZES}
    return js, imgs


def _orphans(idx: np.ndarray) -> int:
    """Non-outline opaque pixels with no 8-neighbour of the same index
    (diagonal runs are real lines; a lone dot is the orphan)."""
    h, w = idx.shape
    p = np.pad(idx, 1, constant_values=T)
    same = np.zeros((h, w), bool)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            if (dy, dx) != (1, 1):
                same |= p[dy:dy + h, dx:dx + w] == idx
    return int(((idx != T) & (idx != 0) & ~same).sum())


def check(id_: str) -> list[tuple[str, str]]:
    """Rule checks for one pack species. Returns [(level, message)]."""
    out: list[tuple[str, str]] = []
    err = lambda m: out.append(("error", m))  # noqa: E731
    warn = lambda m: out.append(("warn", m))  # noqa: E731
    if not (SPECIES_DIR / id_ / "species.json").exists():
        return [("error", "no bundle in the crystal pack")]
    js, imgs = load_species(id_)
    pal, sp = js.get("palette", []), js.get("sport", [])
    if len(pal) != 4 or len(sp) != 4:
        return [("error", "palette and sport must have 4 colours")]
    pal, sp = [c.lower() for c in pal], [c.lower() for c in sp]
    # Rule 1: shared black and white; sport swaps only 1-2
    if pal[0] != BLACK or pal[3] != WHITE:
        err(f"palette indexes 0/3 must be {BLACK}/{WHITE}, got {pal[0]}/{pal[3]}")
    if sp[0] != BLACK or sp[3] != WHITE:
        err(f"sport indexes 0/3 must be {BLACK}/{WHITE}, got {sp[0]}/{sp[3]}")
    if sp[1:3] == pal[1:3]:
        err("sport is identical to the palette")
    lum = lambda h: sum(c * k for c, k in zip(rgb(h), (0.299, 0.587, 0.114)))  # noqa: E731
    for name, p in (("palette", pal), ("sport", sp)):
        if not (lum(p[1]) < lum(p[2])):
            warn(f"{name}: index 1 should be darker than index 2")
    for k in ("credits", "source", "notes"):
        if not js.get(k):
            err(f"missing {k}")
    # images: sizes, counts, colours, alpha
    idxs: dict[str, list[np.ndarray]] = {}
    for g, size in SIZES.items():
        lo, hi = COUNTS[g]
        if not (lo <= len(imgs[g]) <= hi):
            err(f"frames.{g}: {len(imgs[g])} frames, want {lo}-{hi}")
        idxs[g] = []
        for k, a in enumerate(imgs[g]):
            if a.shape[:2] != (size, size):
                err(f"{g}[{k}] is {a.shape[1]}x{a.shape[0]}, want {size}x{size}")
            try:
                idxs[g].append(to_index(a, pal))
            except ValueError as e:
                err(f"{g}[{k}]: {e}")
    nf = len(idxs["front"])
    if not (3 <= nf <= 6):
        warn(f"{nf} front frames (the pilot asks for 3-6)")
    # white share
    for g in ("front", "back", "icon"):
        for k, ix in enumerate(idxs[g]):
            opq = (ix != T).sum()
            if not opq:
                err(f"{g}[{k}] is empty")
                continue
            share = (ix == 3).sum() / opq
            lo = WHITE_SHARE[0] if g == "front" else SMALL_WHITE_MIN   # backs/icons: small, so a looser floor
            if not (lo <= share <= WHITE_SHARE[1]):
                (err if g == "front" and k == 0 else warn)(
                    f"{g}[{k}] white share {share:.1%} (want {lo:.0%}-{WHITE_SHARE[1]:.0%})")
            if (ix == 0).sum() == 0:
                err(f"{g}[{k}] has no outline")
            orph = _orphans(ix)
            if orph > (6 if g != "icon" else 3):
                warn(f"{g}[{k}]: {orph} orphan pixel(s)")
    # registration: front frames identical outside the declared moving region
    moving = (load_json(MOVING_JSON).get(id_) if MOVING_JSON.exists() else None)
    if nf > 1:
        f0 = idxs["front"][0]
        diff = np.zeros(f0.shape, bool)
        for ix in idxs["front"][1:]:
            if ix.shape == f0.shape:
                diff |= ix != f0
        if moving is None:
            warn("no moving region declared (pass moving=[...] to write_species)")
        else:
            allow = np.zeros(f0.shape, bool)
            for x0, y0, x1, y1 in moving:
                allow[y0:y1, x0:x1] = True
            bad = diff & ~allow
            if bad.any():
                ys, xs = np.nonzero(bad)
                err(f"front frames differ outside the moving region at {int(bad.sum())} px "
                    f"(bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()})")
        if diff.sum() > MOVING_WARN * (f0 != T).sum():
            warn(f"{diff.sum()} of {(f0 != T).sum()} px change across the intro: is only one part moving?")
        if not diff.any():
            warn("all front frames are identical")
    # anim
    anim = js.get("anim")
    if not isinstance(anim, dict) or "intro" not in anim:
        err("missing anim.intro")
    else:
        for key, steps in anim.items():
            if key not in ("intro", "idle"):
                warn(f"anim.{key}: unknown key")
                continue
            ok = isinstance(steps, list) and steps and all(
                isinstance(s, list) and len(s) == 2 and all(isinstance(v, int) for v in s) for s in steps)
            if not ok:
                err(f"anim.{key} must be a list of [frame, ticks]")
                continue
            for f, t in steps:
                if not (0 <= f < nf):
                    err(f"anim.{key}: frame {f} does not exist")
                if t <= 0:
                    err(f"anim.{key}: ticks must be > 0")
            if key == "intro":
                if steps[-1][0] != 0:
                    err("anim.intro must end on frame 0")
                total = sum(t for _, t in steps)
                if not (INTRO_TICKS[0] <= total <= INTRO_TICKS[1]):
                    warn(f"anim.intro lasts {total} ticks (want {INTRO_TICKS[0]}-{INTRO_TICKS[1]})")
        used = {f for steps in anim.values() if isinstance(steps, list)
                for s in steps if isinstance(s, list) and s for f in s[:1]}
        unused = sorted(set(range(nf)) - used)
        if unused:
            warn(f"front frames {unused} are used by no anim")
    return out


def report(id_: str, probs: list[tuple[str, str]]) -> None:
    if not probs:
        print(f"  {id_}: ok")
    for lvl, m in probs:
        print(f"  {id_}: {lvl.upper()}: {m}")


def check_all(ids: list[str] | None = None) -> int:
    """Check every pilot species that exists in the pack; return the error count."""
    errors = 0
    for i in ids or ALL_IDS:
        if not (SPECIES_DIR / i / "species.json").exists():
            print(f"  {i}: (not drawn yet)")
            continue
        probs = check(i)
        report(i, probs)
        errors += sum(1 for lvl, _ in probs if lvl == "error")
    return errors


# ------------------------------------------------------- review sheet -----
BG = (200, 208, 192)
INK = (24, 24, 24)


def _up(a: np.ndarray, k: int) -> Image.Image:
    im = Image.fromarray(np.ascontiguousarray(a, np.uint8), "RGBA")
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def _base_frames(id_: str) -> dict[str, list[np.ndarray]]:
    d = ART / "species" / id_
    if not (d / "species.json").exists():
        blank = lambda n: np.zeros((n, n, 4), np.uint8)  # noqa: E731
        return {g: [blank(n)] for g, n in SIZES.items()}
    js = load_json(d / "species.json")
    return {g: [load_rgba(d / n) for n in js["frames"].get(g, [])] for g in SIZES}


def _sport(a: np.ndarray, pal: list[str], sp: list[str]) -> np.ndarray:
    return to_rgba(to_index(a, pal), sp)


def review_sheet(ids: list[str] | None = None, out: Path | str | None = None) -> Path:
    """One row per species: base front @4x | crystal front @4x | crystal sport @4x |
    the intro (each anim step's frame @2x, with ticks) | backs @2x | icons @4x."""
    ids = [i for i in (ids or ALL_IDS) if (SPECIES_DIR / i / "species.json").exists()]
    rows = []
    for i in ids:
        js, imgs = load_species(i)
        base = _base_frames(i)
        pal, sp = js["palette"], js["sport"]
        tiles: list[tuple[str, Image.Image]] = [
            ("base", _up(base["front"][0], 4)),
            ("crystal", _up(imgs["front"][0], 4)),
            ("sport", _up(_sport(imgs["front"][0], pal, sp), 4)),
        ]
        for f, t in js.get("anim", {}).get("intro", []):
            tiles.append((f"{f}:{t}t", _up(imgs["front"][f], 2)))
        idle = js.get("anim", {}).get("idle", [])
        for f, t in idle:
            tiles.append((f"idle {f}:{t}", _up(imgs["front"][f], 2)))
        tiles.append(("base back", _up(base["back"][0], 2)))
        tiles.append(("back", _up(imgs["back"][0], 2)))
        for k, a in enumerate(imgs["icon"]):
            tiles.append((f"icon{k + 1}", _up(a, 4)))
        rows.append((i, tiles))
    out = Path(out) if out else REVIEW_DIR / "crystal_pilot.png"
    if not rows:
        return out
    pad, lab = 6, 12
    width = max(sum(t.width + pad for _, t in tiles) for _, tiles in rows) + pad
    heights = [max(t.height for _, t in tiles) + lab + pad * 2 + lab for _, tiles in rows]
    sheet = Image.new("RGB", (width, sum(heights) + pad), BG)
    dr = ImageDraw.Draw(sheet)
    y = pad
    for (i, tiles), h in zip(rows, heights):
        dr.text((pad, y), f"{i}   [{owner(i)}]", fill=INK)
        x = pad
        for name, t in tiles:
            sheet.paste(t, (x, y + lab + lab), t)
            dr.text((x, y + lab), name, fill=INK)
            x += t.width + pad
        y += h
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def intro_strip(id_: str, k: int = 4) -> Path:
    """Every front frame of one species side by side @k (for close inspection)."""
    js, imgs = load_species(id_)
    fr = imgs["front"]
    sheet = Image.new("RGB", (len(fr) * (56 * k + 4) + 4, 56 * k + 8), BG)
    for n, a in enumerate(fr):
        im = _up(a, k)
        sheet.paste(im, (4 + n * (56 * k + 4), 4), im)
    out = REVIEW_DIR / f"crystal_{id_}_frames.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


if __name__ == "__main__":
    ids = sys.argv[1:] or None
    n = check_all(ids)
    print(f"review sheet: {review_sheet(ids)}")
    sys.exit(1 if n else 0)
