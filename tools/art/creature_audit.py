"""Creature sprite audit (docs/CREATURES.md, "Hard checks").

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/creature_audit.py [ids...]

Prints one line per species with the measurable parts of the rubric:
colours, outline colour, bounding box, fill, bottom row, lean (how far the
top half sits toward the foe), mirror overlap (asymmetry), orphan pixels and
idle-frame motion. Anything outside the CREATURES.md targets is flagged "!".
Read-only: it never writes files.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SP = ROOT / "public" / "art" / "species"  # bundle default file names match the logical kinds
K = (24, 24, 24)

# stage -> (min bbox height, max bbox height, min fill %, max fill %)
TARGET = {"baby": (36, 46, 22, 38), "teen": (42, 52, 28, 48), "adult": (50, 56, 38, 62)}


def load(p):
    return np.asarray(Image.open(p).convert("RGBA")) if p.exists() else None


def orphans(a):
    """Body pixels with no same-colour 8-neighbour."""
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(int)
    key = (rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]
    key = np.where(a[..., 3] > 0, key, -1)
    n = 0
    for y in range(h):
        for x in range(w):
            v = key[y, x]
            if v < 0 or v == 0x181818:
                continue
            same = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if (dy or dx) and 0 <= y + dy < h and 0 <= x + dx < w and key[y + dy, x + dx] == v:
                        same = True
            n += not same
    return n


def audit(id_, stage=None):
    d = SP / id_
    f = load(d / "front.png")
    if f is None:
        return f"{id_:22s} MISSING front.png"
    m = f[..., 3] > 0
    cols = {tuple(p[:3]) for p in f.reshape(-1, 4) if p[3]}
    ys, xs = np.nonzero(m)
    bh, bw = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    fill = 100 * m.sum() / (56 * 56)
    mir = (m & m[:, ::-1]).sum() / max(1, (m | m[:, ::-1]).sum())
    top = m[: (ys.min() + ys.max()) // 2]
    tys, txs = np.nonzero(top)
    lean = 28 - txs.mean() if len(txs) else 0       # + = top half sits toward the foe (left)
    flags = []
    if len(cols) > 4:
        flags.append(f"!{len(cols)} colours")
    if K not in cols:
        flags.append("!no #181818")
    if ys.max() < 53:
        flags.append(f"!floats (bottom row {ys.max()})")
    if mir > 0.80:
        flags.append(f"!too symmetric ({mir:.2f})")
    orph = orphans(f)
    if orph:
        flags.append(f"!{orph} orphan px")
    if stage in TARGET:
        h0, h1, f0, f1 = TARGET[stage]
        if not (h0 <= max(bh, bw) <= h1):
            flags.append(f"!size {max(bh, bw)} not {h0}-{h1}")
        if not (f0 <= fill <= f1):
            flags.append(f"!fill {fill:.0f}% not {f0}-{f1}")
    idle = []
    for k in ("front__2", "front__3"):
        g = load(d / f"{k}.png")
        if g is None:
            continue
        gm = g[..., 3] > 0
        iou = (m & gm).sum() / max(1, (m | gm).sum())
        diff = (np.abs(g.astype(int) - f.astype(int)).sum(-1) > 0).sum()
        gcols = {tuple(p[:3]) for p in g.reshape(-1, 4) if p[3]}
        idle.append(f"{k[-1]}:iou{iou:.2f}/{diff}px")
        if gcols - cols:
            flags.append(f"!{k} new colours")
        if iou < 0.82:
            flags.append(f"!{k} silhouette moves too much")
        if iou > 0.995:
            flags.append(f"!{k} barely moves")
        gys = np.nonzero(gm)[0]
        if gys.max() != ys.max():
            flags.append(f"!{k} feet move")
    if not idle:
        flags.append("!no idle frames")
    for k, sz in (("back", 48), ("icon", 16), ("icon__2", 16)):
        a = load(d / f"{k}.png")
        if a is None:
            flags.append(f"!no {k}")
        elif a.shape[:2] != (sz, sz):
            flags.append(f"!{k} size {a.shape[:2]}")
        else:
            c2 = {tuple(p[:3]) for p in a.reshape(-1, 4) if p[3]}
            if len(c2) > 4:
                flags.append(f"!{k} {len(c2)} colours")
    return (f"{id_:22s} box {bw:2d}x{bh:2d} fill {fill:4.1f}% lean {lean:+5.1f} "
            f"mirror {mir:.2f} idle[{' '.join(idle) or '-'}]  {' '.join(flags)}")



def load_stages():
    """Stage class per species from src/data/species/<line>.json (docs/DATA.md)."""
    import json
    folder = ROOT / "src" / "data" / "species"
    if not folder.is_dir():
        return {}
    out = {}
    names = {3: ["baby", "teen", "adult"], 2: ["teen", "adult"], 1: ["adult"]}
    for f in sorted(folder.glob("*.json")):
        stages = [(s["id"], s["stage"]) for s in json.loads(f.read_text())["species"]]
        top = max(st for _, st in stages)
        out.update({i: names[top][st - 1] for i, st in stages if top in names})
    return out

if __name__ == "__main__":
    ids = sys.argv[1:] or sorted(p.name for p in SP.iterdir() if p.is_dir())
    st = load_stages()
    for i in ids:
        print(f"{(st.get(i) or '?'):5s} " + audit(i, st.get(i)))
