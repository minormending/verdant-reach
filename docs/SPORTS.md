# Sports (shiny palettes)

A **sport** is a horticultural mutation: a branch that comes up gold, a seedling with
black leaves, a white-flowered foxglove in a purple stand. In Verdant Reach it is the
rare alternate colouring of a Quickened (wild rate 1/512; Nursery seeds 1/256).

Each sport here is based on a real sport, cultivar or natural colour form of that plant.
Where the plant has none in cultivation, it uses the nearest real form of a close
relative and names it as such (fern, nettle, moonflower).

**How it renders** (ART.md §3): `species.json` `sport[i]` replaces `palette[i]` pixel
for pixel. Index 0 stays `#181818`. So each sport is written against what that species'
slots *do*: the holly's dark slot is its berries, the oak's dark slot is bark and cap,
and the sunflower's light slot is its rays.

**Rules**
- GBC-snapped: every channel is a multiple of 8.
- The tones keep their dark-to-light order.
- Dark/mid and mid/light are each at least 15% apart in greyscale, so the form still reads in battle.
- **Crystal rule** (docs/CREATURES.md § Crystal rule): a sport swaps only indexes 1–2;
  index 3 stays the shared white `#f8f8f8`. The sunflower line is the one approved
  exception: its index 3 is the line's gold, so its sport also changes index 3 (cream rays).

