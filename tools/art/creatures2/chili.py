"""Capsicum: LUNGING five-petal star/comma pod; COILED flame-hook adult.
A glossy pod and lime calyx, without a head-like face or facial markings.
"""
from kit2 import *
IDS=['chili_blossom','green_chili','red_chili']
LEAF=['#344d48','#547350','#819c60','#bac886']
GREEN=['#315249','#547e50','#7eaa60','#b4c780']
RED=['#703a50','#a24b51','#cb6b58','#e49c76']
PETAL=['#948d9e','#c7c5bd','#e9e5d5']
SPEC='#f4f0e6'
PURPLE=['#3d354b','#5b4b68','#827191','#b3a1bb']
SPORTLEAF=['#343643','#4b485a','#72637c','#a293a5']
SPORT=dict(zip(LEAF,SPORTLEAF)) | dict(zip(GREEN,PURPLE)) | dict(zip(RED,PURPLE)) | dict(zip(PETAL,['#8f739d','#b299c1','#d5c3dd']))


def blade(im,base,tip,width,ramp=LEAF):
    bx,by=base;tx,ty=tip;dx,dy=tx-bx,ty-by;length=max(1,math.hypot(dx,dy));nx,ny=-dy/length,dx/length
    points=[base,(bx+dx*.3+nx*width*.46,by+dy*.3+ny*width*.46),
            (bx+dx*.62+nx*width*.35,by+dy*.62+ny*width*.35),tip,
            (bx+dx*.62-nx*width*.35,by+dy*.62-ny*width*.35),
            (bx+dx*.3-nx*width*.46,by+dy*.3-ny*width*.46)]
    shaped(im,points,ramp)
    stem(im,[(bx+dx*.15,by+dy*.15),(bx+dx*.78,by+dy*.78)],ramp[1],2)


def calyx(im,cx,cy,w=24):
    # Five fleshy sepals seen obliquely; the lime star remains the focal crown.
    shaped(im,[(cx-w*.55,cy+2),(cx-w*.29,cy-3),(cx-w*.15,cy-8),
               (cx+2,cy-4),(cx+w*.28,cy-7),(cx+w*.26,cy-1),
               (cx+w*.52,cy+2),(cx+w*.23,cy+5),(cx+w*.12,cy+10),
               (cx-3,cy+6),(cx-w*.4,cy+8),(cx-w*.29,cy+3)],LEAF)


def flower(im,cx,cy,r,turn=-18,front=True):
    # Five separate corolla petals, not a generic round rosette.
    for k in (2,3,4,0,1):
        a=math.radians(turn+k*72-90);dx,dy=math.cos(a),math.sin(a)
        nx,ny=-dy,dx; tip=(cx+dx*r,cy+dy*r)
        shaped(im,[(cx-dx*2,cy-dy*2),(cx+dx*r*.38+nx*r*.43,cy+dy*r*.38+ny*r*.43),
                   (tip[0]+nx*3,tip[1]+ny*3),tip,(tip[0]-nx*3,tip[1]-ny*3),
                   (cx+dx*r*.38-nx*r*.43,cy+dy*r*.38-ny*r*.43)],PETAL,ink=PETAL[0])
    if front:
        # Broad green throat and connected stamens, never isolated dark dots.
        polygon(im,[(cx-5,cy-2),(cx-2,cy-5),(cx+3,cy-4),(cx+6,cy+1),(cx+1,cy+5),(cx-4,cy+3)],LEAF[-2])
        stem(im,[(cx-3,cy),(cx,cy-2),(cx+3,cy)],LEAF[-1],2)
    else:
        calyx(im,cx,cy,16)


def blossom(f=0):
    im=canvas(); lift=(0,2,4,-1)[f]
    blade(im,(38,47),(53,29),17)
    tapered(im,[(37,59),(41,40),(29,29),(24,29)],[7,8,6,4],LEAF)
    shaped(im,[(36,56),(27,61),(25,62),(35,62),(40,60),(48,62),(53,62),(45,57)],LEAF)
    blade(im,(39,52),(18,48-lift),18)
    flower(im,26,34-lift*.5,16)
    tapered(im,[(41,40),(42,23),(49,17),(52,22-lift)],[3,3,3,2],LEAF)
    return clean_clusters(im)


