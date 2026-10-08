"""Victoria water lily: REARING spiny bud/tray; LOOMING pink crown.
Rose ribs and reflexed cream sepals/petals connect every stage.
"""
from kit2 import *
IDS=['lily_seedpod','lily_pad','giant_water_lily']
LEAF=['#354c4e','#54735f','#839c73','#b7c898']
ROSE=['#765362','#956077','#c58a9b','#e4b2b4']
CREAM=['#9692a3','#c9c7c5','#eee6d3']
SPEC='#f4f0e6'
GOLD=['#786044','#a48b50','#c7b36f','#e6d899']
BRONZE=['#514944','#786c4d','#a49b68','#cfca93']
SPORT=dict(zip(ROSE,GOLD)) | dict(zip(CREAM,['#a4996b','#d5c68b','#eee0ae'])) | dict(zip(LEAF,BRONZE))


def petal_blade(im,base,tip,width,ramp=CREAM,bend=0):
    bx,by=base;tx,ty=tip;dx,dy=tx-bx,ty-by;length=max(1,math.hypot(dx,dy));nx,ny=-dy/length,dx/length
    profile=[(0,0),(.18,.30),(.45,.50),(.73,.34),(1,0)]
    points=[(bx+dx*t+nx*(w*width+bend*math.sin(t*math.pi)),by+dy*t+ny*(w*width+bend*math.sin(t*math.pi))) for t,w in profile]
    points += [(bx+dx*t+nx*(-w*width+bend*math.sin(t*math.pi)),by+dy*t+ny*(-w*width+bend*math.sin(t*math.pi))) for t,w in profile[-2:0:-1]]
    shaped(im,points,ramp,ink=ramp[0])


def bud(im,x,y,w,h):
    shaped(im,[(x+w*.2,y+h*.87),(x,y+h*.42),(x+w*.12,y+h*.12),
               (x+w*.28,y),(x+w*.73,y+h*.18),(x+w,y+h*.6),
               (x+w*.91,y+h*.9),(x+w*.55,y+h)],ROSE)
    # Thick connected ribs and short two-pixel-based spines, not a noise halo.
    stem(im,[(x+w*.28,y+3),(x+w*.41,y+h*.40),(x+w*.64,y+h*.85)],ROSE[1],2)
    stem(im,[(x+w*.48,y+5),(x+w*.64,y+h*.39),(x+w*.80,y+h*.76)],ROSE[1],2)
    for px,py,dx,dy in [(x+1,y+h*.25,-3,-2),(x,y+h*.5,-3,-1),(x+w*.83,y+h*.3,3,-2),(x+w*.97,y+h*.6,3,0)]:
        shaped(im,[(px,py-1),(px+dx,py+dy),(px,py+2)],ROSE)


def tray(im,box):
    x0,y0,x1,y1=box
    # Far upturned rim above the floor; broad near wall below it.
    oval(im,(x0,y0,x1,y1),ROSE)
    oval(im,(x0+2,y0+2,x1-2,y1-4),LEAF,ink=LEAF[1])
    stem(im,[(x0+6,y0+4),(x0+15,y0+2),(x1-13,y0+2),(x1-5,y0+5)],LEAF[-1],2)
    # Clear water sheen along the lit top-left lip, never scattered dots.
    stem(im,[(x0+7,y0+5),(x0+17,y0+3),(x0+24,y0+3)],SPEC,2)
    # Surface veins use the leaf material, and vertical ribs the rose material.
    cy=(y0+y1)/2
    for end in [(x0+7,cy),(x0+13,y1-7),(x1-10,y1-7),(x1-6,cy)]:
        stem(im,[((x0+x1)/2,cy-1),end],LEAF[1],2)
    for x in range(round(x0+10),round(x1-7),7):
        stem(im,[(x,y1-3),(x+1,y1-1)],ROSE[1],2)
    # Victoria's drainage notch cuts only the near lip, not a face-like slit.
    polygon(im,[(x0+17,y1),(x0+21,y1-5),(x0+24,y1+2)],LEAF[1])


def seedpod(f=0):
    im=canvas(); peel=(0,3,6,-1)[f]
    petal_blade(im,(36,48),(56,37),17,ROSE)
    petal_blade(im,(34,50),(49,62),16,ROSE)
    petal_blade(im,(32,51),(17,62),16,ROSE)
    bud(im,22,21,24,35)
    petal_blade(im,(29,49),(11,34-peel),22,CREAM,bend=2)
    return clean_clusters(im)


def pad(f=0):
    im=canvas(); peel=(0,3,6,-1)[f]
    tray(im,(7,47,61,61))
    petal_blade(im,(46,49),(49,20),16,LEAF,bend=3)
    stem(im,[(47,44),(49,34),(51,24)],ROSE[1],2)
    tapered(im,[(33,51),(38,35),(26,24)],[7,7,5],LEAF)
    bud(im,17,12,21,29)
    petal_blade(im,(29,37),(10,26-peel),17,CREAM,bend=2)
    return clean_clusters(im)


