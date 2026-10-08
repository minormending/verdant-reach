"""Reuse the existing local software Canvas replay, with ephemeral recordings."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'limezu'))
import replay_ui
root=Path(sys.argv[1]).resolve()

def guard(path):
    if Path(path).resolve().parent != root:
        raise ValueError('replay output escaped the temporary directory')

# Reuse the existing replay without writing a licensed command recording to the repo.
class ReplayRoot:
    def __truediv__(self, relative):
        return root/Path(relative).name
replay_ui.HERE=ReplayRoot()
replay_ui.guarded_review=guard
replay_ui.render('r5b_battle')
