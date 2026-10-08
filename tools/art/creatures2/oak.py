"""English oak: BRACED acorn and shield sapling, LOOMING bough fighter.
Original 64px geometry; the cap's staggered cupule scales unify the line.
"""
from kit2 import *

IDS=['oak_acorn','oak_sapling','great_oak']
LEAF=['#344944','#52674b','#7b9259','#b2b978']
BARK=['#533f49','#795548','#a67850','#c8a273']
NUT=['#76533f','#a37b4c','#c6a269','#dec38e']
ROOT=['#8d8571','#c4bc99','#e8dbb6']
GOLD=['#66533f','#9a823e','#c4b15b','#e3d18d']
SPORT=dict(zip(LEAF,GOLD)) | dict(zip(NUT,['#77603d','#a18b4c','#c8b46e','#e1d399']))


def cap(im,x,y,w,h,peek=0):
    # Back-right hinge stays planted; the brim lifts on the left, then snaps.
    p=[(x,y+h*.65-peek),(x+w*.12,y+h*.18-peek),(x+w*.42,y-peek*.6),
       (x+w*.78,y+h*.08),(x+w,y+h*.48),(x+w*.93,y+h*.77),
       (x+w*.34,y+h+2-peek),(x-w*.06,y+h-peek)]
    shaped(im,p,BARK)
    scale_texture(im,(x,y-peek,x+w,y+h),BARK)
    stem(im,[(x-1,y+h-peek),(x+w*.35,y+h+1-peek),(x+w*.93,y+h*.76)],BARK[0],2)
    tapered(im,[(x+w*.58,y+2),(x+w*.61,y-5),(x+w*.79,y-5)],[3,3,2],BARK)


def acorn(f=0):
    im=canvas(); peek=(0,1,3,-1)[f]
    shaped(im,[(32,48),(26,55),(18,59),(18,62),(25,62),(35,55)],ROOT)
    shaped(im,[(38,48),(40,55),(47,58),(49,62),(41,62),(33,56)],ROOT)
    shaped(im,[(23,27),(39,25),(46,33),(49,42),(46,51),(37,57),(27,54),(20,46),(18,36)],NUT)
    cap(im,15,23,31,16,peek)
    stem(im,[(24,39),(26,43),(28,44)],NUT[-1],2)
    return clean_clusters(im)


def sapling(f=0):
    im=canvas(); peek=(0,2,4,-1)[f]
    lobed_leaf(im,(40,38),(54,14),19,LEAF)
    tapered(im,[(34,56),(40,45),(28,32),(28,23)],[12,12,9,8],BARK)
    shaped(im,[(33,52),(29,58),(20,61),(19,62),(30,62),(37,59),(47,62),(53,62),(46,57),(41,50)],BARK,texture=True)
    tapered(im,[(34,38),(23,40),(17,35)],[5,5,3],BARK)
    cap(im,21,16,28,15,peek)
    lobed_leaf(im,(28,45),(10,24),22,LEAF)
    lobed_leaf(im,(44,49),(55,39),15,LEAF)
    return clean_clusters(im)


def great(f=0):
    im=canvas(); peek=(0,2,4,-1)[f]
    # Thick C-trunk, roots and an extended lead bough, never a straight pole.
    shaped(im,[(37,25),(48,26),(43,42),(44,54),(51,59),(60,62),(47,63),(39,59),(29,63),(20,63),(30,56),(33,43)],BARK,texture=True)
    tapered(im,[(37,39),(25,32),(10,39),(8,44)],[9,8,7,6],BARK)
    tapered(im,[(40,35),(53,36),(58,29)],[6,5,3],BARK)
    # A lobed canopy with coherent leaf planes, offset over the foe.
    tapered(im,[(40,34),(35,21),(17,14)],[8,8,5],BARK)
    tapered(im,[(39,29),(51,16),(58,14)],[7,6,4],BARK)
    for base,tip,width in [((29,20),(15,6),15),((40,19),(42,0),14),((49,25),(61,10),14),((25,27),(3,17),13),((41,27),(33,10),14)]:
        lobed_leaf(im,base,tip,width,LEAF)
    shaped(im,[(7,44),(16,44),(19,49),(15,55),(11,57),(7,54),(5,49)],NUT)
    cap(im,7,38,15,8,peek)
    stem(im,[(35,43),(34,50),(37,56)],BARK[0],2)
    return clean_clusters(im)


