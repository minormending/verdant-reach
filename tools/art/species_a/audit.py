"""Audit: colours per sprite, orphan pixels (no same-colour 4-neighbour,
outline excluded), size class fill (bbox of the front)."""
import sys, importlib
import numpy as np
sys.path.insert(0, '.')
import build
for name in build.LINE_NAMES:
    mod = importlib.import_module(name)
    for id_ in mod.IDS:
        imgs = mod.make(id_)
        out = []
        for k in ('front', 'back', 'icon', 'icon__2'):
            a = np.asarray(imgs[k]).astype(int)
            h, w = a.shape[:2]
            key = a[..., 0] * 65536 + a[..., 1] * 256 + a[..., 2]
            op = a[..., 3] > 0
            black = key == (24 * 65536 + 24 * 256 + 24)
            orph = []
            for y in range(h):
                for x in range(w):
                    if not op[y, x] or black[y, x]:
                        continue
                    same = False
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and op[yy, xx] and key[yy, xx] == key[y, x]:
                            same = True
                    if not same:
                        orph.append((x, y))
            ys, xs = np.nonzero(op)
            out.append(f"{k}:{len(orph)}" + (f"{orph[:6]}" if orph and k in ('front','back') else ''))
            if k == 'front':
                out.append(f"bbox {xs.max()-xs.min()+1}x{ys.max()-ys.min()+1} bottom={ys.max()}")
        print(id_.ljust(20), ' '.join(out))
