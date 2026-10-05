# Sports (shiny palettes)

A **sport** is a horticultural mutation: a branch that comes up gold, a seedling with
black leaves, a white-flowered foxglove in a purple stand. In Verdant Reach it is the
rare alternate colouring of a Quickened (wild rate 1/512; Nursery seeds 1/256).

Each sport here is based on a real sport, cultivar or natural colour form of that plant.
Where the plant has none in cultivation, it uses the nearest real form of a close
relative and names it as such (fern, nettle, moonflower).

**How it renders** (ART.md §3): `species.json` `sport[i]` replaces `palette[i]` pixel
for pixel. Index 0 stays `#181818`. So each sport is written against what that species'
slots *do*: the holly's mid slot is its berries, the oak's dark slot is bark and cap,
and the sunflower's light slot is its rays.

**Rules**
- GBC-snapped: every channel is a multiple of 8.
- The tones keep their dark-to-light order.
- Dark/mid and mid/light are each at least 15% apart in greyscale, so the form still reads in battle.
- Only the `sport` and `notes` fields were edited, never the pixels; `source` is unchanged.

**Source of truth:** `tools/art/species_f/sports.py`, which holds the table, the checks and a review sheet (`tools/art/species_f/review/sports.png`).
Run it with `--write` to apply.
The new Round 4 lines set their sport in their own generators (`apple.py`, `paradise.py`).

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| oak_acorn | 'Concordia' golden oak | Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns. | `#585018 #b8b040 #f0f0b0` |
| oak_sapling | 'Concordia' golden oak | Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns. | `#584018 #d0b828 #f8f0a0` |
| great_oak | 'Concordia' golden oak | Quercus robur 'Concordia' (Van Geert, Ghent, 1843): butter-yellow leaves, gold-green acorns. | `#483818 #c8b030 #f8f098` |
| chili_blossom | 'Black Pearl' | Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers. | `#302040 #686078 #d0b0f0` |
| green_chili | 'Black Pearl' | Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers. | `#402848 #706080 #c8b8e8` |
| red_chili | 'Black Pearl' | Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black leaves and glossy black fruit, purple flowers. | `#301838 #584868 #c8a8e0` |
| lily_seedpod | 'Chromatella' yellow water lily | Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads. | `#604018 #c09038 #f8e8a8` |
| lily_pad | 'Chromatella' yellow water lily | Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads. | `#684018 #98a038 #e8f0a0` |
| giant_water_lily | 'Chromatella' yellow water lily | Nymphaea x marliacea 'Chromatella' (Latour-Marliac, 1887): canary-yellow flowers over bronze-mottled pads. | `#385020 #e8c040 #f8f8d0` |
| dandelion_bud | pink dandelion | Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips. | `#305838 #68a840 #f0a0c0` |
| dandelion | pink dandelion | Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips. | `#405028 #e888b0 #f8d8e0` |
| dandelion_clock | pink dandelion | Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose florets with pale tips. | `#305838 #d098b8 #f8f0f0` |
| bramble_blossom | 'Fall Gold' golden-fruited | Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes. | `#486038 #d0c8b8 #f8f8f0` |
| bramble_berry | 'Fall Gold' golden-fruited | Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes. | `#985818 #e8b030 #f8f0b0` |
| blackberry | 'Fall Gold' golden-fruited | Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit; its white flowers ride on yellow-green canes. | `#805018 #88a838 #f8e8a0` |
| sunflower_seedling | 'Italian White' | Helianthus annuus 'Italian White': cream-white rays round a near-black disc. | `#384828 #a0b850 #f8f0d0` |
| sunflower_bud | 'Italian White' | Helianthus annuus 'Italian White': cream-white rays round a near-black disc. | `#284838 #68a848 #f8f0c8` |
| sunflower | 'Italian White' | Helianthus annuus 'Italian White': cream-white rays round a near-black disc. | `#402028 #589840 #f8f0c8` |
| pumpkin_blossom | 'Jarrahdale' blue pumpkin | Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines. | `#306058 #f0c030 #f8f8c0` |
| green_pumpkin | 'Jarrahdale' blue pumpkin | Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines. | `#284848 #689888 #d0e8d0` |
| pumpkin | 'Jarrahdale' blue pumpkin | Cucurbita maxima 'Jarrahdale' (Western Australia heirloom): slate blue-grey ribbed skin; blue-green vines. | `#405060 #8898a8 #e0e8e0` |
| fern_fiddlehead | painted fern | silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004). | `#602848 #98a8a0 #e0e8e8` |
| unfurling_fern | painted fern | silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004). | `#602848 #98a8a0 #e0e8e8` |
| ostrich_fern | painted fern | silver fronds on burgundy stems, after the Japanese painted fern Athyrium niponicum var. pictum (Perennial Plant of the Year 2004). | `#602848 #98a8a0 #e0e8e8` |
| flytrap_seedling | 'Akai Ryu' (Red Dragon) | Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles. | `#581828 #c03038 #f8a0a0` |
| young_flytrap | 'Akai Ryu' (Red Dragon) | Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles. | `#581828 #c03038 #f8a0a0` |
| venus_flytrap | 'Akai Ryu' (Red Dragon) | Dionaea muscipula 'Akai Ryu' (registered 2002): the whole plant blood-red, traps and petioles. | `#581828 #c03038 #f8a0a0` |
| sundew_rosette | 'Alba' | Drosera capensis 'Alba': the anthocyanin-free form, green tentacles with clear dew and white flowers. | `#386830 #a8d870 #f8f8e8` |
| sundew | 'Alba' | Drosera capensis 'Alba': the anthocyanin-free form, green tentacles with clear dew and white flowers. | `#386830 #a8d870 #f8f8e8` |
| maple_samara | 'Crimson King' | Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season. | `#481838 #a84060 #f0b0a8` |
| maple_sapling | 'Crimson King' | Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season. | `#481838 #a85070 #f0b8b8` |
| sugar_maple | 'Crimson King' | Acer platanoides 'Crimson King' (Barbier, Orleans, 1937): maroon-purple leaves and red-purple keys all season. | `#401838 #983868 #e890a0` |
| nettle_sprout | silver-leaved | silver-washed leaves on violet stems, after the dead-nettle Lamium maculatum 'Beacon Silver' (the nettle's look-alike). | `#483858 #a0b098 #e8f0e8` |
| stinging_nettle | silver-leaved | silver-washed leaves on violet stems, after the dead-nettle Lamium maculatum 'Beacon Silver' (the nettle's look-alike). | `#483858 #a0b098 #e8f0e8` |
| moonflower_seed | lilac moonflower | the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin. | `#402858 #9098b8 #e8c8f0` |
| moonflower_vine | lilac moonflower | the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin. | `#402858 #9098b8 #e8c8f0` |
| moonflower | lilac moonflower | the lilac-flowered moonflower Ipomoea muricata (Ipomoea turbinata), the moonflower's purple cousin. | `#402858 #9098b8 #e8c8f0` |
| clover_sprout | 'Purpurascens Quadrifolium' | Trifolium repens 'Purpurascens Quadrifolium': burgundy-purple four-leaf clover, white heads. | `#382838 #985068 #f0f0d8` |
| white_clover | 'Purpurascens Quadrifolium' | Trifolium repens 'Purpurascens Quadrifolium': burgundy-purple four-leaf clover, white heads. | `#382838 #985068 #f0f0d8` |
| cattail_shoot | 'Variegata' | Typha latifolia 'Variegata': cream-striped blades, a rusty spike. | `#283828 #985830 #f8f0d0` |
| cattail | 'Variegata' | Typha latifolia 'Variegata': cream-striped blades, a rusty spike. | `#283828 #985830 #f8f0d0` |
| foxglove_rosette | 'Alba' white foxglove | Digitalis purpurea f. albiflora ('Alba'): white bells with dusky spots. | `#485848 #88a890 #f8f8f0` |
| foxglove | 'Alba' white foxglove | Digitalis purpurea f. albiflora ('Alba'): white bells with dusky spots. | `#585070 #d8d0c0 #f8f8f0` |
| holly_seedling | 'Bacciflava' yellow-berried holly | Ilex aquifolium 'Bacciflava' (known since the 18th century): golden-yellow berries. | `#285838 #f0c030 #f8f8f0` |
| holly | 'Bacciflava' yellow-berried holly | Ilex aquifolium 'Bacciflava' (known since the 18th century): golden-yellow berries. | `#285838 #f0c030 #f8f8f0` |
| mint_sprig | 'Chocolate' mint | Mentha x piperita f. citrata 'Chocolate': brown-purple stems and leaves, cocoa-dark veins. | `#382030 #806050 #e0d8b0` |
| peppermint | 'Chocolate' mint | Mentha x piperita f. citrata 'Chocolate': brown-purple stems and leaves, cocoa-dark veins. | `#382030 #806050 #e0d8b0` |
| rose_bud | 'Persian Yellow' | Rosa foetida 'Persiana' (brought to Europe 1837): deep yellow blooms and hips over dark leaves. | `#305838 #f8c838 #f8f0c8` |
| wild_rose | 'Persian Yellow' | Rosa foetida 'Persiana' (brought to Europe 1837): deep yellow blooms and hips over dark leaves. | `#305838 #f8c838 #f8f0c8` |
| pitcher_sprout | green form (anthocyanin-free) | the anthocyanin-free green form of the pitcher plant, as in Sarracenia purpurea f. heterophylla: all chartreuse, no red veins. | `#386838 #c8d850 #f8f8d8` |
| pitcher_plant | green form (anthocyanin-free) | the anthocyanin-free green form of the pitcher plant, as in Sarracenia purpurea f. heterophylla: all chartreuse, no red veins. | `#386838 #c8d850 #f8f8d8` |
| snapdragon_sprout | 'Rocket Lemon' | Antirrhinum majus Rocket Series 'Rocket Lemon': lemon-yellow spikes, dark green foliage. | `#405828 #e8c030 #f8f8c8` |
| snapdragon | 'Rocket Lemon' | Antirrhinum majus Rocket Series 'Rocket Lemon': lemon-yellow spikes, dark green foliage. | `#405828 #e8c030 #f8f8c8` |
| apple_tree | Malus 'Royalty' | Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves, crimson-pink blossom, dark fruit) | `#502048 #905068 #f8b8c8` |
| apple_sapling | Malus 'Royalty' | Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves, crimson-pink blossom, dark fruit) | `#502048 #905068 #f8b8c8` |
| apple_pip | Malus 'Royalty' | Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves, crimson-pink blossom, dark fruit) | `#402040 #985070 #f0c0c8` |
| paradise_shoot | 'Mandela's Gold' | 'Mandela's Gold' (yellow sepals; Kirstenbosch, 1996) | `#4830a0 #589850 #f8d850` |
| bird_of_paradise | 'Mandela's Gold' | 'Mandela's Gold' (yellow sepals; Kirstenbosch, 1996) | `#4830a0 #589850 #f8d850` |