def back(stage):
    im=canvas()
    if stage==0:
        shaped(im,[(14,39),(48,38),(55,64),(9,64)],NUT)
        cap(im,8,17,48,28)
        # Cup seen from above: broad scaled dome, no front brim peek.
    elif stage==1:
        lobed_leaf(im,(30,54),(8,31),30,LEAF)
        shaped(im,[(23,64),(24,49),(34,35),(47,34),(38,53),(40,64)],BARK,texture=True)
        lobed_leaf(im,(38,50),(59,25),32,LEAF)
        cap(im,14,12,42,24)
    else:
        shaped(im,[(16,64),(20,43),(33,25),(47,28),(42,50),(52,64)],BARK,texture=True)
        shaped(im,[(2,21),(8,10),(22,5),(37,9),(49,6),(62,14),(63,31),(54,45),(34,45),(20,38),(4,40)],LEAF)
        for base,tip,width in [((23,31),(7,13),31),((34,28),(32,5),28),((41,35),(57,13),32),((29,41),(13,27),29)]:
            lobed_leaf(im,base,tip,width,LEAF)
        stem(im,[(15,10),(24,10)],LEAF[1],2)
        shaped(im,[(43,42),(57,40),(61,50),(55,59),(45,55)],NUT)
        cap(im,41,38,20,11)
    return clean_clusters(im)


def icon(stage):
    im=canvas(32)
    if stage==0:
        shaped(im,[(14,25),(10,29),(7,30),(14,30),(17,27),(22,30),(26,30),(21,25)],ROOT)
        oval(im,(11,13,25,27),NUT); cap(im,8,8,17,9)
    elif stage==1:
        tapered(im,[(17,29),(20,23),(16,14)],[5,5,3],BARK)
        lobed_leaf(im,(19,23),(28,12),12,LEAF)
        cap(im,12,8,16,9)
        lobed_leaf(im,(16,25),(5,16),15,LEAF)
        stem(im,[(16,27),(11,30),(23,30)],BARK[1],3)
    else:
        shaped(im,[(14,15),(23,15),(21,26),(27,30),(19,30),(16,27),(10,30),(7,30),(13,24)],BARK)
        shaped(im,[(2,10),(8,3),(17,2),(24,4),(30,11),(28,18),(18,19),(8,17),(2,19)],LEAF)
        lobed_leaf(im,(18,17),(7,5),17,LEAF); lobed_leaf(im,(23,18),(27,5),15,LEAF)
        oval(im,(3,20,12,28),NUT); cap(im,2,17,12,6)
    return clean_clusters(im)


def build():
    for stage,(id_,draw) in enumerate(zip(IDS,[acorn,sapling,great])):
        i=icon(stage); fronts=[draw(f) for f in range(4)]; b=back(stage)
        colours={'#%02x%02x%02x'%tuple(p[:3]) for a in fronts+[b,i] for p in np.asarray(a).reshape(-1,4) if p[3]}
        write_species2(id_,front=fronts,back=[b],icon=[i,icon_hop(i)],
            anim={'intro':[[0,8],[1,8],[2,14],[1,6],[3,8],[0,8]]},
            sport={k:v for k,v in SPORT.items() if k in colours},
            moving=[[0,0,55,45] if stage<2 else [0,27,28,52]],
            tool='tools/art/creatures2/oak.py',
            notes="BRACED cap-helmet acorn/shield sapling; LOOMING bough adult. English-oak lobes, staggered cupule scales, clustered warm bark, pale radicle feet. Cap lifts about its rear hinge then snaps below rest; the trunk and roots stay registered. Sport: Quercus robur 'Concordia', gold-green nut and butter-yellow leaves; bark and outline stay warm. No faces; the brim is an organ overlap, with no eye marks underneath. QA note: the sapling/adult reach 15 silhouette tips (one above the generic limit), all from deliberately paired English-oak lobes, not loose pixels.")

if __name__=='__main__': build()
