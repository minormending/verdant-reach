"""Shared kit for the Crystal-rule roster (docs/ROLLOUT.md, docs/CREATURES.md
§ Crystal rule). Promoted from the pilot's tools/art/pilot_crystal/common.py;
it writes the BASE species bundles, public/art/species/<id>/.

Artists draw in PALETTE INDEXES, never in RGB: a frame is a 2-D uint8 array
of 0..3 (palette index) or T (=255, transparent). One module per line,
tools/art/crystal/<line>.py, defining build() (tools/art/crystal/build.py
discovers and runs every such module):

    from kit import BLACK, WHITE, T, write_species, check, review_sheet, intro_strip
    TOOL = "tools/art/crystal/sunflower.py"
    def build():
        write_species("sunflower", palette=[BLACK, "#a05818", "#f8c820", WHITE],
                      sport=[BLACK, "#..", "#..", WHITE],
                      front=[f0, f1, f2, f3], back=[b], icon=[i0, i1],
                      anim={"intro": [[0, 8], [1, 6], ..., [0, 1]], "idle": [[0, 40], [1, 6]]},
                      moving=[(x0, y0, x1, y1), ...],  # boxes (end-exclusive) where front frames may differ
                      notes="pose, gesture, sport", tool=TOOL)

`write_species` writes the PNGs + species.json deterministically (artkit.core),
records `moving` in tools/art/crystal/moving/<id>.json for the checker, then
runs `check` and prints the result. RGBA arrays are accepted too (exactly the
palette colours). A bundle whose source is `edited` or `imported` is never
overwritten. Credits default to the reference photo from
artkit/species_refs.json plus the no-copying statement.

Exceptions (a third hue the identity needs, docs/CREATURES.md): index 3 is
the species' own light tone instead of the shared white. Only species listed
in EXCEPTIONS (approved by the Director) may do that.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/kit.py [ids...]   check (default: every crystal-drawn species)
                                          and write tools/art/review/crystal_review.png
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from artkit.bundles import ordered  # noqa: E402
from artkit.core import ART, LOCKED, load_json, load_rgba, save_json, save_png  # noqa: E402
from artkit.emit import species_credits  # noqa: E402

# ------------------------------------------------------------ the rule ----
BLACK = "#181818"   # index 0: full outline, deepest crevices, cast shadow (shared)
WHITE = "#f8f8f8"   # index 3: highlights only (shared)
T = 255             # transparent in index arrays

SPECIES_DIR = ART / "species"
CLASSIC_DIR = ART / "packs" / "classic" / "species"
MOVING_DIR = HERE / "moving"
REVIEW_DIR = HERE.parent / "review"
TOOL_PREFIX = "tools/art/crystal/"

# Approved exceptions: index 3 is a species light tone, not the shared white.
# The Director adds entries; the reason also goes in the bundle's `notes`.
EXCEPTIONS: dict[str, str] = {
    "sunflower_seedling": "sunflower line: the brown disc is the identity, so it keeps brown + green + yellow",
    "sunflower_bud": "sunflower line: the brown disc is the identity, so it keeps brown + green + yellow",
    "sunflower": "sunflower line: the brown disc is the identity, so it keeps brown + green + yellow",
}

# Approved white-part allowance: the plant's identity part is genuinely white
# (not highlight spam), so fronts may carry up to WHITE_PART_CAP white. The
# white mass still needs index-1/black shading inside it to read as form, and
# `notes` must say "WHITE: <reason>". The Director adds entries.
WHITE_PART_CAP = 0.35
WHITE_PARTS: dict[str, str] = {
    "white_clover": "the clover head is a ball of white florets",
    "moonflower": "the moonflower's trumpet is pure white",
    "dandelion_clock": "the seed clock is a white pappus sphere",
    "chili_blossom": "chili (Capsicum) flowers are white",
    "giant_water_lily": "Victoria water lilies open white on the first night",
    "ghostpipe_stalk": "ghost pipe (Monotropa uniflora) has no chlorophyll: the whole plant is waxy white",
    "ghostpipe_nodding": "ghost pipe (Monotropa uniflora) has no chlorophyll: the whole plant is waxy white",
    "ghost_pipe": "ghost pipe (Monotropa uniflora) has no chlorophyll: the whole plant is waxy white",
    "snowdrop_shoot": "the snowdrop's closed bud is white, and it pushes up out of white snow",
    "snowdrop": "the snowdrop (Galanthus nivalis) flower's tepals are pure white",
}

SIZES = {"front": 56, "back": 48, "icon": 16}
COUNTS = {"front": (1, 8), "back": (1, 1), "icon": (1, 2)}
WHITE_SHARE = (0.05, 0.20)  # fronts (only front[0] is an error; other frames warn)
SMALL_WHITE_MIN = 0.03      # backs and icons: 3% (a 16px icon has ~10 white px at most)
MOVING_WARN = 0.85          # warn when this share of the body changes across the intro
INTRO_TICKS = (36, 72)      # 0.6-1.2 s


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


def legacy(path: str):
    """Load an old generator module (e.g. legacy("species_a/px.py")) under a
    unique name. tools/art/species_a/ also has a `kit.py` and line modules
    named like ours (oak.py, sunflower.py ...), so never put an old folder at
    the FRONT of sys.path; use this, or sys.path.append."""
    import importlib.util
    p = HERE.parent / path
    name = "legacy_" + "_".join(p.with_suffix("").relative_to(HERE.parent).parts)
    if name in sys.modules:
        return sys.modules[name]
    if str(p.parent) not in sys.path:
        sys.path.append(str(p.parent))       # its own sibling imports (e.g. `from px import K`)
    spec = importlib.util.spec_from_file_location(name, p)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def is_exception(id_: str) -> bool:
    return id_ in EXCEPTIONS


def crystal_ids() -> list[str]:
    """Base species whose bundle was written by a tools/art/crystal/ module."""
    out = []
    for d in sorted(SPECIES_DIR.iterdir()):
        p = d / "species.json"
        if p.exists() and str((load_json(p).get("source") or {}).get("tool", "")).startswith(TOOL_PREFIX):
            out.append(d.name)
    return out


def line_of(id_: str) -> str:
    p = SPECIES_DIR / id_ / "species.json"
    tool = str((load_json(p).get("source") or {}).get("tool", "")) if p.exists() else ""
    return Path(tool).stem if tool.startswith(TOOL_PREFIX) else "-"


# ------------------------------------------------------------- writer -----
def write_species(id_: str, *, palette: list[str], sport: list[str], front: list, back: list,
                  icon: list, anim: dict, notes: str, tool: str, credits: str | None = None,
                  moving: list[tuple[int, int, int, int]] | None = None, verbose: bool = True) -> list:
    """Write one BASE species bundle and return check(id_)."""
    d = SPECIES_DIR / id_
    js = d / "species.json"
    if js.exists() and ((load_json(js).get("source") or {}).get("kind")) in LOCKED:
        print(f"  skip {id_}: its source is {load_json(js)['source']['kind']} (never overwritten)")
        return check(id_)
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
        "credits": credits or (species_credits(id_, tool) + " Drawn under the Crystal rule "
                               "(docs/CREATURES.md); no sprite from any other game was copied, traced or imported."),
        "source": {"kind": "generated", "tool": tool},
        "notes": notes,
    }
    save_json(js, ordered("species", data))
    save_json(MOVING_DIR / f"{id_}.json", [list(map(int, b)) for b in (moving or [])])
    probs = check(id_)
    if verbose:
        report(id_, probs)
    return probs


# ------------------------------------------------------------ checker -----
def load_species(id_: str, root: Path = SPECIES_DIR) -> tuple[dict, dict[str, list[np.ndarray]]]:
    d = root / id_
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


def outline_gaps(idx: np.ndarray) -> int:
    """Opaque non-black pixels that touch transparency (4-neighbour): breaks in
    the full black outline. The canvas edge doesn't count (a back cut off by
    the frame bottom is fine)."""
    op = idx != T
    p = np.pad(op, 1, constant_values=True)
    edge = ~p[:-2, 1:-1] | ~p[2:, 1:-1] | ~p[1:-1, :-2] | ~p[1:-1, 2:]
    return int((op & edge & (idx != 0)).sum())


def white_share(ix: np.ndarray) -> float:
    opq = (ix != T).sum()
    return float((ix == 3).sum() / opq) if opq else 0.0


def intro_ticks(js: dict) -> int:
    return sum(t for _, t in (js.get("anim") or {}).get("intro", []))


def check(id_: str) -> list[tuple[str, str]]:
    """Rule checks for one base species. Returns [(level, message)]."""
    out: list[tuple[str, str]] = []
    err = lambda m: out.append(("error", m))  # noqa: E731
    warn = lambda m: out.append(("warn", m))  # noqa: E731
    if not (SPECIES_DIR / id_ / "species.json").exists():
        return [("error", "no base bundle")]
    js, imgs = load_species(id_)
    exc = is_exception(id_)
    pal, sp = js.get("palette", []), js.get("sport", [])
    if len(pal) != 4 or len(sp) != 4:
        return [("error", "palette and sport must have 4 colours")]
    pal, sp = [c.lower() for c in pal], [c.lower() for c in sp]
    if not str((js.get("source") or {}).get("tool", "")).startswith(TOOL_PREFIX):
        warn("not written by a tools/art/crystal/ module")
    # shared black (and white, unless an approved exception); sport swaps only 1-2
    if pal[0] != BLACK or sp[0] != BLACK:
        err(f"palette/sport index 0 must be {BLACK}")
    if not exc:
        if pal[3] != WHITE or sp[3] != WHITE:
            err(f"palette/sport index 3 must be {WHITE} (or an approved exception in kit.EXCEPTIONS)")
    elif pal[3] == WHITE:
        warn("listed as an exception but index 3 is the shared white: drop it from EXCEPTIONS?")
    if sp[1:3] == pal[1:3]:
        err("sport is identical to the palette")
    lum = lambda h: sum(c * k for c, k in zip(rgb(h), (0.299, 0.587, 0.114)))  # noqa: E731
    for name, p in (("palette", pal), ("sport", sp)):
        if not (lum(p[1]) < lum(p[2])):
            warn(f"{name}: index 1 should be darker than index 2")
    for k in ("credits", "source", "notes"):
        if not js.get(k):
            err(f"missing {k}")
    if id_ in WHITE_PARTS and "WHITE:" not in str(js.get("notes", "")):
        err("a white-part species must give its reason in notes ('WHITE: <reason>')")
    if exc and "exception" not in str(js.get("notes", "")).lower():
        err("an exception must give its reason in notes (mention 'exception')")
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
        warn(f"{nf} front frames (the rule asks for 3-6)")
    for g in ("front", "back", "icon"):
        for k, ix in enumerate(idxs[g]):
            if not (ix != T).sum():
                err(f"{g}[{k}] is empty")
                continue
            share = white_share(ix)
            lo = WHITE_SHARE[0] if g == "front" else SMALL_WHITE_MIN
            hi = WHITE_PART_CAP if id_ in WHITE_PARTS else WHITE_SHARE[1]
            if not exc and not (lo <= share <= hi):
                (err if g == "front" and k == 0 else warn)(
                    f"{g}[{k}] white share {share:.1%} (want {lo:.0%}-{hi:.0%})")
            if (ix == 0).sum() == 0:
                err(f"{g}[{k}] has no outline")
            gaps = outline_gaps(ix)
            if gaps > (2 if g == "icon" else 4):
                warn(f"{g}[{k}]: {gaps} px of colour touch the transparent edge (the outline is full black)")
            orph = _orphans(ix)
            if orph > (6 if g != "icon" else 3):
                warn(f"{g}[{k}]: {orph} orphan pixel(s)")
    # registration: front frames identical outside the declared moving region
    mp = MOVING_DIR / f"{id_}.json"
    moving = load_json(mp) if mp.exists() else None
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


def check_all(ids: list[str] | None = None, quiet: bool = False) -> int:
    """Check species (default: every crystal-drawn one); return the error count."""
    errors = 0
    for i in ids or crystal_ids():
        probs = check(i)
        if not quiet:
            report(i, probs)
        errors += sum(1 for lvl, _ in probs if lvl == "error")
    return errors


# ------------------------------------------------------- review sheets ----
BG = (200, 208, 192)
INK = (24, 24, 24)


def _up(a: np.ndarray, k: int) -> Image.Image:
    im = Image.fromarray(np.ascontiguousarray(a, np.uint8), "RGBA")
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def classic_frames(id_: str) -> dict[str, list[np.ndarray]]:
    """The pre-Crystal art (the `classic` pack), blank if missing."""
    if not (CLASSIC_DIR / id_ / "species.json").exists():
        return {g: [np.zeros((n, n, 4), np.uint8)] for g, n in SIZES.items()}
    return load_species(id_, CLASSIC_DIR)[1]


def sport_of(a: np.ndarray, pal: list[str], sp: list[str]) -> np.ndarray:
    return to_rgba(to_index(a, pal), sp)


def _sheet(rows: list[tuple[str, list[tuple[str, Image.Image]]]], out: Path) -> Path:
    pad, lab = 6, 12
    width = max(sum(t.width + pad for _, t in tiles) for _, tiles in rows) + pad
    heights = [max(t.height for _, t in tiles) + lab + pad * 2 + lab for _, tiles in rows]
    sheet = Image.new("RGB", (width, sum(heights) + pad), BG)
    dr = ImageDraw.Draw(sheet)
    y = pad
    for (title, tiles), h in zip(rows, heights):
        dr.text((pad, y), title, fill=INK)
        x = pad
        for name, t in tiles:
            sheet.paste(t, (x, y + lab + lab), t)
            dr.text((x, y + lab), name, fill=INK)
            x += t.width + pad
        y += h
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def review_sheet(ids: list[str] | None = None, out: Path | str | None = None) -> Path:
    """One row per species: classic front @4x | new front @4x | sport @4x |
    the intro (each anim step's frame @2x, with ticks) | idle | classic back,
    back @2x | icons @4x. Default ids: every crystal-drawn species; default
    out: tools/art/review/crystal_review.png."""
    ids = [i for i in (ids or crystal_ids()) if (SPECIES_DIR / i / "species.json").exists()]
    rows = []
    for i in ids:
        js, imgs = load_species(i)
        old = classic_frames(i)
        pal, sp = js["palette"], js["sport"]
        anim = js.get("anim") or {}
        tiles: list[tuple[str, Image.Image]] = [
            ("classic", _up(old["front"][0], 4)),
            ("crystal", _up(imgs["front"][0], 4)),
            ("sport", _up(sport_of(imgs["front"][0], pal, sp), 4)),
        ]
        for f, t in anim.get("intro", []):
            tiles.append((f"{f}:{t}t", _up(imgs["front"][f], 2)))
        for f, t in anim.get("idle", []):
            tiles.append((f"idle {f}:{t}", _up(imgs["front"][f], 2)))
        tiles.append(("classic back", _up(old["back"][0], 2)))
        tiles.append(("back", _up(imgs["back"][0], 2)))
        for k, a in enumerate(imgs["icon"]):
            tiles.append((f"icon{k + 1}", _up(a, 4)))
        rows.append((f"{i}   [{line_of(i)} line]" + ("   EXCEPTION" if is_exception(i) else ""), tiles))
    out = Path(out) if out else REVIEW_DIR / "crystal_review.png"
    return _sheet(rows, out) if rows else out


def intro_strip(id_: str, k: int = 4) -> Path:
    """Every front frame of one species side by side @k:
    tools/art/review/crystal_<id>_frames.png."""
    _, imgs = load_species(id_)
    fr = imgs["front"]
    sheet = Image.new("RGB", (len(fr) * (56 * k + 4) + 4, 56 * k + 8), BG)
    for n, a in enumerate(fr):
        im = _up(a, k)
        sheet.paste(im, (4 + n * (56 * k + 4), 4), im)
    out = REVIEW_DIR / f"crystal_{id_}_frames.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def roster_ids() -> list[str]:
    """Every base species, in dex order (src/contracts/ids.ts)."""
    from artkit.core import contracts
    return [i for i in contracts()["species"] if (SPECIES_DIR / i / "species.json").exists()]


def roster_stats(ids: list[str] | None = None) -> list[dict]:
    """Per species: line, frames, intro/idle ticks, white shares, problems."""
    out = []
    for i in ids or roster_ids():
        js, imgs = load_species(i)
        pal = js["palette"]
        ix = {g: [to_index(a, pal) for a in imgs[g]] for g in SIZES}
        probs = check(i)
        fr = ix["front"]
        anim = js.get("anim") or {}
        out.append({
            "id": i, "line": line_of(i), "exception": is_exception(i), "frames": len(fr),
            "intro": intro_ticks(js), "idle": sum(t for _, t in anim.get("idle", [])),
            "w_front": white_share(fr[0]), "w_min": min(white_share(f) for f in fr),
            "w_max": max(white_share(f) for f in fr), "w_back": white_share(ix["back"][0]),
            "w_icon": min(white_share(a) for a in ix["icon"]),
            "fill": float((fr[0] != T).sum() / fr[0].size),
            "errors": sum(1 for lvl, _ in probs if lvl == "error"),
            "warns": sum(1 for lvl, _ in probs if lvl == "warn"),
        })
    return out


def roster_sheet(out: Path | str | None = None) -> Path:
    """The whole roster on one sheet (tools/art/review/roster_crystal.png):
    every front at 1x on the battle-box green, at 4x with its back and icons,
    a silhouette wall, then the white-share and intro-length tables."""
    ids = roster_ids()
    stats = {s["id"]: s for s in roster_stats(ids)}
    pad, cols = 8, 8
    sections: list[tuple[str, Image.Image]] = []
    # 1x: the size the player sees, 13 per row
    per = 13
    one = Image.new("RGB", (per * 60 + 4, ((len(ids) + per - 1) // per) * 60 + 4), (224, 232, 208))
    for n, i in enumerate(ids):
        a = load_species(i)[1]["front"][0]
        im = Image.fromarray(a, "RGBA")
        one.paste(im, (4 + (n % per) * 60, 4 + (n // per) * 60), im)
    sections.append(("1x fronts (dex order)", one))
    # 4x: front, sport front, back @2x, icons @2x, with labels
    cw, ch = 224 + 8, 224 + 104 + 18
    big = Image.new("RGB", (cols * cw + pad, ((len(ids) + cols - 1) // cols) * ch + pad), BG)
    dr = ImageDraw.Draw(big)
    for n, i in enumerate(ids):
        js, imgs = load_species(i)
        x, y = pad + (n % cols) * cw, pad + (n // cols) * ch
        s = stats[i]
        tag = "  [EXC]" if s["exception"] else "  [WHITE]" if i in WHITE_PARTS else ""
        dr.text((x, y), f"{i}{tag}", fill=INK)
        f = _up(imgs["front"][0], 4)
        big.paste(f, (x, y + 14), f)
        b = _up(imgs["back"][0], 2)
        big.paste(b, (x, y + 14 + 228), b)
        sp = _up(sport_of(imgs["front"][0], js["palette"], js["sport"]), 1)
        big.paste(sp, (x + 100, y + 14 + 228), sp)
        for k, a in enumerate(imgs["icon"]):
            ic = _up(a, 2)
            big.paste(ic, (x + 160 + k * 36, y + 14 + 228), ic)
        dr.text((x + 100, y + 14 + 290), f"{s['line']}  {s['frames']}f {s['intro']}t", fill=INK)
    sections.append(("4x fronts | back @2x, sport @1x, icons @2x", big))
    # silhouette wall @2x
    wall = Image.new("RGB", (per * 116 + 4, ((len(ids) + per - 1) // per) * 116 + 4), (248, 248, 248))
    for n, i in enumerate(ids):
        a = load_species(i)[1]["front"][0].copy()
        a[a[..., 3] > 0, :3] = 24
        im = _up(a, 2)
        wall.paste(im, (4 + (n % per) * 116, 4 + (n // per) * 116), im)
    sections.append(("silhouette wall @2x", wall))
    # tables
    rows = [("species", "line", "exc", "fr", "intro t", "idle t", "white f0", "min-max", "back", "icon", "fill",
             "err", "warn")]
    for i in ids:
        s = stats[i]
        rows.append((i, s["line"], "Y" if s["exception"] else "", str(s["frames"]), str(s["intro"]),
                     str(s["idle"] or ""), f"{s['w_front']:.1%}", f"{s['w_min']:.0%}-{s['w_max']:.0%}",
                     f"{s['w_back']:.1%}", f"{s['w_icon']:.1%}", f"{s['fill']:.0%}", str(s["errors"]),
                     str(s["warns"])))
    widths = [150, 80, 30, 26, 56, 50, 64, 64, 50, 50, 40, 30, 36]
    tab = Image.new("RGB", (sum(widths) + 2 * pad, len(rows) * 14 + 2 * pad), (240, 240, 232))
    dt = ImageDraw.Draw(tab)
    for r, row in enumerate(rows):
        x = pad
        s = stats.get(row[0])
        for c, (cell, w) in enumerate(zip(row, widths)):
            col = INK
            if s and not s["exception"]:
                hi = WHITE_PART_CAP if row[0] in WHITE_PARTS else WHITE_SHARE[1]
                if c == 6 and not (WHITE_SHARE[0] <= s["w_front"] <= hi):
                    col = (192, 32, 32)
                if c in (8, 9) and (s["w_back"] if c == 8 else s["w_icon"]) < SMALL_WHITE_MIN:
                    col = (192, 32, 32)
            if s and c == 4 and not (INTRO_TICKS[0] <= s["intro"] <= INTRO_TICKS[1]):
                col = (192, 32, 32)
            if s and c == 11 and s["errors"]:
                col = (192, 32, 32)
            dt.text((x, pad + r * 14), cell, fill=col)
            x += w
    sections.append(("white share and intro length (red = outside the rule; exceptions have no white)", tab))
    W = max(im.width for _, im in sections) + 2 * pad
    H = sum(im.height + 20 for _, im in sections) + pad
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    y = pad
    for title, im in sections:
        d.text((pad, y), title, fill=INK)
        sheet.paste(im, (pad, y + 14))
        y += im.height + 20
    out = Path(out) if out else REVIEW_DIR / "roster_crystal.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


if __name__ == "__main__":
    if "--roster" in sys.argv:
        print(f"roster sheet: {roster_sheet()}")
        sys.exit(0)
    ids = sys.argv[1:] or None
    n = check_all(ids)
    print(f"review sheet: {review_sheet(ids)}")
    sys.exit(1 if n else 0)
