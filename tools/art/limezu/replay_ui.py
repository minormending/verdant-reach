"""Replay recorded real Canvas calls for local software QA (not browser QA)."""
import base64
import io
import json
import math
import re
from PIL import Image, ImageColor, ImageDraw, ImageFont
from build_pack import HERE
from review_render import guarded_review


def render():
    source = HERE / 'review/r6-commands.json'
    guarded_review(source)
    data = json.loads(source.read_text())
    memo, pngs = {}, {}
    def color(value):
        if value.startswith('rgba'):
            r,g,b,a = re.findall(r'[\d.]+', value)
            return (int(r),int(g),int(b),round(float(a)*255))
        return ImageColor.getcolor(value, 'RGBA')
    def canvas(index):
        if index in memo:
            return memo[index]
        spec = data['canvases'][index]
        out = Image.new('RGBA', (spec['width'], spec['height']))
        for op in spec['ops']:
            args, kind = op['args'], op['kind']
            if kind == 'image':
                ref = args[0]
                if 'canvas' in ref:
                    image = canvas(ref['canvas'])
                else:
                    uri = ref['src']
                    if uri not in pngs:
                        pngs[uri] = Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
                    image = pngs[uri]
                if len(args) == 3:
                    x,y = args[1:]; w,h = image.size
                elif len(args) == 5:
                    x,y,w,h = args[1:]
                else:
                    sx,sy,sw,sh,x,y,w,h = args[1:]
                    image = image.crop((round(sx),round(sy),round(sx+sw),round(sy+sh)))
                image = image.resize((max(1,round(w)),max(1,round(h))), Image.Resampling.NEAREST)
            elif kind in {'fill','clear'}:
                x,y,w,h = args
                if w <= 0 or h <= 0: continue
                if isinstance(op['color'], dict):
                    pattern = canvas(op['color']['pattern'])
                    image = Image.new('RGBA',(round(w),round(h)))
                    for yy in range(0,round(h),pattern.height):
                        for xx in range(0,round(w),pattern.width):image.paste(pattern,(xx,yy))
                else:
                    image = Image.new('RGBA',(round(w),round(h)),color(op['color']))
            elif kind == 'text':
                text,x,baseline = args
                y = baseline - 12; w,h = max(1,len(text)*8),16
                image = Image.new('RGBA',(w,h))
                font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',12)
                ImageDraw.Draw(image).text((0,0),text,font=font,fill=color(op['color']))
            else:
                raise ValueError('unknown draw kind: ' + kind)
            a,b,c,d,e,f = op['matrix']
            points = [(a*xx+c*yy+e,b*xx+d*yy+f) for xx,yy in ((x,y),(x+w,y),(x,y+h),(x+w,y+h))]
            left,top = math.floor(min(p[0] for p in points)+1e-8),math.floor(min(p[1] for p in points)+1e-8)
            right,bottom = math.ceil(max(p[0] for p in points)-1e-8),math.ceil(max(p[1] for p in points)-1e-8)
            det=a*d-b*c
            if not det or right<=left or bottom<=top:continue
            affine=(d/det,-c/det,(d*(left-e)-c*(top-f))/det-x,-b/det,a/det,(-b*(left-e)+a*(top-f))/det-y)
            image=image.transform((right-left,bottom-top),Image.Transform.AFFINE,affine,Image.Resampling.NEAREST)
            crop=(max(left,0),max(top,0),min(right,out.width),min(bottom,out.height))
            for cx,cy,cw,ch in op['clips']:
                crop=(max(crop[0],round(cx)),max(crop[1],round(cy)),min(crop[2],round(cx+cw)),min(crop[3],round(cy+ch)))
            if crop[2]<=crop[0] or crop[3]<=crop[1]:continue
            image=image.crop((crop[0]-left,crop[1]-top,crop[2]-left,crop[3]-top))
            if op['alpha'] < 1:image.putalpha(image.getchannel('A').point(lambda n:round(n*op['alpha'])))
            if kind == 'clear':out.paste((0,0,0,0),crop)
            else:out.alpha_composite(image,(crop[0],crop[1]))
        memo[index]=out
        return out
    path = HERE / 'review/r6.png'
    guarded_review(path)
    canvas(data['sheet']).convert('RGB').save(path)
    print(path)

if __name__ == '__main__':
    render()
