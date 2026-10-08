"""Synthetic inventories and pixels only; runs on CI without the private pack."""
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from limezu.portraits import HERE, resolve_layers, cards, options


class PortraitTests(unittest.TestCase):
    def test_every_trainer_against_fixture_inventory(self):
        chars = json.loads((HERE/'mapping/characters.json').read_text())['characters']
        trainers = json.loads((HERE.parents[2]/'public/art/sets/portraits/set.json').read_text())['images']
        # Independent fixture table for the used Character Generator numbering.
        inventory = {f'Skins_48x48/PG_Skin_48x48_{n}.png' for n in range(1,10)}
        inventory |= {f'Eyes_48x48/PG_Eyes_48x48_{n:02}.png' for n in range(1,8)}
        inventory |= {f'Hairstyles_48x48/PG_Hairstyle_{s:02}_48x48_{v}.png' for s in range(1,29) for v in range(1,8)}
        accessories = {'04_Snapback': 2, '06_Policeman_Hat': 1, '07_Bataclava': 3, '11_Beanie': 3,
                       '12_Mustache': 5, '15_Glasses': 1, '16_Monocle': 1}
        inventory |= {f'Accessories_48x48/PG_Accessory_{name}_48x48_{v}.png' for name, count in accessories.items() for v in range(1,count+1)}
        for key in trainers:
            character = 'player' if key == 'player_back' else key
            with self.subTest(key=key):
                layers = resolve_layers(chars[character], inventory)
                self.assertTrue(all(p in inventory for p in layers))
                self.assertNotIn('_Small', ''.join(layers))
                self.assertEqual(len(layers), 3 if character == 'beekeeper' or not chars[character]['accessory'] else 4)
        self.assertEqual(resolve_layers(chars['beekeeper'], inventory)[-1], 'Hairstyles_48x48/PG_Hairstyle_12_48x48_1.png')
        self.assertEqual(resolve_layers(chars['fennimore'], inventory)[-1], 'Accessories_48x48/PG_Accessory_15_Glasses_48x48_1.png')
        for number, name in [(2,'Bee'), (3,'Backpack'), (14,'Gloves'), (18,'Chef')]:
            self.assertEqual(len(resolve_layers({**chars['player'], 'accessory': f'Accessory_{number:02}_{name}_01.png'}, inventory)), 3)
        with self.assertRaisesRegex(ValueError, 'unresolved portrait layer'):
            resolve_layers(chars['player'], set())
        with self.assertRaisesRegex(ValueError, 'unresolved portrait layer'):
            resolve_layers({**chars['player'], 'accessory': 'Accessory_99_Unknown_03.png'}, inventory)

    def test_native_pixels_and_shared_blink_anchor(self):
        from PIL import Image
        slot = Image.new('RGBA', (8,8), (70,60,50,255))
        slot.paste((20,20,20,255), (0,0,8,2))
        slot.paste((20,20,20,255), (0,6,8,8))
        heads = [Image.new('RGBA',(96,96)) for _ in range(2)]
        for head in heads:
            head.paste((200,100,50,255),(25,30,65,65))
        heads[1].putpixel((30,40),(1,2,3,255))
        out = cards(heads,slot,56,options())
        self.assertEqual(out.size,(112,56))
        # 40px-wide head at x=8, chin 4px above the 2px inner bottom cap.
        self.assertEqual(out.getpixel((8,49)),(200,100,50,255))
        self.assertEqual(out.getpixel((8,50)),(70,60,50,255))
        self.assertEqual(out.getpixel((56+13,25)),(1,2,3,255))
        self.assertEqual(out.crop((0,0,56,56)).getbbox(),(0,0,56,56))


if __name__ == '__main__':
    unittest.main()
