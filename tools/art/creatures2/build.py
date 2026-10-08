"""Discover and build original v2 lines in isolated processes. Each line is discovered without a second registry."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def modules():
    return sorted(p for p in HERE.glob('*.py') if p.stem not in {'kit2', 'build'}
                  and not p.stem.startswith(('_', 'test_')))


def main(argv):
    mods = modules()
    if '--list' in argv:
        for p in mods:
            print(p.stem)
        return 0
    only = [a for a in argv if not a.startswith('-')]
    if set(only)-{p.stem for p in mods}:
        print('unknown lines:', sorted(set(only)-{p.stem for p in mods})); return 2
    failed = []
    for p in mods:
        if only and p.stem not in only:
            continue
        code = f"import runpy,sys; sys.path.insert(0,{str(HERE)!r}); ns=runpy.run_path({str(p)!r}); b=ns.get('build'); sys.exit(3) if not callable(b) else b()"
        rc = subprocess.run([sys.executable, '-c', code], cwd=ROOT).returncode
        if rc not in (0, 3):
            failed.append(p.stem)
    subprocess.run(['node','tools/art/index.mjs'], cwd=ROOT, check=True)
    sys.path.insert(0, str(HERE.parent/'qa'))
    import qa
    roster = qa.load_roster()
    ids = [i for i,v in roster.items() if v['js'].get('format') == 'verdant.species/2']
    result = int(bool(failed) or bool(ids and qa.main(ids)))
    if '--sheet' in argv and ids:
        from _review import review_sheet
        pilot = ['oak_acorn','oak_sapling','great_oak','chili_blossom',
                 'green_chili','red_chili','lily_seedpod','lily_pad','giant_water_lily']
        ordered = [i for i in pilot if i in ids]+sorted(set(ids)-set(pilot))
        path = HERE.parent/'review/creatures2_review.png'
        review_sheet(ordered,path)
        print(f'Sheet: {path}')
    return result


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