def bloom(im,cx,cy,peel=0,back=False):
    # Broad cream outer petals, turned in 3/4; rose inner petals form the crown.
    for tip,width in [((cx-17,cy-21),13),((cx-5,cy-29),12),((cx+9,cy-27),12),((cx+24,cy-17),11)]:
        petal_blade(im,(cx,cy),tip,width,CREAM)
    petal_blade(im,(cx,cy),(cx-27,cy+2-peel),12,CREAM,bend=-3)
    petal_blade(im,(cx+1,cy+2),(cx+27,cy+8-peel*.5),12,CREAM,bend=3)
    for tip,width in [((cx-13,cy-15),11),((cx-4,cy-22),12),((cx+8,cy-20),12),((cx+17,cy-12),11)]:
        petal_blade(im,(cx,cy+3),tip,width,ROSE)
    petal_blade(im,(cx+3,cy+1),(cx-14,cy+14),10,CREAM,bend=2)
    petal_blade(im,(cx+2,cy+3),(cx+17,cy+14),10,CREAM,bend=-2)
    if back:
        petal_blade(im,(cx+2,cy+5),(cx+2,cy+19),18,LEAF)
    else:
        petal_blade(im,(cx+3,cy+4),(cx-4,cy-10),12,ROSE)


def giant(f=0):
    im=canvas();peel=(0,3,6,-1)[f]
    tray(im,(0,49,63,63))
    tapered(im,[(35,51),(39,34),(28,26)],[11,10,8],LEAF)
    bloom(im,33,29,peel)
    return clean_clusters(im)


def back(stage):
    im=canvas()
    if stage==0:
        bud(im,12,10,39,57)
        petal_blade(im,(23,55),(1,45),24,ROSE)
        petal_blade(im,(41,54),(61,29),28,CREAM)
    else:
        tray(im,(-3,36,66,72))
        if stage==1:
            petal_blade(im,(15,57),(8,18),29,LEAF,bend=-3)
            tapered(im,[(28,52),(33,33),(42,26)],[9,10,6],LEAF)
            bud(im,30,7,25,34)
            petal_blade(im,(42,32),(62,18),18,CREAM)
        else:
            tapered(im,[(30,57),(32,37),(38,29)],[13,11,8],LEAF)
            bloom(im,34,32,back=True)
    return clean_clusters(im)


def icon(stage):
    im=canvas(32)
    if stage==0:
        petal_blade(im,(16,25),(8,30),13,ROSE);petal_blade(im,(17,24),(26,30),12,ROSE)
        bud(im,10,6,15,20); petal_blade(im,(16,24),(3,16),14,CREAM)
    elif stage==1:
        tray(im,(1,23,30,30))
        petal_blade(im,(24,25),(27,9),12,LEAF)
        tapered(im,[(17,26),(19,17),(14,13)],[4,4,3],LEAF)
        bud(im,7,4,13,17);petal_blade(im,(15,18),(2,12),9,CREAM)
    else:
        tray(im,(1,23,30,30))
        # Preserve the rose lip across the miniature drainage notch.
        stem(im,[(25,26),(28,26)],ROSE[1],2)
        # Separate icon composition: five cream points and a pink crown.
        for tip in [(4,9),(10,2),(19,2),(29,10),(28,18),(3,18)]:
            petal_blade(im,(16,18),tip,13,CREAM)
        for tip in [(9,9),(16,5),(23,10)]:
            petal_blade(im,(16,20),tip,10,ROSE)
    return clean_clusters(im)


def build():
    for stage,(id_,draw) in enumerate(zip(IDS,[seedpod,pad,giant])):
        fronts=[draw(f) for f in range(4)]; b=back(stage);i=icon(stage)
        colours={'#%02x%02x%02x'%tuple(p[:3]) for a in fronts+[b,i] for p in np.asarray(a).reshape(-1,4) if p[3]}
        write_species2(id_,front=fronts,back=[b],icon=[i,icon_hop(i)],
            anim={'intro':[[0,8],[1,8],[2,14],[1,6],[3,8],[0,8]]},
            moving=[[0,18,35,54]] if stage<2 else [[0,20,64,46]],
            sport={k:v for k,v in SPORT.items() if k in colours},tool='tools/art/creatures2/lily.py',
            notes="REARING spiny rose bud, cream sepal peeled as a lead arm; tilted Victoria tray with upturned rose rim, drainage notch, radial veins and a connected water sheen. LOOMING white-to-pink crown and reflexed petal arms. Intro: the lead sepal peels open and closes; adult outer petals spread and settle while the tray stays planted. Sport: yellow flowers and bronze-toned leaves after Nymphaea x marliacea 'Chromatella' (a cultivated water-lily relative, not a Victoria cultivar). Outline and water specular are unchanged. No faces.")
if __name__=='__main__': build()