Round 4 Palm House lines (agent 3; set in `tools/art/species_e/{orchid,monstera,lotus}.py`):

| Species | Sport | Real cultivar / reference | Sport palette (dark, mid, light) |
|---|---|---|---|
| orchid_keiki | variegated moth orchid | Phalaenopsis Sogo Vivien 'Variegata', a cream-edged variegated-leaf sport sold as a mini: yellow-green leaves, the bud and roots paled to match. | `#584830 #c0c060 #f8f8d8` |
| orchid_spike | harlequin moth orchid | Phalaenopsis harlequins: a mericlone sport of Phal. Golden Peoker 'Brother' (Taiwan, 1990s), cream flowers splashed maroon-black. The plum slot (buds, lip, veins) turns maroon; the petals go cream. | `#401830 #88a858 #f8f0c8` |
| moth_orchid | harlequin moth orchid | Phalaenopsis harlequins: a mericlone sport of Phal. Golden Peoker 'Brother' (Taiwan, 1990s): cream-gold petals, maroon-black lip, veins and leaves. | `#401830 #e8d088 #f8f8e0` |
| monstera_cutting | 'Aurea' | Monstera deliciosa 'Aurea' (yellow-variegated sport): lime-gold leaves and a gold cut face. | `#485828 #b8c040 #f8f0a8` |
| monstera | 'Thai Constellation' | Monstera deliciosa 'Thai Constellation' (a stable tissue-culture sport from Thailand): cream-speckled, milky green leaves. | `#405848 #a8c098 #f0f0d8` |
| lotus_seed | 'Chawan Basu' | Nelumbo nucifera 'Chawan Basu' (Indian bowl lotus): white petals tipped blush pink, a pale pod. | `#406050 #e8b0b8 #f8f8f0` |
| sacred_lotus | 'Alba Grandiflora' | Nelumbo nucifera 'Alba Grandiflora', the great white 'magnolia' lotus: white petals, cream pod, grey-green leaves. | `#406050 #c8c8b8 #f8f8f0` |