def pod(stage,f=0):
    im=canvas(); flick=(0,3,6,-2)[f]; ramp=GREEN if stage==1 else RED
    if stage==1:
        blade(im,(27,38),(10,40),18)
        blade(im,(33,26),(52,16),17)
        tapered(im,[(24,26),(25,51),(40,62),(55,51)],[20,22,18,10],ramp)
        tapered(im,[(47,57),(59,57),(59,43),(55-flick*.3,38-flick)],[11,10,6,2],ramp)
        calyx(im,23,23)
        tapered(im,[(24,16),(27,10),(36,11)],[4,4,3],LEAF)
        specular(im,[(17,31),(18,43),(24,48)],SPEC,2)
    else:
        blade(im,(26,25),(3,34),17)
        blade(im,(29,20),(44,10),16)
        tapered(im,[(25,25),(22,48),(42,64),(57,52)],[25,26,22,15],ramp)
        tapered(im,[(49,58),(70,45),(60,18-flick),(50-flick*.3,27-flick)],[17,14,7,3],ramp)
        calyx(im,24,17,29)
        tapered(im,[(25,11),(28,0),(36,2),(40,5)],[5,5,4,3],LEAF)
        specular(im,[(17,28),(17,38),(22,44)],SPEC,3)
        # Detached ≥2px ember echoing the red tip, with a soft material edge.
        shaped(im,[(43,20-flick*.5),(46,16-flick*.5),(48,20-flick*.5),(45,23-flick*.5)],RED)
    return clean_clusters(im)


def back(stage):
    im=canvas()
    if stage==0:
        tapered(im,[(28,64),(31,39),(42,28)],[14,12,8],LEAF)
        blade(im,(29,58),(3,40),29); blade(im,(32,51),(60,45),26)
        flower(im,38,28,23,turn=10,front=False)
    else:
        ramp=GREEN if stage==1 else RED
        tapered(im,[(39,29),(39,46),(31,68)],[33,43,46],ramp)
        tapered(im,[(19,66),(1,39),(4,21),(12,19)],[22,16,8,3],ramp)
        blade(im,(43,43),(60,35),18)
        calyx(im,39,24,34)
        tapered(im,[(39,18),(40,6),(52,5),(56,9)],[6,6,4,3],LEAF)
        specular(im,[(25,36),(25,49),(22,56)],SPEC,3)
    return clean_clusters(im)


def icon(stage):
    im=canvas(32)
    if stage==0:
        tapered(im,[(19,29),(22,18),(14,14)],[5,5,3],LEAF)
        blade(im,(20,25),(29,16),12); blade(im,(19,27),(7,26),12)
        flower(im,13,13,11)
    else:
        ramp=GREEN if stage==1 else RED
        tapered(im,[(11,13),(10,29),(25,30),(28,18)],[12,17,11,3],ramp)
        calyx(im,11,10,17)
        tapered(im,[(11,7),(14,3),(20,4)],[3,3,2],LEAF)
        stem(im,[(8,16),(9,22),(12,25)],SPEC,2)
    return clean_clusters(im)


def build():
    for stage,id_ in enumerate(IDS):
        fronts=[blossom(f) if stage==0 else pod(stage,f) for f in range(4)]
        i=icon(stage); colours={c for a in fronts+[back(stage),i] for c in ['#%02x%02x%02x'%tuple(p[:3]) for p in np.asarray(a).reshape(-1,4) if p[3]]}
        write_species2(id_,front=fronts,back=[back(stage)],icon=[i,icon_hop(i)],
            anim={'intro':[[0,8],[1,8],[2,12],[1,6],[3,8],[0,10]]},
            moving=[[5,10,55,57]] if stage==0 else [[42,10,64,63]],
            sport={k:v for k,v in SPORT.items() if k in colours},tool='tools/art/creatures2/chili.py',
            notes="LUNGING five-petal Capsicum flower and comma-shaped green pod; COILED red shoulder and flame-hook tail. Lime calyx across the family; directional leaf planes and one connected glossy pod specular. Intro: flower neck/lead leaf thrust, then pod tail whips up and recoils, with a clustered ember on the adult. Sport: Capsicum annuum 'Black Pearl', purple flowers, near-black purple foliage and immature pods; fruit normally ripens red (the adult recolour evokes the cultivar's immature black-fruit phase). No faces.")
if __name__=='__main__': build()
