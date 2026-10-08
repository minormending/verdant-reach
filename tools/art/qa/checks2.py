"""Creature v2 QA. Licensed palette pixels are read locally and never emitted."""
from __future__ import annotations
import json
import os
from pathlib import Path
import numpy as np
from PIL import Image
from checks import (T, result, geometry, face_risk, anim_signature, clone_risk,
                    hashes, silhouette_noise, stage_progression)

ROOT = Path(__file__).resolve().parents[3]
LIMITS = {'baby': (42,50,.20,.36), 'teen': (50,58,.26,.46), 'adult': (58,64,.36,.60)}


def oklab(rgb):
    """sRGB bytes -> perceptual OKLab, using the published linear matrices."""
    c = np.asarray(rgb, dtype=float)/255
    c = np.where(c <= .04045, c/12.92, ((c+.055)/1.055)**2.4)
    lms = c @ np.array([[.4122214708,.2119034982,.0883024619],
                        [.5363325363,.6806995451,.2817188376],
                        [.0514459929,.1073969566,.6299787005]])
    return np.cbrt(lms) @ np.array([[.2104542553,1.9779984951,.0259040371],
                                   [.7936177850,-2.4285922050,.7827717662],
                                   [-.0040720468,.4505937099,-.8086757660]])


def local_palette(root=ROOT):
    config_path = root/'tools/art/limezu/local.json'
    config = json.loads(config_path.read_text()) if config_path.exists() else {}
    path = os.environ.get('LIMEZU_EXTERIORS') or config.get('exteriors')
    if not path:
        return None
    folder = Path(path).expanduser()
    choices = [folder] if folder.name == 'Palette.png' else sorted(folder.rglob('Palette.png'))
    if not choices:
        return None
    a = np.asarray(Image.open(choices[0]).convert('RGBA'))
    return np.unique(a[a[...,3] > 0][:,:3], axis=0)


def palette_harmony(colours, reference=None):
    if reference is None:
        return {'status':'PASS','level':'info','value':'SKIP: local LimeZu exteriors Palette.png absent'}
    ref = oklab(reference)
    if not len(ref):
        return {'status':'PASS','level':'info','value':'SKIP: local Palette.png has no opaque colours'}
    cols = np.asarray(colours, dtype=np.uint8).reshape(-1,3)
    distance = np.sqrt(((oklab(cols)[:,None,:]-ref[None,:,:])**2).sum(axis=2)).min(axis=1)
    outliers = [{'colour':'#%02x%02x%02x' % tuple(c), 'distance':round(float(d),4)}
                for c,d in zip(cols,distance) if d > .12]
    return result('warn', bool(outliers), f'{len(outliers)} outliers (OKLab distance > 0.12)', outliers=outliers)


def indexes(rgba):
    """Retain geometry and classify facial contrast independently of palette order."""
    rgb = rgba[...,:3]/255.
    brightness = rgb @ np.array([.2126,.7152,.0722])
    ix = np.full(rgba.shape[:2], T, np.uint8)
    opaque = rgba[...,3] > 0
    ix[opaque] = 2
    ix[opaque & (brightness < .32)] = 1
    ix[opaque & (brightness >= .82)] = 3
    return ix


def size_class(ix, cls):
    g = geometry(ix); lo,hi,flo,fhi = LIMITS[cls]
    fail = not (lo <= g['extent'] <= hi and flo <= g['fill'] <= fhi) or (cls == 'adult' and g['edges'] < 2)
    return result('error', fail, f"{cls}: {g['extent']}px/{g['fill']:.1%}/{g['edges']} edges", **g)


def outline(rgba):
    op = rgba[...,3] > 0; p = np.pad(op,1)
    interior = p[:-2,1:-1] & p[2:,1:-1] & p[1:-1,:-2] & p[1:-1,2:]
    black = op & ~interior & (rgba[...,:3] == 0).all(axis=2)
    return result('error', bool(black.any()), int(black.sum()))


