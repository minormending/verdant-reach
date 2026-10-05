"""Print a sprite's tone grid as ASCII (for planning hand edits). dump.py id [front|back]"""
import sys, importlib
import numpy as np
sys.path.insert(0, '.')
import build
id_, kind = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'front')
for name in build.LINE_NAMES:
    mod = importlib.import_module(name)
    if id_ in mod.IDS:
        im = mod.make(id_)[kind]
a = np.asarray(im)
cols = []
for p in a.reshape(-1, 4):
    if p[3] and tuple(p[:3]) not in cols:
        cols.append(tuple(p[:3]))
cols.sort(key=lambda c: sum(int(v) for v in c))
print('   ' + ''.join(str(i // 10) for i in range(a.shape[1])))
print('   ' + ''.join(str(i % 10) for i in range(a.shape[1])))
for y, row in enumerate(a):
    print(f'{y:2d} ' + ''.join('.' if p[3] == 0 else str(cols.index(tuple(p[:3]))) for p in row))
