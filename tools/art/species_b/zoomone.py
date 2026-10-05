"""Render one species' frames at 8x for close pixel review (not part of the build)."""
import importlib, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
import build
line, sid = sys.argv[1], sys.argv[2]
keys = sys.argv[3:] or ["front"]
mod = importlib.import_module(line)
ims = build.render(sid, mod.SPRITES[sid])
k = 8
tiles = [ims[x] for x in keys if x in ims]
W = sum(t.width * k + 8 for t in tiles)
H = max(t.height for t in tiles) * k
s = Image.new("RGBA", (W, H), (248, 248, 248, 255))
x = 0
for t in tiles:
    s.alpha_composite(t.resize((t.width * k, t.height * k), Image.NEAREST), (x, H - t.height * k))
    x += t.width * k + 8
s.save(Path(__file__).parent / "review" / "zoom.png")
