"""R6b licensed review grids; output ONLY to the gitignored review folder."""
import json
import math
from PIL import Image, ImageDraw
from build_pack import Sources, roots, HERE, PACK
from review_render import guarded_review


def walking(sources, character):
    # Measured Character Generator standing directions: right, back, left,
    # down at x=0,16,32,48, y=0. The down frame includes its 32px height.
    out = Image.new('RGBA',(16,32))
    for folder, key in [('Bodies','body'),('Eyes','eyes'),('Outfits','outfit'),('Hairstyles','hair'),('Accessories','accessory')]:
        if character[key]:
            out.alpha_composite(sources.crop('interiors:2_Characters/Character_Generator/'+folder+'/16x16/'+character[key],[48,0,64,32]))
    return out


def render():
    sources = Sources(roots())
    characters = json.loads((HERE/'mapping/characters.json').read_text())['characters']
    for set_id, filename, title in [('portraits','r6b.png','R6b: trainer cards / down-facing walking sprites (2x)'),
                                    ('faces','r6b-faces.png','R6b: all dialogue face cards (2x)')]:
        entries = json.loads((PACK/f'sets/{set_id}/set.json').read_text())['images']
        columns, cw, ch = 4, 304, 142
        grid_bottom = 32 + math.ceil(len(entries)/columns)*ch
        sheet = Image.new('RGBA',(columns*cw,grid_bottom+220),'#302923')
        draw = ImageDraw.Draw(sheet); draw.text((8,8),title,fill='#f8eedc')
        for n,(key,spec) in enumerate(sorted(entries.items())):
            x,y=n%columns*cw+8,32+n//columns*ch
            draw.text((x,y),key,fill='#f8eedc')
            image=Image.open(PACK/f'sets/{set_id}/{key}.png').convert('RGBA')
            w,h=spec['size']; frame=image.crop((0,0,w,h)); blink=image.crop((w,0,w*2,h)) if spec['frames']>1 else None
            sheet.alpha_composite(frame.resize((w*2,h*2),Image.Resampling.NEAREST),(x,y+18))
            if blink: sheet.alpha_composite(blink.resize((w*2,h*2),Image.Resampling.NEAREST),(x+w*2+4,y+18))
            if set_id=='portraits':
                sprite=walking(sources,characters['player' if key=='player_back' else key])
                sheet.alpha_composite(sprite.resize((32,64),Image.Resampling.NEAREST),(x+240,y+50))
        capture = HERE/'review'/('r6b-intro.png' if set_id=='portraits' else 'r6b-dialogue.png')
        if capture.exists():
            draw.text((8,grid_bottom+8),'Scene Canvas replay, 320x180 (1x); browser verification pending',fill='#f8eedc')
            sheet.alpha_composite(Image.open(capture).convert('RGBA'),(8,grid_bottom+28))
        else:
            draw.text((8,grid_bottom+8),'Capture pending: run review_portraits.mjs first',fill='#f8eedc')
        path=HERE/'review'/filename; guarded_review(path); path.parent.mkdir(exist_ok=True); sheet.convert('RGB').save(path)
        print(path)


if __name__=='__main__': render()
