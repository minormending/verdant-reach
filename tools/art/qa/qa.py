#!/usr/bin/env python3
"""Read-only art QA and changed-bundle contact sheets; see docs/ART_QA.md."""
from __future__ import annotations
import argparse
import io
import json
import re
import subprocess
import sys
import textwrap
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE.parent))
from crystal import kit
from checks import (result, face_risk, size_class, grounding, centre_of_mass,
                    back_fill, stage_progression, anim_signature, clone_risk,
                    silhouette_noise, hashes, seam, autotile_edges, grid_artifact)

GROUND_KEYS = {'grass', 'path', 'stone_path', 'dirt', 'sand', 'moss', 'ash',
               'tropical_grass', 'paving', 'salt_flat', 'basalt_floor',
               'dry_grass', 'shell_scatter', 'vent_moss', 'scree', 'frozen_shore',
               'desert_scrub', 'cracked_earth'}


def species_metadata():
    """Read the deliberately simple sp({ id/name/line/stage }) data header.

    Fail closed if an id cannot be resolved, rather than silently guessing its
    stage from the generator filename (edited/imported art has no such name).
    """
    source = (ROOT/'src/data/species.ts').read_text()
    matches = re.findall(r'sp\(\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"[^"]+"\s*,\s*line:\s*"([^"]+)"\s*,\s*stage:\s*([123])', source)
    meta = {id_: {'line': line, 'stage': int(stage)} for id_, line, stage in matches}
    for m in meta.values():
        length = max(v['stage'] for v in meta.values() if v['line'] == m['line'])
        m['class'] = 'adult' if m['stage'] == length else 'baby' if length == 3 and m['stage'] == 1 else 'teen'
    return meta


def load_roster():
    meta = species_metadata()
    roster = {}
    for id_ in kit.roster_ids():
        js, imgs = kit.load_species(id_)
        roster[id_] = {'js': js, 'imgs': imgs, 'meta': meta.get(id_)}
    return roster


def worst(results):
    rank = {'PASS': 0, 'WARN': 1, 'FAIL': 2}
    return max(results, key=lambda r: rank[r['status']])


def check_species(id_, roster, all_hashes):
    entry = roster[id_]
    js, imgs, meta = entry['js'], entry['imgs'], entry['meta']
    probs = kit.check(id_)
    levels = [level for level, _ in probs]
    checks = {'crystal': result('error' if 'error' in levels else 'warn', bool(probs),
                              f"{levels.count('error')} errors/{levels.count('warn')} warnings", messages=probs)}
    try:
        fronts = [kit.to_index(a, js['palette']) for a in imgs['front']]
        back = kit.to_index(imgs['back'][0], js['palette'])
    except (ValueError, IndexError) as e:
        checks['bundle'] = result('error', True, str(e))
        return checks
    faces = []
    for f, ix in enumerate(fronts):
        for hit in face_risk(ix)['coordinates']:
            faces.append({'frame': f, **hit})
    checks['face_risk'] = result('error', bool(faces), len(faces), coordinates=faces)
    if meta is None:
        checks['size_class'] = result('error', True, 'no species data stage/line')
    else:
        sizes = [dict(size_class(f, meta['class']), frame=n) for n, f in enumerate(fronts)]
        checks['size_class'] = dict(worst(sizes), frames=sizes)
    checks['grounding'] = worst([dict(grounding(f, js.get('notes', '')), frame=n) for n, f in enumerate(fronts)])
    checks['centre_of_mass'] = worst([dict(centre_of_mass(f), frame=n) for n, f in enumerate(fronts)])
    checks['back_fill'] = back_fill(back)
    moving_path = kit.MOVING_DIR/f'{id_}.json'
    boxes = kit.load_json(moving_path) if moving_path.exists() else None
    intro = (js.get('anim') or {}).get('intro', [])
    if not intro or any(not isinstance(s, list) or len(s) != 2 or not isinstance(s[0], int) or not 0 <= s[0] < len(fronts) for s in intro):
        checks['anim_signature'] = result('warn', True, 'missing/invalid intro')
    else:
        checks['anim_signature'] = anim_signature(fronts, intro, boxes)
    line = meta['line'] if meta else id_
    checks['clone_risk'] = clone_risk(hashes(imgs['front'][0]), all_hashes, line, id_)
    checks['silhouette_noise'] = worst([dict(silhouette_noise(f), frame=n) for n, f in enumerate(fronts)])
    checks['stage_progression'] = result('error', False, 'first stage')
    if meta:
        previous = [v for v in roster.values() if v['meta'] and v['meta']['line'] == line and v['meta']['stage'] < meta['stage']]
        if previous:
            prev = max(previous, key=lambda v: v['meta']['stage'])
            # Compare rest poses; motion extremes should not change a line's scale.
            checks['stage_progression'] = stage_progression(kit.to_index(prev['imgs']['front'][0], prev['js']['palette']), fronts[0])
    return checks