**Source of truth:** since the Crystal-rule rollout, every species' sport lives in its
line's generator, `tools/art/crystal/<line>.py`. The table below lists each sport as
(dark, mid, light) = indexes 1–3. `tools/art/species_f/sports.py` is the pre-Crystal
table and is kept as reference only (its values are the `classic` pack's sports).

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| oak_acorn | 'Concordia' golden oak | Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns. | `#585018 #b8b040 #f8f8f8` |
| oak_sapling | 'Concordia' golden oak | Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns. | `#584018 #d0b828 #f8f8f8` |
| great_oak | 'Concordia' golden oak | Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns. | `#504018 #d0b030 #f8f8f8` |
| chili_blossom | 'Black Pearl' | Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers. | `#382048 #9878b8 #f8f8f8` |
| green_chili | 'Black Pearl' | Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers. | `#201838 #605078 #f8f8f8` |
| red_chili | 'Black Pearl' | Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers. | `#281828 #684878 #f8f8f8` |
| lily_seedpod | 'Chromatella' yellow water lily | Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads. | `#604018 #c09038 #f8f8f8` |
| lily_pad | 'Chromatella' yellow water lily | Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads. | `#684018 #98a038 #f8f8f8` |
| giant_water_lily | 'Chromatella' yellow water lily | Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads. | `#385020 #e8c040 #f8f8f8` |
| dandelion_bud | pink dandelion | Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips. | `#387838 #f0a0c0 #f8f8f8` |
| dandelion | pink dandelion | Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips. | `#405028 #e888b0 #f8f8f8` |
| dandelion_clock | pink dandelion | Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips. | `#305838 #d098b8 #f8f8f8` |
| bramble_blossom | 'Fall Gold' golden-fruited | Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes. | `#486038 #d8c8a8 #f8f8f8` |
| bramble_berry | 'Fall Gold' golden-fruited | Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes. | `#985818 #e8b030 #f8f8f8` |
| blackberry | 'Fall Gold' golden-fruited | Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes. | `#805018 #88a838 #f8f8f8` |
| sunflower_seedling | 'Italian White' | Helianthus annuus 'Italian White': cream-white rays round a near-black disc. | `#384828 #a0b850 #f8f0d0` |
| sunflower_bud | 'Italian White' | Helianthus annuus 'Italian White': cream-white rays round a near-black disc. | `#284838 #68a848 #f8f0c8` |
| sunflower | 'Italian White' | Helianthus annuus 'Italian White': cream-white rays round a near-black disc. | `#402028 #589840 #f8f0c8` |
| pumpkin_blossom | 'Jarrahdale' blue pumpkin | Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines. Crystal: blue-green vines and ovary, a butter-yellow flower. | `#306058 #f0c030 #f8f8f8` |
| green_pumpkin | 'Jarrahdale' blue pumpkin | Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines. Crystal: slate shade, blue-green skin. | `#284850 #78a098 #f8f8f8` |
| pumpkin | 'Jarrahdale' blue pumpkin | Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines. Crystal: slate shade, blue-grey skin. | `#384858 #90a0b0 #f8f8f8` |
| fern_fiddlehead | painted fern | silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004). Crystal: silver-sage light, burgundy shade. | `#682848 #a8b8a8 #f8f8f8` |
| unfurling_fern | painted fern | silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004). Crystal: silver-sage light, burgundy shade. | `#682848 #a8b8a8 #f8f8f8` |
| ostrich_fern | painted fern | silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004). Crystal: silver-sage light, burgundy shade. | `#682848 #a8b8a8 #f8f8f8` |
| flytrap_seedling | 'Akai Ryu' (Red Dragon) | Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles. | `#601830 #d83840 #f8f8f8` |
| young_flytrap | 'Akai Ryu' (Red Dragon) | Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles. | `#601830 #d83840 #f8f8f8` |
| venus_flytrap | 'Akai Ryu' (Red Dragon) | Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles. | `#601830 #d83840 #f8f8f8` |
| sundew_rosette | 'Alba' | Drosera capensis 'Alba': the anthocyanin-free form, green tentacles with clear dew and white flowers. Crystal: green tentacles and shade, pale green leaves, the dew stays white. | `#386830 #b8e078 #f8f8f8` |
| sundew | 'Alba' | Drosera capensis 'Alba': the anthocyanin-free form, green tentacles with clear dew and white flowers. Crystal: green tentacles and shade, pale green leaves, the dew stays white. | `#386830 #b8e078 #f8f8f8` |
| maple_samara | 'Crimson King' | Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season. Crystal: maroon shade, rose-purple light. | `#481838 #b04868 #f8f8f8` |
| maple_sapling | 'Crimson King' | Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season. Crystal: maroon shade, rose-purple light. | `#481838 #a85070 #f8f8f8` |
| sugar_maple | 'Crimson King' | Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season. Crystal: maroon shade, rose-purple light. | `#401838 #a84070 #f8f8f8` |
| nettle_sprout | silver-leaved | silver-washed leaves on violet stems, after the dead-nettle Lamium maculatum 'Beacon Silver' (the nettle's look-alike). | `#583870 #b0c0b0 #f8f8f8` |
| stinging_nettle | silver-leaved | silver-washed leaves on violet stems, after the dead-nettle Lamium maculatum 'Beacon Silver' (the nettle's look-alike). | `#583870 #b0c0b0 #f8f8f8` |
| moonflower_seed | lilac moonflower | the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin: plum and lilac where the moonflower is violet and sage, so its star and cup turn lilac. | `#502860 #b898d0 #f8f8f8` |
| moonflower_vine | lilac moonflower | the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin: plum and lilac where the moonflower is violet and sage, so its star and cup turn lilac. | `#502860 #b898d0 #f8f8f8` |
| moonflower | lilac moonflower | the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin: plum and lilac where the moonflower is violet and sage, so its star and cup turn lilac. | `#502860 #b898d0 #f8f8f8` |
| clover_sprout | 'Purpurascens Quadrifolium' | Trifolium repens 'Purpurascens Quadrifolium': burgundy-purple four-leaf clover, white heads. | `#401830 #985068 #f8f8f8` |
| white_clover | 'Purpurascens Quadrifolium' | Trifolium repens 'Purpurascens Quadrifolium': burgundy-purple four-leaf clover, white heads. | `#401830 #985068 #f8f8f8` |
| cattail_shoot | 'Variegata' | Typha latifolia 'Variegata': cream-striped blades, a rusty spike (in two tones: a rust spike, cream blades). | `#985830 #e0d898 #f8f8f8` |
| cattail | 'Variegata' | Typha latifolia 'Variegata': cream-striped blades, a rusty spike (in two tones: a rust spike, cream blades). | `#985830 #e0d898 #f8f8f8` |
| foxglove_rosette | 'Alba' white foxglove | Digitalis purpurea f. albiflora ('Alba'): white bells with dusky spots; the rosette's young bells come up pale grey-green. | `#506048 #b0c8a8 #f8f8f8` |
| foxglove | 'Alba' white foxglove | Digitalis purpurea f. albiflora ('Alba'): white bells with dusky spots. | `#585070 #e0d8c8 #f8f8f8` |
| holly_seedling | 'Bacciflava' yellow-berried holly | Ilex aquifolium 'Bacciflava' (known since the 18th century): golden-yellow berries; the gold sits in the dark slot with the berries, so the leaf green lifts to a fresh yellow-green. | `#c08820 #a0d060 #f8f8f8` |
| holly | 'Bacciflava' yellow-berried holly | Ilex aquifolium 'Bacciflava' (known since the 18th century): golden-yellow berries; the gold sits in the dark slot with the berries, so the leaf green lifts to a fresh yellow-green. | `#c08820 #a0d060 #f8f8f8` |
| mint_sprig | 'Chocolate' mint | Mentha x piperita f. citrata 'Chocolate': brown-purple stems and leaves, cocoa-dark veins. | `#482838 #906850 #f8f8f8` |
| peppermint | 'Chocolate' mint | Mentha x piperita f. citrata 'Chocolate': brown-purple stems and leaves, cocoa-dark veins. | `#482838 #906850 #f8f8f8` |
| rose_bud | 'Persian Yellow' | Rosa foetida 'Persiana' (brought to Europe 1837): deep yellow blooms and hips over dark leaves. | `#305830 #f0c030 #f8f8f8` |
| wild_rose | 'Persian Yellow' | Rosa foetida 'Persiana' (brought to Europe 1837): deep yellow blooms and hips over dark leaves. | `#305830 #f0c030 #f8f8f8` |
| pitcher_sprout | green form (anthocyanin-free) | the anthocyanin-free green form of the pitcher plant, as in the anthocyanin-free forms of Sarracenia, including white-topped S. leucophylla: all chartreuse, no red veins (the veins and throat turn deep green). | `#407838 #c8e050 #f8f8f8` |
| pitcher_plant | green form (anthocyanin-free) | the anthocyanin-free green form of the pitcher plant, as in the anthocyanin-free forms of Sarracenia, including white-topped S. leucophylla: all chartreuse, no red veins (the veins and throat turn deep green). | `#407838 #c8e050 #f8f8f8` |
| snapdragon_sprout | 'Rocket Lemon' | Antirrhinum majus Rocket Series 'Rocket Lemon': lemon-yellow spikes, dark green foliage. | `#386028 #f0d038 #f8f8f8` |
| snapdragon | 'Rocket Lemon' | Antirrhinum majus Rocket Series 'Rocket Lemon': lemon-yellow spikes, dark green foliage. | `#386028 #f0d038 #f8f8f8` |
| apple_tree | Malus 'Royalty' | Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves and sprout, near-black fruit and pip; the white blossom stays white, shaded purple) | `#502048 #9c6088 #f8f8f8` |
| apple_sapling | Malus 'Royalty' | Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves and sprout, near-black fruit and pip; the white blossom stays white, shaded purple) | `#502048 #a06890 #f8f8f8` |
| apple_pip | Malus 'Royalty' | Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves and sprout, near-black fruit and pip; the white blossom stays white, shaded purple) | `#402040 #a86888 #f8f8f8` |
| paradise_shoot | 'Mandela's Gold' | 'Mandela's Gold' (Kirstenbosch, 1996): golden-yellow sepals; the slate leaves, spathe and petal arrow deepen to violet-blue | `#384880 #f8d038 #f8f8f8` |
| bird_of_paradise | 'Mandela's Gold' | 'Mandela's Gold' (Kirstenbosch, 1996): golden-yellow sepals; the slate leaves, spathe and petal arrow deepen to violet-blue | `#384880 #f8d038 #f8f8f8` |

