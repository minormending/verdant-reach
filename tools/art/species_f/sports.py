"""Real-sport palettes for the 53 Round 1-3 species (Round 4, Part B).

Each sport is a real horticultural sport, cultivar or natural colour form of
the plant (or, where the plant has none in cultivation, the nearest real
form of a close relative, named as such). Slot i of `sport` replaces slot i
of `palette` pixel for pixel (ART.md section 3), so each entry is written
against what that species' slots *do* (e.g. the oak's dark is bark + cap,
the holly's mid is the berries), and keeps the original light/dark structure
so the form still reads in battle.

  python tools/art/species_f/sports.py            check + review sheet only
  python tools/art/species_f/sports.py --write    also set `sport` and `notes`
                                                  in each species.json

Only the `sport` and `notes` fields are touched; pixels and `source` are not.
The table is mirrored in docs/SPORTS.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from artkit import bundles as B  # noqa: E402
from artkit.core import load_json, save_json  # noqa: E402

ART = HERE.parents[2] / "public" / "art" / "species"
K = "#181818"

# line -> (sport name, what it is / reference)
LINES = {
    "oak": ("'Concordia' golden oak", "Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns."),
    "chili": ("'Black Pearl'", "Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers."),
    "lily": ("'Chromatella' yellow water lily", "Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads."),
    "dandelion": ("pink dandelion", "Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips."),
    "bramble": ("'Fall Gold' golden-fruited", "Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes."),
    "sunflower": ("'Italian White'", "Helianthus annuus 'Italian White': cream-white rays round a near-black disc."),
    "pumpkin": ("'Jarrahdale' blue pumpkin", "Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines."),
    "fern": ("painted fern", "silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004)."),
    "flytrap": ("'Akai Ryu' (Red Dragon)", "Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles."),
    "sundew": ("'Alba'", "Drosera capensis 'Alba': the anthocyanin-free form, green tentacles with clear dew and white flowers."),
    "maple": ("'Crimson King'", "Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season."),
    "nettle": ("silver-leaved", "silver-washed leaves on violet stems, after the dead-nettle Lamium maculatum 'Beacon Silver' (the nettle's look-alike)."),
    "moonflower": ("lilac moonflower", "the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin."),
    "clover": ("'Purpurascens Quadrifolium'", "Trifolium repens 'Purpurascens Quadrifolium': burgundy-purple four-leaf clover, white heads."),
    "cattail": ("'Variegata'", "Typha latifolia 'Variegata': cream-striped blades, a rusty spike."),
    "foxglove": ("'Alba' white foxglove", "Digitalis purpurea f. albiflora ('Alba'): white bells with dusky spots."),
    "holly": ("'Bacciflava' yellow-berried holly", "Ilex aquifolium 'Bacciflava' (known since the 18th century): golden-yellow berries."),
    "mint": ("'Chocolate' mint", "Mentha x piperita f. citrata 'Chocolate': brown-purple stems and leaves, cocoa-dark veins."),
    "rose": ("'Persian Yellow'", "Rosa foetida 'Persiana' (brought to Europe 1837): deep yellow blooms and hips over dark leaves."),
    "pitcher": ("green form (anthocyanin-free)", "the anthocyanin-free green form of the pitcher plant, as in Sarracenia purpurea f. heterophylla: all chartreuse, no red veins."),
    "snapdragon": ("'Rocket Lemon'", "Antirrhinum majus Rocket Series 'Rocket Lemon': lemon-yellow spikes, dark green foliage."),
}

# species -> (line, (dark, mid, light)); slot 0 stays #181818
SPORTS = {
    # oak: dark = cap / bark / leaf shade, mid = nut / leaf, light = glint
    "oak_acorn": ("oak", ("#585018", "#b8b040", "#f0f0b0")),
    "oak_sapling": ("oak", ("#584018", "#d0b828", "#f8f0a0")),
    "great_oak": ("oak", ("#483818", "#c8b030", "#f8f098")),
    # chili: blossom dark/mid = leaves, light = petals; pods mid = skin, light = calyx + glint
    "chili_blossom": ("chili", ("#302040", "#686078", "#d0b0f0")),
    "green_chili": ("chili", ("#402848", "#706080", "#c8b8e8")),
    "red_chili": ("chili", ("#301838", "#584868", "#c8a8e0")),
    # lily: seedpod wine/rose/cream; pad wine rim + bud / green pad; bloom green / pink petals / white
    "lily_seedpod": ("lily", ("#604018", "#c09038", "#f8e8a8")),
    "lily_pad": ("lily", ("#684018", "#98a038", "#e8f0a0")),
    "giant_water_lily": ("lily", ("#385020", "#e8c040", "#f8f8d0")),
    # dandelion: bud green / green / yellow tip; flower olive / yellow / cream; clock green / grey / white
    "dandelion_bud": ("dandelion", ("#305838", "#68a840", "#f0a0c0")),
    "dandelion": ("dandelion", ("#405028", "#e888b0", "#f8d8e0")),
    "dandelion_clock": ("dandelion", ("#305838", "#d098b8", "#f8f0f0")),
    # bramble: blossom plum / pink / white; berry wine / red / peach; blackberry fruit+cane / leaf / glint
    "bramble_blossom": ("bramble", ("#486038", "#d0c8b8", "#f8f8f0")),
    "bramble_berry": ("bramble", ("#985818", "#e8b030", "#f8f0b0")),
    "blackberry": ("bramble", ("#805018", "#88a838", "#f8e8a0")),
    # sunflower: rays and glints live in the light slot, the disc in the dark
    "sunflower_seedling": ("sunflower", ("#384828", "#a0b850", "#f8f0d0")),
    "sunflower_bud": ("sunflower", ("#284838", "#68a848", "#f8f0c8")),
    "sunflower": ("sunflower", ("#402028", "#589840", "#f8f0c8")),
    # pumpkin: blossom green / orange / yellow; green pumpkin shade / skin / glint; pumpkin rust / orange / cream
    "pumpkin_blossom": ("pumpkin", ("#306058", "#f0c030", "#f8f8c0")),
    "green_pumpkin": ("pumpkin", ("#284848", "#689888", "#d0e8d0")),
    "pumpkin": ("pumpkin", ("#405060", "#8898a8", "#e0e8e0")),
    # fern: blue-green shade / frond / lime glint
    "fern_fiddlehead": ("fern", ("#602848", "#98a8a0", "#e0e8e8")),
    "unfurling_fern": ("fern", ("#602848", "#98a8a0", "#e0e8e8")),
    "ostrich_fern": ("fern", ("#602848", "#98a8a0", "#e0e8e8")),
    # flytrap: wine maw + shade / leaf / cilia + glint
    "flytrap_seedling": ("flytrap", ("#581828", "#c03038", "#f8a0a0")),
    "young_flytrap": ("flytrap", ("#581828", "#c03038", "#f8a0a0")),
    "venus_flytrap": ("flytrap", ("#581828", "#c03038", "#f8a0a0")),
    # sundew: crimson tentacles + shade / leaf / dew
    "sundew_rosette": ("sundew", ("#386830", "#a8d870", "#f8f8e8")),
    "sundew": ("sundew", ("#386830", "#a8d870", "#f8f8e8")),
    # maple: stems + shade / wing or leaf / light
    "maple_samara": ("maple", ("#481838", "#a84060", "#f0b0a8")),
    "maple_sapling": ("maple", ("#481838", "#a85070", "#f0b8b8")),
    "sugar_maple": ("maple", ("#401838", "#983868", "#e890a0")),
    # nettle: violet stem + shade / leaf / glint
    "nettle_sprout": ("nettle", ("#483858", "#a0b098", "#e8f0e8")),
    "stinging_nettle": ("nettle", ("#483858", "#a0b098", "#e8f0e8")),
    # moonflower: night violet / sage leaf + petal shade / moon-white
    "moonflower_seed": ("moonflower", ("#402858", "#9098b8", "#e8c8f0")),
    "moonflower_vine": ("moonflower", ("#402858", "#9098b8", "#e8c8f0")),
    "moonflower": ("moonflower", ("#402858", "#9098b8", "#e8c8f0")),
    # clover: shade / leaf / white head
    "clover_sprout": ("clover", ("#382838", "#985068", "#f0f0d8")),
    "white_clover": ("clover", ("#382838", "#985068", "#f0f0d8")),
    # cattail: slate shade / brown spike / lime blades
    "cattail_shoot": ("cattail", ("#283828", "#985830", "#f8f0d0")),
    "cattail": ("cattail", ("#283828", "#985830", "#f8f0d0")),
    # foxglove: indigo leaves + spots / grey-teal or magenta / pale
    "foxglove_rosette": ("foxglove", ("#485848", "#88a890", "#f8f8f0")),
    "foxglove": ("foxglove", ("#585070", "#d8d0c0", "#f8f8f0")),
    # holly: dark glossy leaf / berry / icy gloss
    "holly_seedling": ("holly", ("#285838", "#f0c030", "#f8f8f0")),
    "holly": ("holly", ("#285838", "#f0c030", "#f8f8f0")),
    # mint: cold teal / mint / frost
    "mint_sprig": ("mint", ("#382030", "#806050", "#e0d8b0")),
    "peppermint": ("mint", ("#382030", "#806050", "#e0d8b0")),
    # rose: leaf green / rose / cream
    "rose_bud": ("rose", ("#305838", "#f8c838", "#f8f0c8")),
    "wild_rose": ("rose", ("#305838", "#f8c838", "#f8f0c8")),
    # pitcher: plum veins / chartreuse / cream
    "pitcher_sprout": ("pitcher", ("#386838", "#c8d850", "#f8f8d8")),
    "pitcher_plant": ("pitcher", ("#386838", "#c8d850", "#f8f8d8")),
    # snapdragon: purple stem + leaf / pink bloom / yellow lip
    "snapdragon_sprout": ("snapdragon", ("#405828", "#e8c030", "#f8f8c8")),
    "snapdragon": ("snapdragon", ("#405828", "#e8c030", "#f8f8c8")),
}


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(h):
    r, g, b = rgb(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def check(sid, sport):
    """GBC-snapped, 4 distinct tones, and a greyscale ladder that still reads."""
    probs = []
    for h in sport:
        if any(c % 8 for c in rgb(h)):
            probs.append(f"{h} not a multiple of 8")
    if len(set(sport)) != 4:
        probs.append("repeated colour")
    L = [lum(h) for h in sport]
    if not (L[0] < L[1] < L[2] < L[3]):
        probs.append("not dark to light " + " ".join(f"{v:.2f}" for v in L))
    for a, b in ((1, 2), (2, 3)):
        if L[b] - L[a] < 0.15:
            probs.append(f"slots {a}/{b} only {L[b] - L[a]:.2f} apart in grey")
    return probs


def recolour(a, pal, sport):
    out = a.copy()
    for p, q in zip(pal, sport):
        m = (a[..., 3] > 0) & np.all(a[..., :3] == rgb(p), -1)
        out[m, :3] = rgb(q)
    return out


def sheet(path):
    ids = list(SPORTS)
    z, cw, ch = 2, 2 * (56 * 2 + 48 * 2 + 16 * 2 + 16) + 24, 56 * 2 + 18
    cols = 2
    s = Image.new("RGBA", (cols * cw, (len(ids) + 1) // cols * ch + 8), (232, 236, 240, 255))
    d = ImageDraw.Draw(s)
    for k, sid in enumerate(ids):
        x0, y0 = (k % cols) * cw + 6, (k // cols) * ch + 4
        meta = load_json(ART / sid / "species.json")
        pal = meta["palette"]
        sport = [K] + list(SPORTS[sid][1])
        d.text((x0, y0), f"{sid}: {LINES[SPORTS[sid][0]][0]}", fill=(20, 20, 20, 255))
        x = x0
        for spt in (False, True):
            for kind in ("front", "back", "icon"):
                a = np.asarray(Image.open(ART / sid / f"{kind}.png").convert("RGBA"))
                if spt:
                    a = recolour(a, pal, sport)
                im = Image.fromarray(a, "RGBA")
                im = im.resize((im.width * z, im.height * z), Image.NEAREST)
                s.alpha_composite(im, (x, y0 + 12 + 56 * z - im.height))
                x += im.width + 4
            x += 8
    s.save(path)


def main(write=False):
    bad = 0
    for sid, (line, cols) in SPORTS.items():
        sport = [K] + list(cols)
        meta = load_json(ART / sid / "species.json")
        assert meta["palette"][0].lower() == K, sid
        probs = check(sid, sport)
        if probs:
            bad += 1
            print(f"  {sid}: " + "; ".join(probs))
        if write:
            name, ref = LINES[line]
            meta["sport"] = sport
            meta["notes"] = f"Sport: {name}. {ref}"
            save_json(ART / sid / "species.json", B.ordered("species", meta))
    assert len(SPORTS) == 53, len(SPORTS)
    sheet(HERE / "review" / "sports.png")
    print(f"{len(SPORTS)} sports, {bad} with warnings" + (" (written)" if write else ""))


if __name__ == "__main__":
    main("--write" in sys.argv[1:])