def check_species(id_, entry, roster, all_hashes):
    from artkit.validate import check_species as validate_species
    from artkit.bundles import Bundle
    js, imgs, meta = entry['js'], entry['imgs'], entry['meta']
    arrays = {n:a for g in ('front','back','icon') for n,a in zip((js.get('frames') or {}).get(g,[]),imgs.get(g,[]))}
    b = Bundle('species',id_,js)
    b.file = lambda n: Path(__file__)
    b.image = lambda n: arrays[n]
    problems = []; validate_species(b,problems)
    checks = {'bundle':result('error',bool(problems),len(problems),messages=problems)}
    colours = np.unique(np.concatenate([a[a[...,3]>0][:,:3] for a in arrays.values()]), axis=0)
    checks['colours'] = result('error',len(colours)>16,len(colours))
    fronts = [indexes(a) for a in imgs['front']]
    def worst(rows):
        return max(rows,key=lambda r:{'PASS':0,'WARN':1,'FAIL':2}[r['status']])
    checks['outline'] = worst([dict(outline(a),frame=n) for n,a in enumerate(imgs['front']+imgs['back']+imgs.get('icon',[]))])
    faces = [{'frame':n, 'view':view, **hit}
             for view in ('front','back','icon') for n,a in enumerate(imgs.get(view,[]))
             for hit in face_risk(indexes(a),scale=a.shape[0]/56)['coordinates']]
    checks['face_risk'] = result('error',bool(faces),len(faces),coordinates=faces)
    checks['size_class'] = worst([dict(size_class(ix,meta['class']),frame=n) for n,ix in enumerate(fronts)]) if meta else result('error',True,'no species data stage/line')
    checks['grounding'] = worst([dict(result('error',geometry(ix)['bottom'] not in (61,62,63),geometry(ix)['bottom']),frame=n) for n,ix in enumerate(fronts)])
    checks['centre_of_mass'] = worst([result('warn',not 32 <= geometry(ix)['com_x'] <= 39,round(geometry(ix)['com_x'],2)) for ix in fronts])
    back = geometry(indexes(imgs['back'][0]))
    checks['back_fill'] = result('warn',not .45 <= back['fill'] <= .75,f"{back['fill']:.1%}")
    intro = (js.get('anim') or {}).get('intro',[])
    valid = bool(intro) and all(isinstance(s,list) and len(s)==2 and isinstance(s[0],int) and 0 <= s[0] < len(fronts) and isinstance(s[1],int) and s[1]>0 for s in intro)
    valid = valid and intro[-1][0]==0 and 36 <= sum(s[1] for s in intro) <= 72
    checks['animation'] = result('error',not valid,'36–72 ticks, ending on frame 0' if valid else 'missing/invalid intro')
    # Exact colours, rather than contrast bins, count signature motion/shading.
    exact = []
    for a in imgs['front']:
        labels = np.full(a.shape[:2],T,np.uint8)
        for n,c in enumerate(colours):
            labels[(a[...,:3]==c).all(axis=2)&(a[...,3]>0)] = n
        exact.append(labels)
    boxes = js.get('moving')
    boxes_valid = isinstance(boxes,list) and all(isinstance(b,list) and len(b)==4 and all(isinstance(n,int) for n in b) and 0 <= b[0] < b[2] <= 64 and 0 <= b[1] < b[3] <= 64 for b in boxes)
    checks['anim_signature'] = anim_signature(exact,intro,boxes) if valid and boxes_valid else result('warn',True,'missing/invalid intro or moving boxes')
    line = meta['line'] if meta else id_
    checks['clone_risk'] = clone_risk(hashes(imgs['front'][0]),all_hashes,line,id_)
    checks['silhouette_noise'] = worst([dict(silhouette_noise(ix,scale=64/56),frame=n) for n,ix in enumerate(fronts)])
    checks['palette_harmony'] = palette_harmony(colours,local_palette())
    checks['stage_progression'] = result('error',False,'first stage / mixed-format line')
    if meta:
        previous = [v for v in roster.values() if v['meta'] and v['meta']['line']==line and v['meta']['stage']<meta['stage'] and v['js'].get('format')=='verdant.species/2']
        if previous:
            prev = max(previous,key=lambda v:v['meta']['stage'])
            checks['stage_progression'] = stage_progression(indexes(prev['imgs']['front'][0]),fronts[0])
    return checks
