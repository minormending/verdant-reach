"""Join authored index tiles at their outermost pixel, without repainting motifs.

A connected boundary must not depend on perpendicular mask bits. Equalities
include corners and missing-mask base fallbacks. Joined edges take their
colours from the fully connected mask,
subject to the four-colour quadrant budget. No interior pixel or
palette colour is created. This is generator plumbing, not a PNG repair pass.
"""

from collections import Counter, defaultdict

import numpy as np

from artkit.sheets import group_stems


def join_edges(images: dict[str, np.ndarray], repeat=(), palette=None, edge_colours=None) -> dict[str, np.ndarray]:
    """Return copies with reciprocal connected edges and ground wraps equal.

    `repeat` explicitly lists repeatable ground keys. Open autotile sides are
    retained, except for corner pixels also belonging to a connected side.
    `palette` supplies RGBA colours for nearest-hue matching when a quadrant
    is full. `edge_colours` can restrict a key to an authored join/trim ramp.
    """
    out = {stem: a.copy() for stem, a in images.items()}
    for key, group in group_stems(sorted(images)).items():
        if not group['mask'] and key not in repeat:
            continue
        parent = {}

        def root(p):
            parent.setdefault(p, p)
            if parent[p] != p:
                parent[p] = root(parent[p])
            return parent[p]

        def equal(a, b):
            parent[root(b)] = root(a)

        for frame, base in sorted(group['base'].items()):
            variants = {m: group['mask'].get(m, {}).get(frame, base) for m in range(16)}
            if group['mask']:
                for axis, bit, opposite in (('x', 2, 8), ('y', 4, 1)):
                    joined = [(stem, bit) for m, stem in variants.items() if m & bit]
                    joined += [(stem, opposite) for m, stem in variants.items() if m & opposite]
                    for p in range(16):
                        coords = [(stem, p, 15 if side == bit else 0) if axis == 'x'
                                  else (stem, 15 if side == bit else 0, p)
                                  for stem, side in joined]
                        for coord in coords[1:]:
                            equal(coords[0], coord)
                # Base tiles that are authored copies of a mask retain that
                # identity. Missing masks already constrain base above.
                for stem in dict.fromkeys(variants.values()):
                    if stem != base and np.array_equal(images[stem], images[base]):
                        for y, x in perimeter():
                            equal((base, y, x), (stem, y, x))
            if key in repeat:
                for stem in [base] + [f[frame] for f in group['alt'].values() if frame in f]:
                    for p in range(16):
                        equal((stem, p, 0), (stem, p, 15))
                        equal((stem, 0, p), (stem, 15, p))

        classes = defaultdict(list)
        for coord in parent:
            classes[root(coord)].append(coord)
        donors = set(group['mask'].get(15, {}).values())
        _colour_edges(images, out, list(classes.values()), donors, palette,
                      (edge_colours or {}).get(key))
    return out


def _colour_edges(images, out, classes, donors, rgba, allowed):
    """Author shared borders subject to the four-colour quadrant budget.

    Interior colours and unconstrained open-side pixels are fixed. Border
    colours are assigned together, rather than folded separately per tile:
    a per-tile palette fold would break the very edge equality being authored.
    """
    affected = set(coord for coords in classes for coord in coords)
    quads = { (stem, y // 8, x // 8) for stem, y, x in affected }
    fixed = {}
    for stem, qy, qx in quads:
        fixed[stem, qy, qx] = {int(images[stem][y, x])
                              for y in range(qy * 8, qy * 8 + 8)
                              for x in range(qx * 8, qx * 8 + 8)
                              if (stem, y, x) not in affected}
    colours = sorted({int(c) for stem, _, _ in quads for c in images[stem].flat})
    if allowed is not None:
        colours = [c for c in colours if c in allowed]
    counts = [Counter(int(images[s][y, x]) for s, y, x in coords) for coords in classes]
    preferences = []
    for i, coords in enumerate(classes):
        votes = Counter(int(images[s][y, x]) for s, y, x in coords if s in donors) or counts[i]
        preferences.append([c for c, n in votes.items() if n == max(votes.values())])

    def distance(colour, i):
        # Fully joined canopy shade / water / wall caps keep their own hue,
        # instead of acquiring ground specks from the masks' open corners.
        if rgba is None:
            return min(abs(colour - c) for c in preferences[i])
        return min(float(np.square(rgba[colour, :3].astype(float) - rgba[c, :3]).sum())
                   for c in preferences[i])
    owners = [{(s, y // 8, x // 8) for s, y, x in coords} for coords in classes]
    assigned = {}

    def solve(pending):
        if not pending:
            return True
        choices = []
        for i in pending:
            domain = [c for c in colours if all(c in fixed[q] or len(fixed[q]) < 4 for q in owners[i])]
            if not domain:
                return False
            choices.append((len(domain), -len(owners[i]), i, domain))
        _, _, i, domain = min(choices)
        domain.sort(key=lambda c: (distance(c, i), -counts[i][c], sum(c not in fixed[q] for q in owners[i]), c))
        for colour in domain:
            added = [q for q in owners[i] if colour not in fixed[q]]
            for q in added:
                fixed[q].add(colour)
            assigned[i] = colour
            if solve([j for j in pending if j != i]):
                return True
            for q in added:
                fixed[q].remove(colour)
        return False

    if not solve(list(range(len(classes)))):
        raise ValueError("connected edges cannot fit four colours without changing tile interiors")
    for i, coords in enumerate(classes):
        for stem, y, x in coords:
            out[stem][y, x] = assigned[i]


def perimeter():
    return [(y, x) for y in range(16) for x in range(16)
            if y in (0, 15) or x in (0, 15)]
