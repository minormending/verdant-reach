"""Synthetic fixtures only: no new creature art and no licensed pixels."""
import colorsys
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
from PIL import Image
import qa
import checks2 as C
from creatures2 import kit2
from artkit.bundles import load
from artkit.core import ART
from artkit.resolve import Resolver
from artkit.validate import validate


class Creatures2Tests(unittest.TestCase):
    def fixture(self):
        a = np.zeros((64,64,4),np.uint8)
        a[20:63,12:60] = (80,144,86,255)
        b = a.copy(); b[20:24,12:32] = (156,193,126,255)
        back = a.copy()
        icon = a[::2,::2].copy()
        js = {'format':'verdant.species/2','size':{'front':64,'back':64,'icon':32},
              'sport':{'#509056':'#907050'}, 'frames':{'front':['front.png','front__2.png'],
              'back':['back.png'],'icon':['icon.png','icon__2.png']},
              'anim':{'intro':[[0,18],[1,18],[0,1]]},'moving':[[12,20,32,24]]}
        return js, {'front':[a,b],'back':[back],'icon':[icon,icon.copy()]}

    def checks(self, js=None, imgs=None):
        default_js,default_imgs = self.fixture()
        entry = {'js':js or default_js,'imgs':imgs or default_imgs,'meta':{'line':'test','stage':1,'class':'teen'}}
        with patch.object(C,'local_palette',return_value=None):
            return qa.check_species('fixture',{'fixture':entry},[])

    def test_ramps_have_monotonic_value_and_directional_hue_shift(self):
        for tones in (3,4):
            ramp = kit2.material_ramp('#509056',tones)
            hsv = [colorsys.rgb_to_hsv(*(c/255 for c in kit2.rgb_of(h))) for h in ramp]
            self.assertEqual(len(ramp),tones)
            self.assertEqual(sorted(v for _,_,v in hsv),[v for _,_,v in hsv])
            self.assertGreater(hsv[0][0],hsv[-2][0]) # green shadow toward blue
            self.assertLess(hsv[-1][0],hsv[-2][0])  # highlight toward yellow
            self.assertGreater(hsv[0][1],hsv[-2][1])
        self.assertRaises(ValueError,kit2.material_ramp,'#509056',2)

    def test_outline_selout_lighting_and_texture_are_deterministic(self):
        a = kit2.canvas(); kit2.ellipse(a,(12,20,58,62),'#509056')
        ramp = kit2.material_ramp('#509056')
        lit = kit2.light_top_left(a,ramp)
        self.assertGreater(sum(lit.getpixel((25,30))[:3]),sum(lit.getpixel((45,50))[:3]))
        outlined = kit2.outline_pass(lit,sel_out={ramp[-1]:ramp[1]})
        self.assertEqual(C.outline(np.asarray(outlined))['status'],'PASS')
        self.assertIn(tuple(kit2.rgb_of(kit2.OUTLINE)),{tuple(c[:3]) for c in np.asarray(outlined).reshape(-1,4)})
        self.assertTrue(np.array_equal(kit2.clustered_texture(lit,ramp[0],seed=42),kit2.clustered_texture(lit,ramp[0],seed=42)))
        self.assertRaises(ValueError,kit2.clustered_texture,lit,ramp[0],cluster=1)

    def test_v2_detection_geometry_signature_and_missing_local_palette(self):
        checks = self.checks()
        self.assertNotIn('crystal',checks)
        for key in ('bundle','colours','outline','grounding','anim_signature'):
            self.assertEqual(checks[key]['status'],'PASS',key)
        self.assertEqual(checks['palette_harmony']['level'],'info')
        self.assertIn('SKIP',checks['palette_harmony']['value'])

    def test_each_size_class_and_adult_edges(self):
        for cls,width,height in [('baby',46,26),('teen',54,30),('adult',64,30)]:
            a = np.full((64,64),255,np.uint8); a[64-height:64,:width] = 2
            self.assertEqual(C.size_class(a,cls)['status'],'PASS')
        a = np.full((64,64),255,np.uint8); a[1:63,10:40]=2
        self.assertEqual(C.size_class(a,'adult')['status'],'FAIL')

    def test_colour_union_alpha_dimensions_grounding_and_black_outline(self):
        js,imgs = self.fixture()
        for n in range(17):
            imgs['front'][0][22,n+20] = (n,80,80,255)
        imgs['front'][0][20,12] = (0,0,0,255)
        imgs['front'][1][22,20,3]=128
        imgs['front'][1][63,20]=(80,144,86,255)
        imgs['back'][0]=imgs['back'][0][:48,:48]
        checks = self.checks(js,imgs)
        self.assertEqual(checks['colours']['status'],'FAIL')
        self.assertEqual(checks['bundle']['status'],'FAIL')
        self.assertEqual(checks['outline']['status'],'FAIL')
        imgs['front']=[a[:61] for a in imgs['front']]
        self.assertEqual(self.checks(js,imgs)['grounding']['status'],'FAIL')

    def test_face_in_single_frame_and_anim_validation(self):
        js,imgs = self.fixture()
        imgs['front'][1][35,35]=(30,24,30,255)
        imgs['front'][1][34,35]=(244,240,230,255)
        checks = self.checks(js,imgs)
        self.assertEqual(checks['face_risk']['status'],'FAIL')
        self.assertEqual(checks['face_risk']['coordinates'][0]['frame'],1)
        js['anim']['intro']=[[8,40],[0,1]]
        self.assertEqual(self.checks(js,imgs)['animation']['status'],'FAIL')

    def test_noise_and_clones_on_64_canvas(self):
        js,imgs = self.fixture()
        a=imgs['front'][0]
        for x in range(14,56,2):
            a[19,x]=(80,144,86,255)
        self.assertEqual(self.checks(js,imgs)['silhouette_noise']['status'],'WARN')
        entry={'js':js,'imgs':imgs,'meta':{'line':'test','stage':1,'class':'teen'}}
        with patch.object(C,'local_palette',return_value=None):
            checks=qa.check_species('fixture',{'fixture':entry},[('other','other',C.hashes(a))])
        self.assertEqual(checks['clone_risk']['status'],'WARN')

    def test_local_palette_lookup_and_oklab_harmony(self):
        np.testing.assert_allclose(C.oklab([[255,255,255]])[0],[1,0,0],atol=1e-6)
        reference=np.array([[80,144,86],[42,34,48]],np.uint8)
        self.assertEqual(C.palette_harmony(reference,reference)['status'],'PASS')
        self.assertEqual(C.palette_harmony([[0,255,0]],reference)['status'],'WARN')
        with tempfile.TemporaryDirectory() as temp, patch.dict('os.environ',{},clear=True):
            root=Path(temp); config=root/'tools/art/limezu'; config.mkdir(parents=True)
            exterior=root/'local-exteriors'; exterior.mkdir()
            Image.new('RGBA',(1,1),(80,144,86,255)).save(exterior/'Palette.png')
            (config/'local.json').write_text(json.dumps({'exteriors':str(exterior)}))
            np.testing.assert_array_equal(C.local_palette(root),[[80,144,86]])
            with patch.dict('os.environ',{'LIMEZU_EXTERIORS':str(root/'absent')}):
                self.assertIsNone(C.local_palette(root))

    def test_crystal_regeneration_preserves_generated_v2_bundles(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); folder=root/'fixture'; folder.mkdir()
            path=folder/'species.json'
            content=json.dumps({'format':'verdant.species/2','source':{'kind':'generated'}})
            path.write_text(content)
            with patch.object(qa.kit,'SPECIES_DIR',root):
                self.assertEqual(qa.kit.write_species('fixture',palette=[],sport=[],front=[],back=[],icon=[],anim={},notes='',tool='synthetic'),[])
            self.assertEqual(path.read_text(),content)

    def test_v1_over_v2_uses_crystal_snapshot_and_remaps_inherited_icons(self):
        resolver=Resolver(ART,packs=['traced'])
        bundle=resolver.bundle('species','oak_acorn')
        crystal=load('species','oak_acorn',ART,['crystal'])
        self.assertEqual(bundle.data['format'],'verdant.species/1')
        self.assertIsNone(bundle.data['anim'])  # explicit traced null disables the intro
        self.assertIn('packs/traced/',str(bundle.file('front.png')))
        self.assertIn('packs/crystal/',str(bundle.file('icon.png')))
        self.assertEqual(resolver.image('assets/species/oak_acorn/front.png').shape,(56,56,4))
        self.assertEqual(resolver.image('assets/species/oak_acorn/icon.png').shape,(16,16,4))
        source=crystal.frame('icon')
        expected=source.copy()
        for old,new in zip(crystal.data['palette'],bundle.data['palette']):
            mask=(source[...,:3]==kit2.rgb_of(old)).all(axis=2)&(source[...,3]>0)
            expected[mask,:3]=kit2.rgb_of(new)
        np.testing.assert_array_equal(bundle.frame('icon'),expected)
        self.assertEqual(load('species','oak_acorn').frame('icon').shape,(32,32,4))
        self.assertEqual(crystal.frame('icon').shape,(16,16,4))

    def test_missing_same_format_snapshot_requires_complete_override(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); js,imgs=self.fixture()
            kit2.write_species2('fixture',front=imgs['front'],back=imgs['back'],icon=imgs['icon'],
                                anim=js['anim'],sport=js['sport'],root=root)
            folder=root/'packs/traced/species/fixture';folder.mkdir(parents=True)
            palette=['#181818','#204020','#509056','#f8f8f8']
            meta={'format':'verdant.species/1','palette':palette,'sport':palette}
            (folder/'species.json').write_text(json.dumps(meta))
            (root/'packs/traced/pack.json').write_text(json.dumps({'format':'verdant.pack/1','id':'traced'}))
            errors=[p[2] for p in validate(root,coverage=False) if p[0]=='error']
            self.assertTrue(any('frames.icon' in e for e in errors))
            self.assertNotIn('frames',load('species','fixture',root,['traced']).data)
            meta['frames']={'front':['front.png'],'back':['back.png'],'icon':['icon.png']}
            for name,size in [('front',56),('back',48),('icon',16)]:
                Image.new('RGBA',(size,size),(80,144,86,255)).save(folder/(name+'.png'))
            (folder/'species.json').write_text(json.dumps(meta))
            self.assertEqual([p for p in validate(root,coverage=False) if p[0]=='error'],[])
            # Missing metadata, unlike explicit null, inherits from the snapshot.
            snapshot=root/'packs/crystal/species/fixture'; snapshot.mkdir(parents=True)
            (snapshot/'species.json').write_text(json.dumps({**meta,'anim':{'intro':[[0,52]]}}))
            for name in ('front','back','icon'):
                (snapshot/(name+'.png')).write_bytes((folder/(name+'.png')).read_bytes())
            (folder/'species.json').write_text(json.dumps({'format':'verdant.species/1'}))
            inherited=load('species','fixture',root,['traced'])
            self.assertEqual(inherited.data['anim'],{'intro':[[0,52]]})
            self.assertEqual(inherited.data['palette'],palette)

    def test_writer_roundtrip_sport_determinism_and_locks(self):
        js,imgs=self.fixture()
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            args=dict(front=imgs['front'],back=imgs['back'],icon=imgs['icon'],anim=js['anim'],sport=js['sport'],moving=js['moving'],root=root)
            self.assertTrue(kit2.write_species2('fixture',**args))
            before={p.name:p.read_bytes() for p in (root/'species/fixture').iterdir()}
            self.assertTrue(kit2.write_species2('fixture',**args))
            self.assertEqual(before,{p.name:p.read_bytes() for p in (root/'species/fixture').iterdir()})
            self.assertEqual([p for p in validate(root,coverage=False) if p[0]=='error'],[])
            bundle=load('species','fixture',root)
            self.assertEqual(tuple(bundle.frame('front',sport=True)[30,30]),(144,112,80,255))
            meta=root/'species/fixture/species.json'
            data=json.loads(meta.read_text()); data.pop('palette'); data['source']={'kind':'edited'}; meta.write_text(json.dumps(data))
            self.assertEqual([p for p in validate(root,coverage=False) if p[0]=='error'],[])
            self.assertFalse(kit2.write_species2('fixture',**args))
            self.assertEqual(json.loads(meta.read_text())['source']['kind'],'edited')


if __name__=='__main__':
    unittest.main()
