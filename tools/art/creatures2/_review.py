"""Original art only: a labelled, native-pixel 3x pilot contact sheet."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
from kit2 import ART, rgb_of


def review_sheet(ids, output):
    scale=3; gap=10; cell=192
    # Four front keys, a true rear view, both icons, and a material sport.
    sheet=Image.new('RGB',(7*cell+8*gap,len(ids)*464+36),'#e8e0d0')
    draw=ImageDraw.Draw(sheet)
    draw.text((gap,8),'R5b starter pilot / original art / 3x nearest-neighbour',fill='#2a2230')
    for row,id_ in enumerate(ids):
        folder=ART/'species'/id_; js=json.loads((folder/'species.json').read_text())
        y=36+row*464
        draw.text((gap,y),id_,fill='#2a2230')
        cells=[]
        for i,name in enumerate(js['frames']['front']):
            cells.append((f'front {i}',Image.open(folder/name).convert('RGBA')))
        cells.append(('back',Image.open(folder/js['frames']['back'][0]).convert('RGBA')))
        icons=Image.new('RGBA',(64,64))
        for i,name in enumerate(js['frames']['icon']):
            icons.alpha_composite(Image.open(folder/name).convert('RGBA'),(i*32,16))
        cells.append(('icon / hop',icons))
        sport=Image.open(folder/js['frames']['front'][0]).convert('RGBA')
        source=sport.copy(); pixels=sport.load()
        mapping={rgb_of(k):rgb_of(v) for k,v in js['sport'].items()}
        for yy in range(64):
            for xx in range(64):
                p=source.getpixel((xx,yy))
                if p[3] and p[:3] in mapping: pixels[xx,yy]=(*mapping[p[:3]],255)
        cells.append(('sport',sport))
        for col,(label,im) in enumerate(cells):
            x=gap+col*(cell+gap)
            draw.text((x,y+16),label,fill='#533f49')
            im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
            sheet.paste(im,(x,y+32),im)
        # A second row isolates the signature pose beside rest at native scale
        # and at 3x, so a reviewer can judge motion without scanning four keys.
        key=max(js['anim']['intro'],key=lambda step: step[1] if step[0] else -1)[0]
        compare=[('rest / 3x',js['frames']['front'][0],3),
                 (f'intro key {key} / 3x',js['frames']['front'][key],3),
                 ('rest / 1x',js['frames']['front'][0],1),
                 (f'intro key {key} / 1x',js['frames']['front'][key],1)]
        for col,(label,name,zoom) in enumerate(compare):
            x=gap+col*(cell+gap); yy=y+232
            draw.text((x,yy+16),label,fill='#533f49')
            im=Image.open(folder/name).convert('RGBA')
            im=im.resize((64*zoom,64*zoom),Image.Resampling.NEAREST)
            sheet.paste(im,(x,yy+32),im)
    Path(output).parent.mkdir(parents=True,exist_ok=True); sheet.save(output)