Round 4 Palm House lines (set in `tools/art/crystal/{orchid,monstera,lotus}.py` since the Crystal-rule rollout; palettes are dark, light, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| orchid_keiki | variegated moth orchid | Phalaenopsis Sogo Vivien 'Variegata', a cream-edged variegated-leaf sport sold as a mini: yellow-green leaves, the plum bud and leaf shade turn olive. | `#605030 #c0c058 #f8f8f8` |
| orchid_spike | harlequin moth orchid | Phalaenopsis harlequins: a mericlone sport of Phal. Golden Peoker 'Brother' (Taiwan, 1990s), white flowers splashed maroon-black. The plum slot (spike, buds, lip, shade) turns maroon; the leaves go sage. | `#481830 #90a858 #f8f8f8` |
| moth_orchid | harlequin moth orchid | Phalaenopsis harlequins: a mericlone sport of Phal. Golden Peoker 'Brother' (Taiwan, 1990s): cream-gold petals, maroon-black lip, spike and leaves. | `#481830 #e0c070 #f8f8f8` |
| monstera_cutting | 'Aurea' | Monstera deliciosa 'Aurea' (yellow-variegated sport): lime-gold leaves and node, olive shade. | `#485828 #c0c840 #f8f8f8` |
| monstera | 'Thai Constellation' | Monstera deliciosa 'Thai Constellation' (a stable tissue-culture sport from Thailand): milky, cream-speckled green leaves, grey-green shade. | `#405848 #b0c8a0 #f8f8f8` |
| lotus_seed | 'Chawan Basu' | Nelumbo nucifera 'Chawan Basu' (Indian bowl lotus): white petals tipped blush pink; the pink slot (petal, pod flank, roots) goes blush. | `#406050 #f0b8c0 #f8f8f8` |
| sacred_lotus | 'Alba Grandiflora' | Nelumbo nucifera 'Alba Grandiflora', the great white 'magnolia' lotus: white petals, grey-green leaves. | `#486858 #d0d0c0 #f8f8f8` |

Chapter 5 lodgepole, skunk cabbage and cedar lines (set in `tools/art/crystal/{lodgepole,skunk_cabbage,cedar}.py`; palettes are dark, light, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| lodgepole_cone | 'Chief Joseph' | Pinus contorta var. latifolia 'Chief Joseph' (found wild in Oregon's Wallowa Mountains): green in summer, its needles turn bright gold in winter. Crystal: gold needles, a warm bark and cone brown. | `#805830 #d8c030 #f8f8f8` |
| lodgepole_seedling | 'Chief Joseph' | Pinus contorta var. latifolia 'Chief Joseph' (found wild in Oregon's Wallowa Mountains): green in summer, its needles turn bright gold in winter. Crystal: gold needles, a warm bark and cone brown. | `#805830 #d8c030 #f8f8f8` |
| lodgepole_pine | 'Chief Joseph' | Pinus contorta var. latifolia 'Chief Joseph' (found wild in Oregon's Wallowa Mountains): green in summer, its needles turn bright gold in winter. Crystal: gold needles, a warm bark and cone brown. | `#805830 #d8c030 #f8f8f8` |
| skunk_cabbage_shoot | yellow-green spathe (natural variant; no named form) | No cultivar or named botanical form of Symplocarpus foetidus exists. Wild spathes vary from solid maroon through mottled to almost plain yellow-green, so the sport is that natural yellow-green spathe, kept close to the source. Crystal: an olive-gold spathe, a fresher leaf green. | `#686818 #b0d050 #f8f8f8` |
| skunk_cabbage | yellow-green spathe (natural variant; no named form) | No cultivar or named botanical form of Symplocarpus foetidus exists. Wild spathes vary from solid maroon through mottled to almost plain yellow-green, so the sport is that natural yellow-green spathe, kept close to the source. Crystal: an olive-gold spathe, a fresher leaf green. | `#686818 #b0d050 #f8f8f8` |
| cedar_seedling | 'Zebrina' | Thuja plicata 'Zebrina': green sprays banded creamy yellow. Crystal: golden-lime sprays over the same red-brown bark family. | `#884830 #c0c840 #f8f8f8` |
| red_cedar | 'Zebrina' | Thuja plicata 'Zebrina': green sprays banded creamy yellow. Crystal: golden-lime sprays over the same red-brown bark family. | `#884830 #c0c840 #f8f8f8` |

Chapter 5 ghostpipe and fireweed lines (set in `tools/art/crystal/{ghostpipe,fireweed}.py`; palettes are dark, light, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| ghostpipe_stalk | pink form | the natural pink form of the ghost pipe, Monotropa uniflora (uncommon pink-flushed plants occur in the wild): pale rose wax, a dusky rose shade. | `#985068 #e8b0c8 #f8f8f8` |
| ghostpipe_nodding | pink form | the natural pink form of the ghost pipe, Monotropa uniflora (uncommon pink-flushed plants occur in the wild): pale rose wax, a dusky rose shade. | `#985068 #e8b0c8 #f8f8f8` |
| ghost_pipe | pink form | the natural pink form of the ghost pipe, Monotropa uniflora (uncommon pink-flushed plants occur in the wild): pale rose wax, a dusky rose shade. | `#985068 #e8b0c8 #f8f8f8` |
| fireweed_fluff | f. albiflorum | Chamaenerion angustifolium f. albiflorum, the white-flowered form (it lacks the red pigment): white flowers on green stems and pods. | `#487838 #d0d0c0 #f8f8f8` |
| fireweed_shoot | f. albiflorum | Chamaenerion angustifolium f. albiflorum, the white-flowered form (it lacks the red pigment): white flowers on green stems and pods. | `#487838 #d0d0c0 #f8f8f8` |
| fireweed | f. albiflorum | Chamaenerion angustifolium f. albiflorum, the white-flowered form (it lacks the red pigment): white flowers on green stems and pods. | `#487838 #d0d0c0 #f8f8f8` |

Chapter 6 seagrass line (set in `tools/art/crystal/seagrass.py`; palettes are dark, mid, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| seagrass_shoot | warmer green foliage (natural variation; no named colour form identified) | Zostera marina. No named cultivar or botanical colour form was identified in the consulted references. The sport interprets ordinary green foliage with a modest warmer green shift; it does not claim a named or genetically stable sport. See references below. | `#286048 #80b868 #f8f8f8` |
| eelgrass | warmer green foliage (natural variation; no named colour form identified) | Zostera marina, the same natural green variation as the shoot; no named colour form identified. White midrib, sheath and oxygen-bubble highlights stay white. | `#286048 #80b868 #f8f8f8` |

References: the [USDA NRCS eelgrass fact sheet](https://plants.usda.gov/DocumentLibrary/factsheet/pdf/fs_zoma.pdf) describes the creeping rhizome, rounded ribbon leaves and reproductive spathes. [Fonseca & Uhrin, Marine Fisheries Review 71(3)](https://spo.nmfs.noaa.gov/sites/default/files/pdf-content/MFR/mfr713/mfr7134.pdf) describes dark green foliage. [Dennison & Alberte, photosynthetic responses to light intensity](https://pubmed.ncbi.nlm.nih.gov/28311224/) measured changes in leaf chlorophyll under different light conditions; the particular warmer green palette is an artistic interpretation, not a documented named form.

Chapter 6 mangrove line (set in `tools/art/crystal/mangrove.py`; palettes are dark, mid, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| mangrove_propagule | sun-bleached yellow-green (natural colour interpretation) | Rhizophora mangle. No named cultivar is claimed: the green propagule and first leaves take the natural yellow-green of sun-bleached foliage, interpreted artistically rather than as a genetically stable sport. Brown rooting tip and mud stay warm brown; white gloss stays white. | `#906038 #b8c868 #f8f8f8` |
| mangrove_sapling | sun-bleached yellow-green (natural colour interpretation) | Rhizophora mangle, the same natural yellow-green interpretation as the propagule; no named cultivar. Red-brown stilt roots remain brown and the white water-line reflections stay white. | `#906038 #b8c868 #f8f8f8` |
| red_mangrove | sun-bleached yellow-green (natural colour interpretation) | Rhizophora mangle, the same natural yellow-green interpretation; no named cultivar. The dense canopy changes to yellow-green over warm brown prop roots, with the shared white reserved for gloss and water reflections. | `#906038 #b8c868 #f8f8f8` |

Botanical references: [University of Florida IFAS, Red Mangrove (FR460)](https://ask.ifas.ufl.edu/publication/FR460) describes the long green propagules, glossy leaves and arching aerial roots; [UF/IFAS Center for Aquatic and Invasive Plants](https://plant-directory.ifas.ufl.edu/plant-directory/rhizophora-mangle/) describes the shiny evergreen foliage and bowed stilt roots. These support the plant anatomy; the particular sun-bleached yellow-green palette is an artistic interpretation, not a documented named colour form.

Chapter 6 prickly pear line (set in `tools/art/crystal/prickly_pear.py`; palettes are dark, mid, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| pear_pad | Santa Rita purple prickly pear | Opuntia 'Santa Rita' (also listed as O. santa-rita / O. violacea 'Santa Rita'): violet-purple pads, particularly in cold or dry conditions. Crystal: purple-violet paddle faces, plum-magenta in the dark slot; white glochid highlights stay white. | `#782850 #b088c0 #f8f8f8` |
| padded_cactus | Santa Rita purple prickly pear | The same real purple prickly pear as pear_pad, expressed in the four joined paddle faces. White areole tufts and edge highlights stay white. | `#782850 #b088c0 #f8f8f8` |
| prickly_pear | Santa Rita purple prickly pear | The same purple prickly pear: violet pads with red-purple fruit. The four-colour interpretation retains plum-magenta tunas; the flower cups share the pad tone and white petal rims. | `#782850 #b088c0 #f8f8f8` |

Botanical references: the [University of Arizona Campus Arboretum, Santa Rita prickly pear](https://apps.cals.arizona.edu/arboretum/taxon.aspx?id=893) describes violet-purple pads, yellow flowers along upper pad edges and red-purple fruits. The [University of Arizona Extension garden plant list](https://extension.arizona.edu/sites/extension.arizona.edu/files/programs/2022master-gardener-EG-plant-list.pdf) lists Opuntia violacea 'Santa Rita' and its purple colour in cold or dry weather. The sprite's exact two-tone palette is an artistic interpretation; yellow flowers share warm sage in the base art because a separate yellow hue would require a palette exception.

Chapter 6 saguaro line (set in `tools/art/crystal/saguaro.py`; palettes are dark, mid, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| saguaro_pup | blue-grey waxy bloom (unnamed colour interpretation) | Carnegiea gigantea: an artistic blue-grey interpretation of waxy bloom on drought-stressed stems, not a named cultivar or genetically stable colour sport. Only the two green slots change; white spine highlights stay white. | `#405c68 #98b0b8 #f8f8f8` |
| saguaro_column | blue-grey waxy bloom (unnamed colour interpretation) | The same unnamed waxy-bloom interpretation on the unbranched stem. Cristate (crested) growth changes shape, so it cannot be represented by this palette sport. | `#405c68 #98b0b8 #f8f8f8` |
| saguaro | blue-grey waxy bloom (unnamed colour interpretation) | The same unnamed blue-grey stem interpretation; white flowers and spine highlights remain white. No named cultivar or cristate shape is claimed. | `#405c68 #98b0b8 #f8f8f8` |

Botanical references: [NPS, Saguaro Cactus](https://home.nps.gov/orpi/learn/nature/saguaro-cactus.htm) describes the protective waxy skin and nurse plants; [NPS, Saguaro Growth](https://home.nps.gov/sagu/learn/nature/saguaro-growth.htm) describes flower crowns on the stem and arms. These support the anatomy and waxy surface. The blue-grey palette and its drought-stressed appearance are an artistic interpretation: these references do not establish a named blue-grey form or a drought-induced colour change.

Chapter 6 vanilla line (set in `tools/art/crystal/vanilla.py`; palettes are dark, mid, shared white):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| vanilla_vine | 'Variegata' | Vanilla planifolia 'Variegata': fleshy green leaves striped creamy white. Crystal: a pale cream-green leaf face over olive-green shade and a green-brown stake; the existing longitudinal highlights suggest the striping. Palette swap only. | `#586040 #d0d8a0 #f8f8f8` |
| vanilla_orchid | 'Variegata' | The same cream-striped Vanilla planifolia form as vanilla_vine. Leaf faces and orchid segments take pale cream-green; the stake and long green capsules retain an olive dark tone. Shared white stays reserved for rims and gloss, with identical geometry. | `#586040 #d0d8a0 #f8f8f8` |

Botanical references: [University of California Riverside Botanic Gardens, Fall 2021 plant list](https://gardens.ucr.edu/sites/g/files/rcwecm4706/files/2021-09/Online%20Fall%202021%20Plant%20List%209.21.2021.pdf) lists Vanilla planifolia 'Variegata' with succulent leaves striped creamy white and pale yellow-green flowers. [UF/IFAS, Vanilla Growing in South Florida (HS1348)](https://ask.ifas.ufl.edu/publication/HS1348) describes the fleshy climbing vine, oval pointed leaves, aerial roots, cream-green flowers with a modified lip, and elongated green capsules. The exact cream-green palette is an artistic interpretation of variegation within two colour slots.
