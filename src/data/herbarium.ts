// Field Herbarium entries. Each holds ONE true, checkable fact about the real
// plant (marked in the source comment above each entry). Facts were checked
// against the cited sources in October 2026. Heights and weights are real
// ballparks for that life stage.

import type { HerbariumEntry, SpeciesId } from "../contracts";

const h = (species: SpeciesId, scientificName: string, category: string, heightM: number, weightKg: number, entry: string): HerbariumEntry =>
  ({ species, scientificName, category, heightM, weightKg, entry });

const LIST: HerbariumEntry[] = [
  // Fact: English oak usually starts bearing acorns at ~40 years.
  // Source: https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/english-oak/
  h("oak_acorn", "Quercus robur", "Acorn", 0.1, 0.5,
    "It sits very still, thinking long, slow thoughts. Patience runs in the family: a real oak seldom bears acorns before it is about 40."),
  // Fact: Eurasian jays bury acorns and forget some, which grow into oaks.
  // Source: https://link.springer.com/article/10.1007/s10336-024-02181-0
  h("oak_sapling", "Quercus robur", "Sapling", 1.2, 9,
    "It trails after jays, fascinated. Fair enough: jays bury acorns to eat later, forget a few, and so plant new oaks."),
  // Fact: ~2,300 species are associated with native oaks in the UK (Mitchell et al. 2019).
  // Source: https://www.sciencedirect.com/science/article/abs/pii/S0006320718317920
  h("great_oak", "Quercus robur", "Great Tree", 6.0, 410,
    "Birds nest in its crown and it never minds. In Britain, some 2,300 kinds of living thing are linked to native oaks."),

  // Fact: chilies are native to the Americas; reached Europe after Columbus (1493).
  // Source: https://en.wikipedia.org/wiki/Chili_pepper
  h("chili_blossom", "Capsicum annuum", "Pepper Flower", 0.3, 1.2,
    "A small white flower with a big temper. Chilies come from the Americas; they only reached Europe in the 1490s."),
  // Fact: green chilies are unripe; most ripen to red.
  // Source: https://en.wikipedia.org/wiki/Chili_pepper
  h("green_chili", "Capsicum annuum", "Pepper", 0.6, 3.5,
    "It isn't ripe yet, and it knows it. A green chili is simply unripe fruit; most kinds blush red as they ripen."),
  // Fact: birds lack the capsaicin-sensing TRPV1 response, so they eat chilies and spread the seeds.
  // Source: Tewksbury & Nabhan 2001, Nature (https://www.researchgate.net/publication/11869926)
  h("red_chili", "Capsicum annuum", "Hot Pepper", 1.0, 7.0,
    "Mammals keep well clear. Birds can't feel capsaicin's burn, so they eat chilies happily and scatter the seeds."),

  // Fact: Victoria seeds are eaten and locally called "milho-d'agua", water maize.
  // Source: https://www.monaconatureencyclopedia.com/victoria-amazonica/?lang=en
  h("lily_seedpod", "Victoria amazonica", "Seedpod", 0.2, 1.0,
    "It drifts down slow rivers, bobbing. In Brazil the real plant is called water maize, and its seeds are roasted and eaten."),
  // Fact: pads have sharp spines underneath, probably to deter fish and manatees.
  // Source: https://stories.rbge.org.uk/archives/15311
  h("lily_pad", "Victoria amazonica", "Pad", 0.3, 12,
    "Gentle on top, prickly underneath. Sharp spines guard the underside of a giant lily pad, probably to keep fish away."),
  // Fact: flowers open white on the first night and turn pink on the second.
  // Source: https://www.kew.org/plants/giant-waterlily
  h("giant_water_lily", "Victoria amazonica", "Giant Lily", 0.5, 45,
    "Its pads can reach 3 m across. Watch the flowers: they open white on the first night and turn pink on the second."),

  // Fact: "dandelion" comes from French dent de lion, lion's tooth, for the jagged leaves.
  // Source: https://en.wikipedia.org/wiki/Taraxacum
  h("dandelion_bud", "Taraxacum officinale", "Lion's Tooth", 0.1, 0.2,
    "Its jagged leaves nip at passing ankles. Fittingly, dandelion comes from the French dent de lion: lion's tooth."),
  // Fact: a dandelion "flower" is a head of many tiny florets (often 100-200+), each making one seed.
  // Source: https://gardens.duke.edu/wp-content/uploads/Duke-Gardens-Meet-a-Plant-Dandelion.pdf
  h("dandelion", "Taraxacum officinale", "Sunburst", 0.3, 0.4,
    "It loves a bright lawn. Each 'petal' is really a whole tiny flower, and a single head holds 100 or more."),
  // Fact: dandelion seed parachutes form a separated vortex ring (Cummins et al. 2018, Nature).
  // Source: https://www.nature.com/articles/s41586-018-0604-2
  h("dandelion_clock", "Taraxacum officinale", "Seed Clock", 0.4, 0.3,
    "One breath and it is gone. Above each seed's parachute spins a ring of air, a kind of flight first described in 2018."),

  // Fact: bramble canes root where their tips touch the ground (tip-layering).
  // Source: https://bsbi.org/in-your-area/local-botany/co-fermanagh/fermanagh-species-accounts/rubus-fruticosus-l-agg
  h("bramble_blossom", "Rubus fruticosus", "Bramble", 0.4, 2.0,
    "It never stays where it was planted. Wherever a bramble cane's tip touches soil, it roots and starts a new plant."),
  // Fact: blackberries start green, turn red, then ripen black.
  // Source: https://www.backyardnature.net/frt_aggr.htm
  h("bramble_berry", "Rubus fruticosus", "Bramble", 0.9, 6.0,
    "It blushes when cross. Blackberries start green, turn red, and only then ripen to black."),
  // Fact: a blackberry is an aggregate fruit of drupelets, each with one seed.
  // Source: https://www.backyardnature.net/frt_aggr.htm
  h("blackberry", "Rubus fruticosus", "Bramble", 1.8, 22,
    "Whole families of birds hide in its thickets. A blackberry isn't one berry but a cluster of tiny fruits, each with its own seed."),

  // Fact: young sunflowers track the sun east to west, then turn back east at night (Atamian et al. 2016).
  // Source: https://www.sciencedaily.com/releases/2016/08/160804152431.htm
  h("sunflower_seedling", "Helianthus annuus", "Sun Seeker", 0.2, 0.3,
    "It always knows where the sun is. Young sunflowers follow it west by day, then swing back east overnight."),
  // Fact: sunflower residues release chemicals that hold back other plants (allelopathy).
  // Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC10180669/
  h("sunflower_bud", "Helianthus annuus", "Sun Seeker", 1.0, 1.5,
    "Weeds give it a wide berth. Sunflowers release chemicals that hold back other plants growing nearby."),
  // Fact: mature sunflower heads stop tracking and face east, warming faster in the morning.
  // Source: https://www.sciencedaily.com/releases/2016/08/160804152431.htm
  h("sunflower", "Helianthus annuus", "Sun Seeker", 2.4, 3.0,
    "It greets every sunrise. Once in bloom, a sunflower stops turning and faces east, so it warms up fast each morning."),

  // Fact: pumpkins have separate male and female flowers; the female has a tiny fruit at its base.
  // Source: https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/pollination-of-squash-and-pumpkins
  h("pumpkin_blossom", "Cucurbita maxima", "Gourd", 0.3, 1.0,
    "It opens wide for the bees each morning. A pumpkin vine bears male and female flowers; the female has a tiny pumpkin at its base."),
  // Fact: botanically a pumpkin is a fruit, a hard-rinded berry called a pepo.
  // Source: same as above
  h("green_pumpkin", "Cucurbita maxima", "Gourd", 0.5, 18,
    "It rolls when it wants to go somewhere. Botanically, a pumpkin is a fruit: a hard-skinned berry called a pepo."),
  // Fact: contest pumpkins have topped 1,200 kg (Guinness record 1,278.8 kg, 2025).
  // Source: https://www.guinnessworldrecords.com/world-records/heaviest-pumpkin
  h("pumpkin", "Cucurbita maxima", "Gourd", 1.0, 90,
    "Once it settles, good luck moving it. Giant contest pumpkins have weighed more than 1,200 kg."),

  // Fact: fiddleheads are coiled young fern fronds named for the scroll of a violin; ostrich fern ones are eaten cooked.
  // Source: https://extension.umaine.edu/publications/4198e/
  h("fern_fiddlehead", "Matteuccia struthiopteris", "Fiddlehead", 0.2, 0.2,
    "It stays curled up until it trusts you. Fiddleheads are named for a violin's scroll, and in Maine they're cooked as a spring treat."),
  // Fact: ostrich ferns grow separate brown fertile fronds that release spores.
  // Source: https://extension.umaine.edu/publications/2540e/
  h("unfurling_fern", "Matteuccia struthiopteris", "Frond", 0.8, 1.0,
    "Ferns make spores, not seeds. The ostrich fern grows separate brown fronds just for spores, and they stand all winter."),
  // Fact: ferns appeared ~360+ million years ago, long before flowering plants (~130 Mya).
  // Source: https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=e180 (+ fossil record)
  h("ostrich_fern", "Matteuccia struthiopteris", "Old Frond", 1.6, 2.0,
    "Its fronds look like ostrich plumes. Ferns were growing more than 360 million years ago, long before the first flower."),

  // Fact: wild Venus flytraps grow only within ~120 km of Wilmington, North Carolina.
  // Source: https://homegrown.extension.ncsu.edu/2022/09/02/the-venus-flytrap-a-north-carolina-native
  h("flytrap_seedling", "Dionaea muscipula", "Snap Trap", 0.05, 0.1,
    "It snaps at anything, even raindrops. Wild flytraps live only in bogs within about 120 km of Wilmington, North Carolina."),
  // Fact: a trap shuts when trigger hairs are touched twice within ~20-30 s.
  // Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC7351144/
  h("young_flytrap", "Dionaea muscipula", "Snap Trap", 0.1, 0.3,
    "It counts before it bites. A trap usually shuts only when its trigger hairs are touched twice within about 20 seconds."),
  // Fact: a trap snaps shut in about a tenth of a second.
  // Source: https://asknature.org/strategy/leaves-rapidly-snap-shut/
  h("venus_flytrap", "Dionaea muscipula", "Snap Trap", 0.3, 1.5,
    "Its jaws are quicker than your eyes. A flytrap's trap snaps shut in about a tenth of a second."),

  // Fact: sundew tentacles are tipped with glistening sticky drops that look like dew.
  // Source: https://www.ipcc.ie/a-to-z-peatlands/peatland-species/carnivorous-plants-killers-in-the-bog/
  h("sundew_rosette", "Drosera rotundifolia", "Dewtrap", 0.05, 0.05,
    "It sparkles even at noon. Each leaf is tipped with sticky drops that shine like dew, which is how the sundew got its name."),
  // Fact: tentacles bend toward prey and the leaf can curl around it; sundews grow in nitrogen-poor bogs.
  // Source: same as above
  h("sundew", "Drosera rotundifolia", "Dewtrap", 0.2, 0.3,
    "Bog soil is poor, so it dines on insects. Its tentacles bend slowly toward trapped prey, and the leaf can curl around it."),

  // Fact: maple samaras spin like helicopter blades, slowing the fall so wind carries them farther.
  // Source: https://www.mdpi.com/2313-7673/6/2/23/htm
  h("maple_samara", "Acer saccharum", "Winged Seed", 0.1, 0.1,
    "It adores high places and long falls. A maple's winged seed spins like a rotor, falling slowly and drifting far."),
  // Fact: sugar maple saplings survive decades of shade until a canopy gap opens.
  // Source: https://www.srs.fs.usda.gov/pubs/misc/ag_654/volume_2/acer/saccharum.htm
  h("maple_sapling", "Acer saccharum", "Sweet Tree", 1.5, 8,
    "It is very, very patient. Young sugar maples can wait decades in deep shade for a gap to open in the canopy."),
  // Fact: about 40 L of sap boil down to 1 L of maple syrup.
  // Source: https://vermontmaple.org/learn/how-its-made
  h("sugar_maple", "Acer saccharum", "Sweet Tree", 5.0, 380,
    "Its sap runs on frosty nights and thawing days. It takes about 40 litres of sap, boiled down, to make 1 litre of syrup."),

  // Fact: young nettle leaves are cooked like spinach; cooking removes the sting.
  // Source: https://www.gettystewart.com/how-to-prepare-stinging-nettle-to-eat/
  h("nettle_sprout", "Urtica dioica", "Stinger", 0.2, 0.2,
    "Brush past it and you'll know. Young nettle leaves are cooked like spinach, and cooking takes the sting away."),
  // Fact: nettle hairs have brittle silica tips that snap off and inject histamine and other irritants.
  // Source: Fu et al. 2006, Annals of Botany, https://doi.org/10.1093/aob/mcl089
  h("stinging_nettle", "Urtica dioica", "Stinger", 1.2, 3.0,
    "Every hair is a tiny needle. The brittle silica tips snap off in skin and inject histamine."),

  // Fact: moonflower seeds have hard coats, so gardeners nick or soak them before sowing.
  // Source: https://blogs.ifas.ufl.edu/wakullaco/2020/10/14/moonflower-ipomoea-alba/
  h("moonflower_seed", "Ipomoea alba", "Night Bloom", 0.05, 0.05,
    "It only wakes after dark. Its seed coat is so hard that gardeners nick or soak moonflower seeds before sowing."),
  // Fact: moonflower shares the genus Ipomoea with morning glories, but blooms at night.
  // Source: https://en.wikipedia.org/wiki/Ipomoea_alba
  h("moonflower_vine", "Ipomoea alba", "Night Bloom", 2.0, 2.0,
    "It climbs toward the moon. It shares a genus with the morning glory, but keeps the opposite hours: it flowers at night."),
  // Fact: flowers open at dusk, often fast enough to watch, and are pollinated by hawk moths.
  // Source: https://en.wikipedia.org/wiki/Ipomoea_alba
  h("moonflower", "Ipomoea alba", "Night Bloom", 3.0, 4.0,
    "Its white flowers open at dusk, often fast enough to watch. Hawk moths visit in the dark to drink its nectar."),
  // ============================================================== Round 3 lines (facts checked October 2026)
  // Fact: "shamrock" is from Irish seamrog, a diminutive of seamair (clover): "young clover".
  // Source: https://en.wikipedia.org/wiki/Shamrock
  h("clover_sprout", "Trifolium repens", "Trefoil", 0.05, 0.02,
    "It hides in lawns, three leaves at a time. Its old name is a small one: shamrock comes from an Irish word meaning young clover."),
  // Fact: white clover fixes atmospheric nitrogen in root nodules, in symbiosis with Rhizobium bacteria.
  // Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC9534031/
  h("white_clover", "Trifolium repens", "Trefoil", 0.2, 0.1,
    "Where it creeps, the grass grows greener. Bacteria in its root nodules pull nitrogen from the air and turn it into plant food."),

  // Fact: Typha latifolia is called bulrush in Britain and (broadleaf) cattail in North America.
  // Source: https://en.wikipedia.org/wiki/Typha_latifolia
  h("cattail_shoot", "Typha latifolia", "Reedmace", 0.5, 0.5,
    "It stands ankle-deep and waits for summer. One plant, two names: the British call it bulrush, while North Americans say cattail."),
  // Fact: broadleaf cattail spikes averaged over 222,000 seeds each; the seeds carry fluffy hairs that float and fly.
  // Source: https://www.fs.usda.gov/database/feis/plants/graminoid/typlat/all.html
  h("cattail", "Typha latifolia", "Reedmace", 2.0, 3.0,
    "Never poke the brown spike. A single cattail head can burst into more than 200,000 fluffy seeds that ride the wind and water."),

  // Fact: Digitalis purpurea is a biennial: a basal rosette only in year one, flowering spires in year two.
  // Source: https://plantfinder.mobot.org/PlantFinderDetails.aspx?kempercode=c530
  h("foxglove_rosette", "Digitalis purpurea", "Fairy Glove", 0.15, 0.3,
    "It lies low and flat, biding its time. Foxgloves are biennials: a ring of leaves in the first year, flowers only in the second."),
  // Fact: foxglove is the source of the heart drug digitalis, popularised by William Withering's 1785 account.
  // Source: https://en.wikipedia.org/wiki/William_Withering
  h("foxglove", "Digitalis purpurea", "Fairy Glove", 1.5, 1.2,
    "Bumblebees adore it; everyone else, beware. Every part is poisonous, yet it gave doctors digitalis, a heart drug made famous by William Withering in 1785."),

  // Fact: holly grows spinier leaves low down where deer and goats browse, smoother leaves higher up (Herrera & Bazaga 2013).
  // Source: https://www.nationalgeographic.com/news/2012/12/121220-holly-leaves-prickly-plants-science/
  h("holly_seedling", "Ilex aquifolium", "Evergreen", 0.2, 0.3,
    "Every leaf is armed, just in case. Holly grows its spiniest leaves low down, where deer browse, and smoother ones high out of reach."),
  // Fact: holly is dioecious; only female plants bear red berries.
  // Source: https://naturescalendar.woodlandtrust.org.uk/what-we-record-and-why/species-we-record/shrubs/holly/
  h("holly", "Ilex aquifolium", "Evergreen", 3.0, 60,
    "It stays green through the hardest frost. Hollies are male or female, and only the female plants bear the bright red berries."),

  // Fact: menthol activates the TRPM8 cold receptor, so it feels cold without a change in temperature (McKemy et al. 2002).
  // Source: https://www.nature.com/articles/nature719
  h("mint_sprig", "Mentha piperita", "Menthol", 0.1, 0.05,
    "A cool breeze seems to follow it. Menthol in mint switches on TRPM8, the nerve sensor for cold, so it feels chilly without being cold."),
  // Fact: peppermint is a sterile hybrid of water mint and spearmint, spread only by rhizomes and stolons.
  // Source: https://en.wikipedia.org/wiki/Peppermint
  h("peppermint", "Mentha piperita", "Menthol", 0.6, 0.6,
    "It never sets seed, yet it turns up everywhere. Peppermint is a hybrid of water mint and spearmint, and it spreads by creeping runners."),

  // Fact: rose "thorns" are prickles, outgrowths of the stem's epidermis, not true thorns (modified stems).
  // Source: https://en.wikipedia.org/wiki/Rose
  h("rose_bud", "Rosa canina", "Dog Rose", 0.3, 0.4,
    "Pick it up carefully, or not at all. A rose's 'thorns' are really prickles, outgrowths of the stem's skin rather than true thorns."),
  // Fact: in WWII Britain volunteers collected ~200 tons of wild rose hips for vitamin C syrup.
  // Source: http://foragerplants.blogspot.com/2018/06/dog-rose-rosa-canina.html
  h("wild_rose", "Rosa canina", "Dog Rose", 2.0, 8.0,
    "Its hips glow red in autumn hedges. In wartime Britain, volunteers picked wild rose hips by the ton to make vitamin C syrup."),

  // Fact: Sarracenia leucophylla (white-topped pitcher plant) is native only to the Gulf Coastal Plain of the
  // southeastern US (FL, AL, GA, MS), in wet pine savannas and bogs. (Matches the white-hooded Crystal-rule art.)
  // Source: https://en.wikipedia.org/wiki/Sarracenia_leucophylla
  h("pitcher_sprout", "Sarracenia leucophylla", "Pitfall", 0.05, 0.1,
    "It sits in the moss with its hood up, smelling sweet. The white-topped pitcher plant grows wild only near the Gulf Coast of the United States, in boggy pine savannas."),
  // Fact: Sarracenia pitchers have stiff downward-pointing hairs; insects can't climb out and drown in the fluid below.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/sarracenia_purpurae.shtml (genus-wide trait)
  h("pitcher_plant", "Sarracenia leucophylla", "Pitfall", 0.3, 1.0,
    "Insects come for the nectar and never leave. Stiff downward-pointing hairs stop them climbing out, so they fall into the pool below and drown."),

  // Fact: Antirrhinum comes from Greek anti + rhis (nose), from the flower's resemblance to an animal's snout.
  // Source: https://en.wikipedia.org/wiki/Antirrhinum
  h("snapdragon_sprout", "Antirrhinum majus", "Dragon Bloom", 0.1, 0.2,
    "It huffs at anything that comes too close. Its Latin name, Antirrhinum, comes from Greek words for a snout, after the flower's shape."),
  // Fact: the flower's "mouth" opens when its sides are squeezed (hence snapdragon); bumblebees are strong enough to open it.
  // Source: https://en.wikipedia.org/wiki/Antirrhinum_majus
  h("snapdragon", "Antirrhinum majus", "Dragon Bloom", 1.0, 2.5,
    "Squeeze a snapdragon flower at the sides and its jaws gape open, which is how it got its name. Bumblebees are strong enough to pry their way in."),

  // ---------------------------------------------------------------- Round 4
  // Fact: apples don't grow true from seed; every pip is a new variety, so named kinds are grafted.
  // Source: https://extension.psu.edu/hobbiest-gardening-growing-fruit-tree-plants-from-seed
  h("apple_pip", "Malus domestica", "Pip", 0.05, 0.1,
    "It rolls off on its own, never quite like its parents. Plant an apple pip and you get a brand-new kind of apple, which is why named apples are grafted instead."),
  // Fact: most apple varieties are self-incompatible and need pollen from a different variety.
  // Source: https://extension.umaine.edu/fruit/growing-fruit-trees-in-maine/pollination-requirements/
  h("apple_sapling", "Malus domestica", "Whip", 1.5, 6.0,
    "Growers call a young unbranched tree a whip. It sulks when left alone, and with reason: most apples need pollen from a different variety to set fruit."),
  // Fact: the wild apple Malus sieversii of the Tian Shan, Kazakhstan, is the main ancestor of the eating apple.
  // Source: https://www.smithsonianmag.com/travel/saving-the-apples-ancient-ancestor-in-the-forests-of-kazakhstan-180983493/
  h("apple_tree", "Malus domestica", "Orchard", 4.0, 300,
    "It drops its best fruit on those who look after it. Every eating apple descends mainly from wild apple forests in the Tian Shan mountains of Kazakhstan."),

  // Fact: "keiki" is Hawaiian for baby or child; orchids grow keikis, clone plantlets, on the flower spike.
  // Source: https://www.aos.org/orchid-care/what-is-growing-on-the-flower-stem
  h("orchid_keiki", "Phalaenopsis hybrid", "Keiki", 0.05, 0.1,
    "It clings to its parent's flower stem until its roots are ready. Keiki is the Hawaiian word for baby, and each one is an exact clone of its mother."),
  // Fact: orchid seeds are dust-fine with no food store, and need a mycorrhizal fungus to germinate.
  // Source: https://www.humboldtorchids.org/seeds.php
  h("orchid_spike", "Phalaenopsis hybrid", "Flower Spike", 0.4, 0.4,
    "It raises its spike slowly, saving every bloom for the right moment. Orchid seeds are as fine as dust, with no food inside, and only sprout if a fungus feeds them."),
  // Fact: Phalaenopsis is from Greek phalaina (moth) + opsis (appearance): the flowers look like moths.
  // Source: https://www.aos.org/orchid-care/orchid-care-and-culture-sheets/phalaenopsis-culture-sheet/phalaenopsis-the-genus
  h("moth_orchid", "Phalaenopsis hybrid", "Moth Bloom", 0.7, 1.2,
    "Its blooms hover in the gloom like great moths. The name Phalaenopsis means moth-like, because its flowers were thought to look like moths in flight."),

  // Fact: Monstera seedlings grow toward the darkest part of the horizon, which leads them to a tree to climb (skototropism).
  // Source: https://www.science.org/doi/10.1126/science.190.4216.804 (Strong & Ray 1975, Monstera gigantea)
  h("monstera_cutting", "Monstera deliciosa", "Cutting", 0.3, 0.8,
    "It shuffles away from the light, which seems backwards. Young monstera vines grow toward the darkest shadow they can see, because a shadow usually means a tree to climb."),
  // Fact: Monstera deliciosa fruit takes over a year to ripen; unripe fruit is full of stinging calcium oxalate crystals.
  // Source: https://en.wikipedia.org/wiki/Monstera_deliciosa
  h("monstera", "Monstera deliciosa", "Split Leaf", 2.5, 40,
    "It shares its fruit with no one until it's ready. A monstera fruit takes over a year to ripen, and before then it is full of needle-like crystals that sting the mouth."),

  // Fact: a sacred lotus seed about 1,300 years old (radiocarbon-dated) was germinated (Shen-Miller et al.).
  // Source: https://www.cambridge.org/core/services/aop-cambridge-core/content/view/950DD5CB3E32BA6D99A79CAB5D75B038/S0960258502000144a.pdf/sacred-lotus-the-long-living-fruits-of-china-antique.pdf
  h("lotus_seed", "Nelumbo nucifera", "Seed", 0.02, 0.01,
    "It can wait a very long time. A lotus seed from a dry lakebed in China, carbon-dated at about 1,300 years old, still sprouted."),
  // Fact: lotus flowers make their own heat and hold themselves at about 30-36 C for 2-4 days (Seymour & Schultze-Motel 1996).
  // Source: https://www.nature.com/articles/383305a0
  h("sacred_lotus", "Nelumbo nucifera", "Lotus", 1.5, 8.0,
    "It rises spotless out of the mud. Its flower makes its own heat, holding itself at about 30 to 35 C for days, even on cold nights."),

  // Fact: Joseph Banks named Strelitzia after Queen Charlotte, born a princess of Mecklenburg-Strelitz.
  // Source: https://en.wikipedia.org/wiki/Strelitzia
  h("paradise_shoot", "Strelitzia reginae", "Crane Bud", 0.4, 1.0,
    "It holds its head high, as if waiting to be announced. The plant is named Strelitzia after Queen Charlotte, a princess of Mecklenburg-Strelitz."),
  // Fact: sunbirds perch on the flower; their weight opens the blue petals and dusts their feet with pollen.
  // Source: https://en.wikipedia.org/wiki/Strelitzia_reginae
  h("bird_of_paradise", "Strelitzia reginae", "Bird Flower", 1.5, 12,
    "Also called the bird of paradise. When a sunbird lands on the blue petals to drink, its weight springs them open and dusts its feet with pollen."),

  // ---------------------------------------------------------------- Chapter 5
  // Fact: No chlorophyll; food comes from fungi linked to nearby trees' roots.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/monotropa_uniflora.shtml
  h("ghostpipe_stalk", "Monotropa uniflora", "Ghost Stalk", 0.08, 0.1,
    "It listens quietly under the trees. Ghost pipe has no chlorophyll. Fungi linked to nearby trees' roots supply its food."),
  // Fact: No chlorophyll; food comes from fungi linked to nearby trees' roots.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/monotropa_uniflora.shtml
  h("ghostpipe_nodding", "Monotropa uniflora", "Nodding Pipe", 0.15, 0.2,
    "It nods as if someone below has spoken. Without chlorophyll, ghost pipe gets food from fungi connected to the roots of nearby trees."),
  // Fact: No chlorophyll; food comes from fungi linked to nearby trees' roots.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/monotropa_uniflora.shtml
  h("ghost_pipe", "Monotropa uniflora", "Ghost Pipe", 0.25, 0.4,
    "It keeps its woodland friends close. Ghost pipe has no chlorophyll; it receives food from fungi linked to nearby trees' roots."),

  // Fact: Fireweed is one of the first plants to grow back after a forest fire.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/chamerion_angustifolium.shtml
  h("fireweed_fluff", "Chamaenerion angustifolium", "Fire Fluff", 0.05, 0.1,
    "It hurries toward the ash, full of hope. Fireweed is one of the first plants to grow back after a forest fire."),
  // Fact: Fireweed is one of the first plants to grow back after a forest fire.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/chamerion_angustifolium.shtml
  h("fireweed_shoot", "Chamaenerion angustifolium", "Fire Shoot", 0.4, 0.6,
    "It stands bravely where the fire passed. Fireweed is among the first plants to return after a forest fire."),
  // Fact: Fireweed is one of the first plants to grow back after a forest fire.
  // Source: https://www.fs.usda.gov/wildflowers/plant-of-the-week/chamerion_angustifolium.shtml
  h("fireweed", "Chamaenerion angustifolium", "Fire Bloom", 1.5, 2.5,
    "It greets the burnt clearing like an old friend. After a forest fire, fireweed is one of the first plants to grow back."),

  // Fact: Many cones are resin-sealed and open only in fire's heat (serotiny).
  // Source: https://www.fs.usda.gov/database/feis/plants/tree/pinconl/all.html
  h("lodgepole_cone", "Pinus contorta", "Sealed Cone", 0.08, 0.2,
    "It waits, tightly tucked away. Many lodgepole cones are sealed with resin and open only in the heat of a fire, called serotiny."),
  // Fact: Many cones are resin-sealed and open only in fire's heat (serotiny).
  // Source: https://www.fs.usda.gov/database/feis/plants/tree/pinconl/all.html
  h("lodgepole_seedling", "Pinus contorta", "Pine Sprout", 0.5, 1.5,
    "It takes its first steps through the ash. Many lodgepole cones stay resin-sealed until fire's heat opens them. This is serotiny."),
  // Fact: Many cones are resin-sealed and open only in fire's heat (serotiny).
  // Source: https://www.fs.usda.gov/database/feis/plants/tree/pinconl/all.html
  h("lodgepole_pine", "Pinus contorta", "Lodgepole", 8.0, 350,
    "It holds its ground patiently. Many of its cones are sealed with resin and open only in fire's heat, a trait called serotiny."),

  // Fact: Flowers heat well above air temperature and melt surrounding snow.
  // Source: https://en.wikipedia.org/wiki/Symplocarpus_foetidus
  h("skunk_cabbage_shoot", "Symplocarpus foetidus", "Skunk Shoot", 0.15, 0.4,
    "It seems quite cosy in the cold. Skunk cabbage can heat its own flowers well above the air temperature, melting snow around them."),
  // Fact: Flowers heat well above air temperature and melt surrounding snow.
  // Source: https://en.wikipedia.org/wiki/Symplocarpus_foetidus
  h("skunk_cabbage", "Symplocarpus foetidus", "Skunk Cabbage", 0.6, 3.0,
    "It offers a warm welcome. Its flowers can become much warmer than the air, melting the snow around them."),

  // Fact: Western red cedar can live for over a thousand years.
  // Source: https://www.fs.usda.gov/database/feis/plants/tree/thupli/all.html
  h("cedar_seedling", "Thuja plicata", "Cedar Sprout", 0.4, 1.0,
    "It is in no hurry to grow up. A western red cedar can live for over a thousand years."),
  // Fact: Western red cedar can live for over a thousand years.
  // Source: https://www.fs.usda.gov/database/feis/plants/tree/thupli/all.html
  h("red_cedar", "Thuja plicata", "Ancient Cedar", 12.0, 900,
    "It listens as though it has all the time in the world. Western red cedars can live for more than a thousand years."),

  // ---------------------------------------------------------------- Chapter 6
  // Fact: Its seeds sprout while still on the parent tree, then drop as long propagules that can float at sea for months.
  // Source: https://en.wikipedia.org/wiki/Rhizophora_mangle
  h("mangrove_propagule", "Rhizophora mangle", "Propagule", 0.3, 0.1,
    "Its seeds sprout while still on the parent tree. They drop as long propagules that can float at sea for months."),
  // Fact: Its seeds sprout while still on the parent tree, then drop as long propagules that can float at sea for months.
  // Source: https://en.wikipedia.org/wiki/Rhizophora_mangle
  h("mangrove_sapling", "Rhizophora mangle", "Stilt Sprout", 1.2, 8,
    "Its seeds sprout while still on the parent tree. They drop as long propagules that can float at sea for months."),
  // Fact: Its seeds sprout while still on the parent tree, then drop as long propagules that can float at sea for months.
  // Source: https://en.wikipedia.org/wiki/Rhizophora_mangle
  h("red_mangrove", "Rhizophora mangle", "Mangrove", 6, 350,
    "Its seeds sprout while still on the parent tree. They drop as long propagules that can float at sea for months."),

  // Fact: It is a true flowering plant that is pollinated underwater: its pollen drifts through the sea.
  // Source: https://en.wikipedia.org/wiki/Zostera_marina
  h("seagrass_shoot", "Zostera marina", "Seagrass Tip", 0.15, 0.02,
    "It is a true flowering plant pollinated underwater. Its pollen drifts through the sea."),
  // Fact: It is a true flowering plant that is pollinated underwater: its pollen drifts through the sea.
  // Source: https://en.wikipedia.org/wiki/Zostera_marina
  h("eelgrass", "Zostera marina", "Seagrass", 1, 0.2,
    "It is a true flowering plant pollinated underwater. Its pollen drifts through the sea."),

  // Fact: Its pads carry glochids: tiny barbed bristles that detach at a touch.
  // Source: https://en.wikipedia.org/wiki/Opuntia
  h("pear_pad", "Opuntia", "Pear Pad", 0.2, 0.5,
    "Its pads carry glochids, tiny barbed bristles. They detach at a touch."),
  // Fact: Its pads carry glochids: tiny barbed bristles that detach at a touch.
  // Source: https://en.wikipedia.org/wiki/Opuntia
  h("padded_cactus", "Opuntia", "Pad Cactus", 0.6, 5,
    "Its pads carry glochids, tiny barbed bristles. They detach at a touch."),
  // Fact: Its pads carry glochids: tiny barbed bristles that detach at a touch.
  // Source: https://en.wikipedia.org/wiki/Opuntia
  h("prickly_pear", "Opuntia", "Prickly Pear", 1.5, 20,
    "Its pads carry glochids, tiny barbed bristles. They detach at a touch."),

  // Fact: A saguaro may grow for 50 to 70 years before it sprouts its first arm.
  // Source: https://www.nps.gov/sagu/learn/nature/saguaro-cactus.htm
  h("saguaro_pup", "Carnegiea gigantea", "Saguaro Pup", 0.15, 0.4,
    "It may grow for decades before sprouting its first arm. For a saguaro, that can take 50 to 70 years."),
  // Fact: A saguaro may grow for 50 to 70 years before it sprouts its first arm.
  // Source: https://www.nps.gov/sagu/learn/nature/saguaro-cactus.htm
  h("saguaro_column", "Carnegiea gigantea", "Tall Saguaro", 3, 150,
    "It may grow for decades before sprouting its first arm. For a saguaro, that can take 50 to 70 years."),
  // Fact: A saguaro may grow for 50 to 70 years before it sprouts its first arm.
  // Source: https://www.nps.gov/sagu/learn/nature/saguaro-cactus.htm
  h("saguaro", "Carnegiea gigantea", "Old Saguaro", 10, 2000,
    "It may grow for decades before sprouting its first arm. For a saguaro, that can take 50 to 70 years."),

  // Fact: Outside Mexico its flowers are pollinated by hand, a method worked out by Edmond Albius on Réunion in 1841.
  // Source: https://en.wikipedia.org/wiki/Edmond_Albius
  h("vanilla_vine", "Vanilla planifolia", "Vanilla Vine", 0.5, 0.3,
    "Outside Mexico, its flowers are pollinated by hand. Edmond Albius worked out the method on Reunion in 1841."),
  // Fact: Outside Mexico its flowers are pollinated by hand, a method worked out by Edmond Albius on Réunion in 1841.
  // Source: https://en.wikipedia.org/wiki/Edmond_Albius
  h("vanilla_orchid", "Vanilla planifolia", "Vanilla", 3, 2,
    "Outside Mexico, its flowers are pollinated by hand. Edmond Albius worked out the method on Reunion in 1841."),
];

export const HERBARIUM = Object.fromEntries(LIST.map((e) => [e.species, e])) as Record<SpeciesId, HerbariumEntry>;
