# Herbarium facts: Round 4 species

Each Field Herbarium entry for the 12 Chapter 4 species holds one true,
checkable fact about the real plant. The facts were checked against the
sources below in October 2026. The same source sits in a comment above
each entry in `src/data/herbarium.ts`.

| Species | Fact | Source |
|---|---|---|
| apple_pip (APPLE PIP) | Apples don't grow true from seed. Every pip grows into a new variety, so named apples are grafted. | https://extension.psu.edu/hobbiest-gardening-growing-fruit-tree-plants-from-seed |
| apple_sapling (APPLE WHIP) | Most apple varieties are self-incompatible. To set fruit they need pollen from a different variety. ("Whip" is the nursery term for a young unbranched tree.) | https://extension.umaine.edu/fruit/growing-fruit-trees-in-maine/pollination-requirements/ |
| apple_tree (APPLE TREE) | The wild apple *Malus sieversii*, from the Tian Shan mountains of Kazakhstan, is the main ancestor of the eating apple. | https://www.smithsonianmag.com/travel/saving-the-apples-ancient-ancestor-in-the-forests-of-kazakhstan-180983493/ |
| orchid_keiki (ORCHID KEIKI) | "Keiki" is Hawaiian for baby. A keiki is a clone plantlet that grows on an orchid's flower stem. | https://www.aos.org/orchid-care/what-is-growing-on-the-flower-stem |
| orchid_spike (ORCHID SPIKE) | Orchid seeds are dust-fine and carry no food store. They germinate only when a mycorrhizal fungus feeds them. | https://www.humboldtorchids.org/seeds.php |
| moth_orchid (MOTH ORCHID) | *Phalaenopsis* comes from the Greek *phalaina* (moth) and *opsis* (appearance), because the flowers look like moths. | https://www.aos.org/orchid-care/orchid-care-and-culture-sheets/phalaenopsis-culture-sheet/phalaenopsis-the-genus |
| monstera_cutting (MONSTERA TIP) | Monstera seedlings grow toward the darkest sector of the horizon (skototropism), which leads them to a tree to climb. The study used *Monstera gigantea*, so the entry says "young monstera vines". | https://www.science.org/doi/10.1126/science.190.4216.804 (Strong & Ray 1975) |
| monstera (MONSTERA) | *M. deliciosa* fruit takes over a year to ripen. Until then it is full of irritant calcium oxalate crystals. | https://en.wikipedia.org/wiki/Monstera_deliciosa |
| lotus_seed (LOTUS SEED) | A sacred lotus seed from a dry lakebed in Liaoning, China, radiocarbon-dated to about 1,300 years old, germinated. | https://www.cambridge.org/core/services/aop-cambridge-core/content/view/950DD5CB3E32BA6D99A79CAB5D75B038/S0960258502000144a.pdf/sacred-lotus-the-long-living-fruits-of-china-antique.pdf (Shen-Miller et al. 2002) |
| sacred_lotus (SACRED LOTUS) | Lotus flowers are thermogenic: they hold themselves at about 30–35 °C for 2–4 days, even when the air is about 10 °C. | https://www.nature.com/articles/383305a0 (Seymour & Schultze-Motel 1996) |
| paradise_shoot (PARADISE BUD) | Joseph Banks named *Strelitzia* after Queen Charlotte, who was born a princess of Mecklenburg-Strelitz. | https://en.wikipedia.org/wiki/Strelitzia |
| bird_of_paradise (CRANE FLOWER) | When a sunbird lands on the blue petals to drink nectar, its weight opens them and dusts its feet with pollen. | https://en.wikipedia.org/wiki/Strelitzia_reginae |

## The real behaviour behind the new moves

| Move | Line | Real plant behaviour |
|---|---|---|
| WINDFALL | apple | Ripe or excess fruit drops from the tree (windfalls; the "June drop"). |
| AERIAL ROOT | monstera | Monstera climbs and anchors itself with aerial roots that drop from the stem. |
| FENESTRATE | monstera (adult only) | Mature leaves develop holes and splits. Juvenile leaves are whole, so only the grown MONSTERA learns it. |
| LOTUS EFFECT | lotus | The lotus effect: superhydrophobic, self-cleaning leaves that make water bead and roll off, taking the dirt with it. |
| POD SHOWER | lotus | The shower-head seed pod tips over and drops its seeds into the water. |
| VELAMEN | orchid | Orchid aerial roots have a spongy, silvery velamen layer that soaks up water fast. |
| FALSE NECTAR | orchid | Pollinator deception: many orchids advertise nectar and give none. |
| LONG BLOOM | orchid | Moth orchid flowers last for months. |
| POLLEN PERCH | bird of paradise | The sunbird perch, described above. |