def changed_paths(ref):
    # NUL output preserves unusual filenames. Include staged, unstaged, deleted,
    # renamed (both paths), and untracked bundles relative to the chosen ref.
    def git(*args):
        return subprocess.check_output(['git', '-C', str(ROOT), *args]).decode().split('\0')
    subprocess.run(['git', '-C', str(ROOT), 'rev-parse', '--verify', f'{ref}^{{commit}}'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return sorted(set(p for p in git('diff', '--name-only', '--no-renames', '-z', ref, '--', 'public/art') +
                      git('ls-files', '--others', '--exclude-standard', '-z', '--', 'public/art') if p))


def changed_bundles(paths):
    bundles = set()
    for p in paths:
        parts = Path(p).parts
        if len(parts) >= 5 and parts[:2] == ('public', 'art'):
            start = 4 if parts[2] == 'packs' else 2
            if len(parts) > start+2 and parts[start] in ('species', 'tilesets', 'characters', 'sets', 'structures'):
                bundles.add('/'.join(parts[2:start+2]))
    return sorted(bundles)


def load_tiles(relative, ref=None):
    """Resolve cells independently of sheet layout, including pack fallbacks."""
    folder = Path('public/art')/relative
    def read(path):
        if ref is None:
            return (ROOT/path).read_bytes() if (ROOT/path).exists() else None
        proc = subprocess.run(['git', '-C', str(ROOT), 'show', f'{ref}:{path.as_posix()}'],
                              capture_output=True)
        return proc.stdout if proc.returncode == 0 else None
    raw = read(folder/'tileset.json')
    if raw is None:
        return {}
    base = Path('public/art/tilesets')/folder.name
    js = json.loads(read(base/'tileset.json') or b'{}') if relative.startswith('packs/') else {}
    js.update(json.loads(raw))
    png = read(folder/js['sheet'])
    if png is None and folder != base:
        png = read(base/js['sheet'])
    if png is None:
        raise ValueError(f'missing tileset sheet: {relative} ({ref or "worktree"})')
    sheet = np.asarray(Image.open(io.BytesIO(png)).convert('RGBA'))
    size, columns = js['tileSize'], js['columns']
    def cells(ref):
        return [sheet[(n//columns)*size:(n//columns+1)*size,
                      (n%columns)*size:(n%columns+1)*size].copy()
                for n in (ref if isinstance(ref, list) else [ref])]
    return {key: {'base': cells(spec['base']),
                  'alts': [cells(r) for r in spec.get('alts', [])],
                  'masks': {int(m): cells(r) for m, r in spec.get('masks', {}).items()}}
            for key, spec in js['tiles'].items()}


def same_tile(a, b):
    if a is None or b is None or a['masks'].keys() != b['masks'].keys():
        return False
    left = a['base'] + [f for alt in a['alts'] for f in alt] + [f for m in sorted(a['masks']) for f in a['masks'][m]]
    right = b['base'] + [f for alt in b['alts'] for f in alt] + [f for m in sorted(b['masks']) for f in b['masks'][m]]
    return (len(a['base']) == len(b['base']) and
            [len(v) for v in a['alts']] == [len(v) for v in b['alts']] and
            [len(a['masks'][m]) for m in sorted(a['masks'])] == [len(b['masks'][m]) for m in sorted(b['masks'])] and
            len(left) == len(right) and all(np.array_equal(x, y) for x, y in zip(left, right)))


def cross_patch(tile, frame=0, alt=None):
    """Lead's 5-row x 9-column cross; out-of-bounds joins as in the game."""
    occupied = lambda x, y: not (0 <= x < 9 and 0 <= y < 5) or 2 <= x <= 6 or 2 <= y <= 3
    patch = Image.new('RGBA', (144, 80), (120, 160, 90, 255))
    for y in range(5):
        for x in range(9):
            if not occupied(x, y):
                continue
            mask = sum(bit for dx, dy, bit in ((0, -1, 1), (1, 0, 2), (0, 1, 4), (-1, 0, 8))
                       if occupied(x+dx, y+dy))
            frames = tile['masks'].get(mask, tile['base']) if alt is None else tile['alts'][alt]
            cell = Image.fromarray(frames[frame % len(frames)], 'RGBA')
            patch.alpha_composite(cell, (x*16, y*16))
    return patch.resize((288, 160), Image.Resampling.NEAREST)


def patch_sheet(bundles, ref, output):
    """One labelled before/after row per changed autotile or ground key."""
    rows = []
    for relative in bundles:
        if Path(relative).parts[-2] != 'tilesets':
            continue
        before, after = load_tiles(relative, ref), load_tiles(relative)
        for key in sorted(before.keys() | after.keys()):
            old, new = before.get(key), after.get(key)
            if same_tile(old, new) or not (key in GROUND_KEYS or (old or {}).get('masks') or (new or {}).get('masks')):
                continue
            # Include every animation frame and ground alternate in the key's row.
            count = max(len(t['base']) for t in (old, new) if t)
            views = [(f'frame {f}', f, None) for f in range(count)]
            if key in GROUND_KEYS or not any(t and t['masks'] for t in (old, new)):
                views += [(f'alt {a+1}', 0, a) for a in range(max(len(t['alts']) for t in (old, new) if t))]
            row = Image.new('RGB', (len(views)*600+16, 200), kit.BG)
            draw = ImageDraw.Draw(row)
            draw.text((8, 4), f'{relative}/{key}', fill=kit.INK)
            for n, (label, frame, alt) in enumerate(views):
                for side, tile in enumerate((old, new)):
                    x = 8+n*600+side*300
                    draw.text((x, 20), f'{ref if side == 0 else "after"} / {label}', fill=kit.INK)
                    if tile is None or (alt is not None and alt >= len(tile['alts'])):
                        draw.text((x, 90), '[ADDED]' if side == 0 else '[REMOVED]', fill=kit.INK)
                    else:
                        row.paste(cross_patch(tile, frame, alt), (x, 36))
            rows.append(row)
    if not rows:
        row = Image.new('RGB', (616, 40), kit.BG)
        ImageDraw.Draw(row).text((8, 12), 'No changed autotile or ground keys.', fill=kit.INK)
        rows.append(row)
    sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height+8 for r in rows)+8), kit.BG)
    y = 8
    for row in rows:
        sheet.paste(row, (0, y)); y += row.height+8
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)


