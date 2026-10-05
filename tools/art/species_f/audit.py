"""Run tools/art/creature_audit.py on this folder's bundles (public/art/species).
  python tools/art/species_f/audit.py"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import creature_audit as ca  # noqa: E402

ca.SP = HERE.parents[2] / "public" / "art" / "species"
STAGE = {"apple_pip": "baby", "apple_sapling": "teen", "apple_tree": "adult",
         "paradise_shoot": "teen", "bird_of_paradise": "adult"}
for i in sys.argv[1:] or STAGE:
    print(f"{STAGE.get(i, '?'):5s} " + ca.audit(i, STAGE.get(i)))
