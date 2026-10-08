"""R5b material helpers and the complete original starter bundle contracts."""
import json
import unittest
import numpy as np
from PIL import Image
from creatures2 import kit2 as K
import checks2 as C
from checks import components

IDS=['oak_acorn','oak_sapling','great_oak','chili_blossom','green_chili',
     'red_chili','lily_seedpod','lily_pad','giant_water_lily']


class StarterMaterialTests(unittest.TestCase):
    def test_lobes_mid_rib_and_scales_preserve_named_materials(self):
        ramp=K.material_ramp('#819c60')
        leaf=K.canvas();K.lobed_leaf(leaf,(38,60),(18,15),25,ramp)
        a=np.asarray(leaf);colour_set={tuple(c) for c in a[a[...,3]>0][:,:3]}
        self.assertTrue(colour_set <= {K.rgb_of(c) for c in ramp+[K.OUTLINE]})
        self.assertGreater((a[...,3]>0).sum(),300)
        # The midrib runs through the blade in its own shadow material.
        self.assertEqual(leaf.getpixel((28,38))[:3],K.rgb_of(ramp[0]))
        cap=K.canvas();K.oval(cap,(10,20,52,48),ramp)
        before=np.asarray(cap).copy();K.scale_texture(cap,(10,20,52,48),ramp)
        after=np.asarray(cap)
        changed=(before!=after).any(axis=2)
        self.assertGreater(changed.sum(),20)
        np.testing.assert_array_equal(before[...,3],after[...,3])
        self.assertFalse((changed & (before[...,3]==0)).any())
        # Texture cannot overwrite unrelated material (the exterior ink).
        exterior=(before[...,:3]==K.rgb_of(K.OUTLINE)).all(axis=2)
        self.assertFalse((changed & exterior).any())

    def test_specular_is_a_connected_cluster_and_singletons_merge(self):
        image=K.canvas();K.specular(image,[(14,20),(14,30),(21,35)],width=2)
        comps=list(components(np.asarray(image)[...,3]>0))
        self.assertEqual(len(comps),1)
        self.assertGreater(len(comps[0]),20)
        self.assertRaises(ValueError,K.specular,image,[(1,1),(2,2)],width=1)
        image=K.canvas();K.polygon(image,[(10,10),(30,10),(30,30),(10,30)],'#839c73')
        image.putpixel((20,20),(244,240,230,255))
        cleaned=K.clean_clusters(image)
        self.assertEqual(cleaned.getpixel((20,20)),(131,156,115,255))
        np.testing.assert_array_equal(np.asarray(image)[...,3],np.asarray(cleaned)[...,3])

    def test_form_bands_are_curved_connected_and_keep_binary_alpha(self):
        ramp=K.material_ramp('#819c60')
        mask=K.canvas();K.ellipse(mask,(10,10,54,56),'#ffffff')
        for kind,axis in [('sphere',None),('cylinder',[(32,56),(32,10)]),('leaf',[(32,56),(32,10)])]:
            with self.subTest(kind=kind):
                shaded=np.asarray(K.shade_form(mask,ramp,kind,axis=axis))
                np.testing.assert_array_equal(shaded[...,3],np.asarray(mask)[...,3])
                colours=np.unique(shaded[shaded[...,3]>0][:,:3],axis=0)
                self.assertEqual(len(colours),4)
                for colour in colours:
                    band=(shaded[...,:3]==colour).all(axis=2)&(shaded[...,3]>0)
                    self.assertTrue(all(len(c)>1 for c in components(band)))
        sphere=K.shade_form(mask,ramp)
        self.assertEqual(sphere.getpixel((24,23))[:3],K.rgb_of(ramp[-1]))
        # A reflected rim is one tone above the adjacent core shadow.
        self.assertEqual(sphere.getpixel((51,45))[:3],K.rgb_of(ramp[1]))
        self.assertRaises(ValueError,K.shade_form,mask,ramp,'unknown')

    def test_face_risk_checks_back_and_icon_views(self):
        for view,size in [('back',64),('icon',32)]:
            arrays={key:[np.full((s,s,4),(131,156,115,255),np.uint8)]
                    for key,s in [('front',64),('back',64),('icon',32)]}
            arrays['front'].append(arrays['front'][0].copy())
            arrays['icon'].append(arrays['icon'][0].copy())
            a=arrays[view][0];xy=size//2
            a[xy,xy]=(42,34,48,255);a[xy-1,xy]=(244,240,230,255)
            js={'format':'verdant.species/2','size':{'front':64,'back':64,'icon':32},
                'sport':{},'frames':{'front':['front.png','front__2.png'],'back':['back.png'],'icon':['icon.png','icon__2.png']},
                'anim':{'intro':[[0,20],[1,20],[0,12]]},'moving':[[0,0,64,64]]}
            checks=C.check_species('fixture',{'js':js,'imgs':arrays,'meta':{'class':'adult','line':'fixture','stage':1}}, {},[])
            self.assertEqual(checks['face_risk']['status'],'FAIL')
            self.assertIn(view,{hit['view'] for hit in checks['face_risk']['coordinates']})

    def test_starter_size_animation_palette_sports_and_clusters(self):
        for n,id_ in enumerate(IDS):
            with self.subTest(species=id_):
                folder=K.ART/'species'/id_;js=json.loads((folder/'species.json').read_text())
                self.assertEqual(js['format'],'verdant.species/2')
                self.assertEqual(len(js['frames']['front']),4)
                palette={K.rgb_of(c) for c in js['palette']}
                self.assertLessEqual(len(palette),16)
                self.assertNotIn(K.OUTLINE,js['sport'])
                self.assertNotIn('#f4f0e6',js['sport'])
                self.assertTrue(set(js['sport'])<=set(js['palette']))
                fronts=[]
                for view,names in js['frames'].items():
                    for name in names:
                        a=np.asarray(Image.open(folder/name).convert('RGBA'))
                        self.assertEqual(a.shape[:2],(32,32) if view=='icon' else (64,64))
                        self.assertEqual(C.face_risk(C.indexes(a),scale=a.shape[0]/56)['status'],'PASS',name)
                        self.assertTrue({tuple(c) for c in a[a[...,3]>0][:,:3]}<=palette)
                        self.assertTrue(set(np.unique(a[...,3]))<={0,255})
                        for colour in np.unique(a[a[...,3]>0][:,:3],axis=0):
                            mask=(a[...,:3]==colour).all(axis=2)&(a[...,3]>0)
                            self.assertTrue(all(len(c)>=2 for c in components(mask,diagonal=True)),name)
                        if view=='front':
                            fronts.append(C.indexes(a))
                            self.assertEqual(C.size_class(fronts[-1],['baby','teen','adult'][n%3])['status'],'PASS',name)
                            self.assertIn(C.geometry(fronts[-1])['bottom'],[61,62,63])
                        elif view=='back':
                            self.assertGreaterEqual((a[...,3]>0).mean(),.45)
                            self.assertLessEqual((a[...,3]>0).mean(),.75)
                            self.assertTrue((a[-1,:,3]>0).any())
                intro=js['anim']['intro']
                self.assertEqual(sum(t for _,t in intro),52)
                self.assertEqual(intro[-1][0],0)
                # Signature motion changes the silhouette, not just highlight colour.
                self.assertGreater(int(((fronts[0]==255)!=(fronts[2]==255)).sum()),0)
                # A key silhouette must move at least three native pixels.
                from scipy.ndimage import distance_transform_edt
                base=fronts[0]!=255; key=fronts[2]!=255
                displacement=max(distance_transform_edt(~base)[key].max(),distance_transform_edt(~key)[base].max())
                self.assertGreaterEqual(displacement,3,id_)
                old=K.ART/'packs/crystal/species'/id_/'species.json'
                self.assertEqual(json.loads(old.read_text())['format'],'verdant.species/1')

if __name__=='__main__':unittest.main()