def tile_checks(id_, before_ref='HEAD'):
    folder = ROOT/'public/art/tilesets'/id_
    js = kit.load_json(folder/'tileset.json')
    sheet = kit.load_rgba(folder/js['sheet'])
    size, columns = js['tileSize'], js['columns']
    def cells(ref):
        return [sheet[(n//columns)*size:(n//columns+1)*size, (n%columns)*size:(n%columns+1)*size]
                for n in (ref if isinstance(ref, list) else [ref])]
    checks = {}
    before = load_tiles(f'tilesets/{id_}', before_ref)
    repeat = GROUND_KEYS
    for key, spec in js['tiles'].items():
        if key in repeat:
            for group, refs in [('base', [spec['base']]), ('alt', spec.get('alts', []))]:
                for n, ref in enumerate(refs):
                    for frame, cell in enumerate(cells(ref)):
                        checks[f'seam:{key}:{group}{n}:f{frame}'] = seam(cell)
        if spec.get('masks'):
            variants = {mask: cells(spec['masks'].get(str(mask), spec['base'])) for mask in range(16)}
            checks[f'autotile_edges:{key}'] = autotile_edges(variants)
        if key in before and (spec.get('masks') or key in repeat):
            old = before[key]
            refs = [('mask15', spec['masks'].get('15', spec['base']), old['masks'].get(15, old['base']))] if spec.get('masks') else [
                ('base', spec['base'], old['base'])] + [(f'alt{n+1}', ref, old['alts'][n])
                for n, ref in enumerate(spec.get('alts', [])) if n < len(old['alts'])]
            for label, ref, previous in refs:
                for frame, cell in enumerate(cells(ref)):
                    checks[f'grid_artifact:{key}:{label}:f{frame}'] = grid_artifact(previous[frame % len(previous)], cell)
    return checks


def contact_sheet(bundles, report, output):
    """Pack 2x rows into <=1400px. Removed bundles get labelled tombstones."""
    cards = []
    for relative in bundles:
        folder = ROOT/'public/art'/relative
        kind, id_ = Path(relative).parts[-2:]
        base_folder = ROOT/'public/art'/kind/id_
        images = []
        label = relative
        manifest_name = {'species': 'species', 'tilesets': 'tileset', 'characters': 'character',
                         'sets': 'set', 'structures': 'structure'}[kind] + '.json'
        if not folder.exists() or not (folder/manifest_name).exists():
            label += ' [REMOVED]'
        elif kind == 'species':
            # Pack overrides may omit frames; merge metadata and resolve each PNG.
            js = kit.load_json(base_folder/'species.json') if base_folder.exists() else {}
            js.update(kit.load_json(folder/'species.json'))
            fronts = js['frames']['front']
            last = (js.get('anim') or {}).get('intro', [[0, 1]])[-1][0]
            for name in (fronts[0], fronts[last], js['frames']['back'][0], js['frames']['icon'][0]):
                p = folder/name
                if not p.exists() and folder != base_folder:
                    p = base_folder/name
                if p.exists():
                    images.append(Image.open(p).convert('RGBA'))
                else:
                    label += ' [MISSING: ' + name + ']'
            tags = [f"{r['status']}:{k}" for k, r in report.get('species', {}).get(id_, {}).items() if r['status'] != 'PASS']
            label += ' ' + ', '.join(tags)
        elif kind == 'sets':
            js = kit.load_json(base_folder/'set.json') if (base_folder/'set.json').exists() else {}
            js.update(kit.load_json(folder/'set.json'))
            # A changed set manifest changes its rendering contract: show its images.
            for entry in js['images'].values():
                changed = report.get('changed_paths', [])
                prefix = folder.relative_to(ROOT).as_posix() + '/'
                if changed and prefix+'set.json' not in changed and prefix+entry['file'] not in changed:
                    continue
                image_path = folder/entry['file']
                if not image_path.exists() and folder != base_folder:
                    image_path = base_folder/entry['file']
                if image_path.exists():
                    images.append(Image.open(image_path).convert('RGBA'))
                else:
                    label += ' [MISSING: ' + entry['file'] + ']'
        else:
            manifest = {'tilesets': 'tileset', 'characters': 'character', 'structures': 'structure'}[kind]
            metadata_path = base_folder/f'{manifest}.json'
            js = kit.load_json(metadata_path) if metadata_path.exists() else {}
            js.update(kit.load_json(folder/f'{manifest}.json'))
            name = js.get('sheet', js.get('image'))
            image_path = folder/name
            if not image_path.exists() and folder != base_folder:
                image_path = base_folder/name
            if image_path.exists():
                images.append(Image.open(image_path).convert('RGBA'))
            else:
                label += ' [MISSING: ' + name + ']'
        # Split wide sheets into horizontal strips without resampling pixels.
        scaled = []
        for im in images:
            im = im.resize((im.width*2, im.height*2), Image.Resampling.NEAREST)
            for x in range(0, im.width, 1360):
                scaled.append(im.crop((x, 0, min(x+1360, im.width), im.height)))
        rows, row, width = [], [], 0
        for im in scaled:
            if row and width + im.width + 6 > 1360:
                rows.append(row); row, width = [], 0
            row.append(im); width += im.width+6
        rows.append(row)
        for n, row in enumerate(rows):
            title = label if n == 0 else relative + ' (continued)'
            w = max(360, sum(im.width+6 for im in row)+6)
            chars = max(24, (w-12)//7)
            wrap = textwrap.wrap(title, width=chars) or [title]
            h = len(wrap)*14+max((im.height for im in row), default=16)+12
            card = Image.new('RGB', (min(1380, w), h), kit.BG)
            draw = ImageDraw.Draw(card)
            for y, text in enumerate(wrap):
                draw.text((6, 4+y*14), text, fill=kit.INK)
            x = 6
            for im in row:
                card.paste(im, (x, len(wrap)*14+6), im); x += im.width+6
            cards.append(card)
    if not cards:
        card = Image.new('RGB', (380, 40), kit.BG)
        ImageDraw.Draw(card).text((8, 12), 'No changed art bundles.', fill=kit.INK)
        cards.append(card)
    positions, x, y, row_h = [], 8, 8, 0
    for card in cards:
        if x+card.width+8 > 1400:
            x, y, row_h = 8, y+row_h+8, 0
        positions.append((x, y)); x += card.width+8; row_h = max(row_h, card.height)
    width = max(x+card.width+8 for (x, _), card in zip(positions, cards))
    sheet = Image.new('RGB', (width, y+row_h+8), kit.BG)
    for pos, card in zip(positions, cards):
        sheet.paste(card, pos)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)


def print_table(title, rows):
    print(f'\n{title}')
    for id_, checks in rows.items():
        print(id_)
        for name, r in checks.items():
            print(f"  {name:24} {r['status']:4} {r['value']}")
            if name == 'face_risk' and r['coordinates']:
                print('    ' + json.dumps(r['coordinates'], separators=(',', ':')))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('ids', nargs='*')
    select = p.add_mutually_exclusive_group()
    select.add_argument('--all', action='store_true')
    select.add_argument('--line')
    select.add_argument('--tiles', nargs='?', const='all', metavar='TILESET')
    p.add_argument('--changed', metavar='GIT_REF')
    p.add_argument('--strict', action='store_true', help='fail a full audit on error-class checks')
    p.add_argument('--json', type=Path)
    p.add_argument('--sheet', type=Path)
    p.add_argument('--patch', type=Path, help='changed tile cross patches, before/after at 2x (default ref: HEAD)')
    args = p.parse_args(argv)
    if args.ids and (args.all or args.line or args.tiles):
        p.error('use species ids OR --all OR --line OR --tiles')
    if args.sheet and not args.changed:
        p.error('--sheet requires --changed GIT_REF')
    if args.patch and args.tiles is None:
        p.error('--patch requires --tiles [TILESET]')
    if not (args.ids or args.all or args.line or args.tiles or args.changed):
        p.error('select ids, --line, --all, --tiles or --changed')
    try:
        paths = changed_paths(args.changed) if args.changed else []
        bundles = changed_bundles(paths)
        roster = load_roster()
        ids = list(roster) if args.all or args.line or (args.changed and not args.tiles and not args.ids) else args.ids
        if args.line:
            ids = [id_ for id_ in ids if roster[id_]['meta'] and roster[id_]['meta']['line'] == args.line]
            if not ids:
                p.error(f'unknown line: {args.line}')
        for id_ in ids:
            if id_ not in roster:
                p.error(f'unknown species: {id_}')
        if args.changed:
            changed_ids = {Path(b).name for b in bundles if Path(b).parts[-2] == 'species'}
            ids = [id_ for id_ in ids if id_ in changed_ids]
        all_hashes = [(id_, (v['meta'] or {}).get('line', id_), hashes(v['imgs']['front'][0])) for id_, v in roster.items()]
        report = {'schema': 'verdant.art-qa/1', 'changed_ref': args.changed, 'changed_paths': paths,
                  'changed_bundles': bundles, 'species': {id_: check_species(id_, roster, all_hashes) for id_ in ids}, 'tilesets': {}}
        if args.tiles or args.all or args.changed:
            tile_ids = sorted(d.name for d in (ROOT/'public/art/tilesets').iterdir() if d.is_dir()) if args.tiles in (None, 'all') else [args.tiles]
            if args.changed:
                changed_tiles = {Path(b).name for b in bundles if Path(b).parts[-2] == 'tilesets'}
                tile_ids = [id_ for id_ in tile_ids if id_ in changed_tiles]
            report['tilesets'] = {id_: tile_checks(id_, args.changed or 'HEAD') for id_ in tile_ids}
        print_table('Creature QA', report['species'])
        print_table('Tile QA', report['tilesets'])
        failures = sum(r['status'] == 'FAIL' and r['level'] == 'error' for group in ('species', 'tilesets') for row in report[group].values() for r in row.values())
        report['error_count'] = failures
        if args.json:
            args.json.parent.mkdir(parents=True, exist_ok=True)
            args.json.write_text(json.dumps(report, indent=2)+'\n')
        if args.sheet:
            contact_sheet(bundles, report, args.sheet)
            print(f'Sheet: {args.sheet}')
        if args.patch:
            patch_bundles = changed_bundles(changed_paths(args.changed or 'HEAD'))
            patch_bundles = [b for b in patch_bundles if args.tiles == 'all' or Path(b).name == args.tiles]
            patch_sheet(patch_bundles, args.changed or 'HEAD', args.patch)
            print(f'Patch: {args.patch}')
        print(f'Errors: {failures}')
        return int(failures > 0 and (not args.all or args.changed is not None or args.strict))
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as e:
        p.error(str(e))


if __name__ == '__main__':
    sys.exit(main())
