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
    "It sits very still and thinks long thoughts. A real oak usually bears no acorns until it is about 40 years old."),
  // Fact: Eurasian jays bury acorns and forget some, which grow into oaks.
  // Source: https://link.springer.com/article/10.1007/s10336-024-02181-0
  h("oak_sapling", "Quercus robur", "Sapling", 1.2, 9,
    "It follows jays around with great interest. Jays bury acorns to eat later, forget some, and so plant new oaks."),
  // Fact: ~2,300 species are associated with native oaks in the UK (Mitchell et al. 2019).
  // Source: https://www.sciencedirect.com/science/article/abs/pii/S0006320718317920
  h("great_oak", "Quercus robur", "Great Tree", 6.0, 410,
    "Birds nest in its crown without a care. In Britain, about 2,300 species of living thing are linked to native oaks."),

  // Fact: chilies are native to the Americas; reached Europe after Columbus (1493).
  // Source: https://en.wikipedia.org/wiki/Chili_pepper
  h("chili_blossom", "Capsicum annuum", "Pepper Flower", 0.3, 1.2,
    "A small white flower with a fiery temper. Chili peppers come from the Americas and reached Europe only in the 1490s."),
  // Fact: green chilies are unripe; most ripen to red.
  // Source: https://en.wikipedia.org/wiki/Chili_pepper
  h("green_chili", "Capsicum annuum", "Pepper", 0.6, 3.5,
    "It is not ripe yet, and it knows. A green chili is unripe fruit; most kinds turn red as they ripen."),
  // Fact: birds lack the capsaicin-sensing TRPV1 response, so they eat chilies and spread the seeds.
  // Source: Tewksbury & Nabhan 2001, Nature (https://www.researchgate.net/publication/11869926)
  h("red_chili", "Capsicum annuum", "Hot Pepper", 1.0, 7.0,
    "Mammals flee its heat, but birds land on it happily. Birds can't feel capsaicin's burn, so they eat chilies and spread the seeds."),

  // Fact: Victoria seeds are eaten and locally called "milho-d'agua", water maize.
  // Source: https://www.monaconatureencyclopedia.com/victoria-amazonica/?lang=en
  h("lily_seedpod", "Victoria amazonica", "Seedpod", 0.2, 1.0,
    "It bobs along slow rivers. The seeds of the real plant are roasted and eaten, and in Brazil it is called water maize."),
  // Fact: pads have sharp spines underneath, probably to deter fish and manatees.
  // Source: https://stories.rbge.org.uk/archives/15311
  h("lily_pad", "Victoria amazonica", "Pad", 0.3, 12,
    "Gentle on top, prickly below. The underside of a giant lily pad is covered in sharp spines, probably to keep fish off."),
  // Fact: flowers open white on the first night and turn pink on the second.
  // Source: https://www.kew.org/plants/giant-waterlily
  h("giant_water_lily", "Victoria amazonica", "Giant Lily", 0.5, 45,
    "Its pads can reach 3 m across. Its flowers open white on the first night and turn pink on the second."),

  // Fact: "dandelion" comes from French dent de lion, lion's tooth, for the jagged leaves.
  // Source: https://en.wikipedia.org/wiki/Taraxacum
  h("dandelion_bud", "Taraxacum officinale", "Lion's Tooth", 0.1, 0.2,
    "Its jagged leaves bite at ankles. The name dandelion comes from the French dent de lion: lion's tooth."),
  // Fact: a dandelion "flower" is a head of many tiny florets (often 100-200+), each making one seed.
  // Source: https://gardens.duke.edu/wp-content/uploads/Duke-Gardens-Meet-a-Plant-Dandelion.pdf
  h("dandelion", "Taraxacum officinale", "Sunburst", 0.3, 0.4,
    "It loves bright lawns. Each 'petal' is really a whole tiny flower, and one head holds 100 or more of them."),
  // Fact: dandelion seed parachutes form a separated vortex ring (Cummins et al. 2018, Nature).
  // Source: https://www.nature.com/articles/s41586-018-0604-2
  h("dandelion_clock", "Taraxacum officinale", "Seed Clock", 0.4, 0.3,
    "One breath and it is gone. Each seed's parachute makes a ring of swirling air above it, a kind of flight first found in 2018."),

  // Fact: bramble canes root where their tips touch the ground (tip-layering).
  // Source: https://bsbi.org/in-your-area/local-botany/co-fermanagh/fermanagh-species-accounts/rubus-fruticosus-l-agg
  h("bramble_blossom", "Rubus fruticosus", "Bramble", 0.4, 2.0,
    "It never stays where it was planted. Where a bramble cane's tip touches the soil, it takes root and starts a new plant."),
  // Fact: blackberries start green, turn red, then ripen black.
  // Source: https://www.backyardnature.net/frt_aggr.htm
  h("bramble_berry", "Rubus fruticosus", "Bramble", 0.9, 6.0,
    "It blushes when it gets angry. Blackberries start green, turn red, and only then ripen to black."),
  // Fact: a blackberry is an aggregate fruit of drupelets, each with one seed.
  // Source: https://www.backyardnature.net/frt_aggr.htm
  h("blackberry", "Rubus fruticosus", "Bramble", 1.8, 22,
    "Its thickets hide whole families of birds. A blackberry is not one berry but a cluster of tiny fruits, each with its own seed."),

  // Fact: young sunflowers track the sun east to west, then turn back east at night (Atamian et al. 2016).
  // Source: https://www.sciencedaily.com/releases/2016/08/160804152431.htm
  h("sunflower_seedling", "Helianthus annuus", "Sun Seeker", 0.2, 0.3,
    "It always knows where the sun is. Young sunflowers follow the sun west by day and swing back east at night."),
  // Fact: sunflower residues release chemicals that hold back other plants (allelopathy).
  // Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC10180669/
  h("sunflower_bud", "Helianthus annuus", "Sun Seeker", 1.0, 1.5,
    "Weeds keep their distance. Sunflowers release chemicals that hold back other plants growing nearby."),
  // Fact: mature sunflower heads stop tracking and face east, warming faster in the morning.
  // Source: https://www.sciencedaily.com/releases/2016/08/160804152431.htm
  h("sunflower", "Helianthus annuus", "Sun Seeker", 2.4, 3.0,
    "It greets every sunrise. Once a sunflower blooms, it stops turning and faces east, so it warms up fast each morning."),

  // Fact: pumpkins have separate male and female flowers; the female has a tiny fruit at its base.
  // Source: https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/pollination-of-squash-and-pumpkins
  h("pumpkin_blossom", "Cucurbita maxima", "Gourd", 0.3, 1.0,
    "It opens wide for bees each morning. A pumpkin vine has male and female flowers; the female has a tiny pumpkin at its base."),
  // Fact: botanically a pumpkin is a fruit, a hard-rinded berry called a pepo.
  // Source: same as above
  h("green_pumpkin", "Cucurbita maxima", "Gourd", 0.5, 18,
    "It rolls when it wants to go somewhere. A pumpkin is a fruit: a kind of hard-skinned berry called a pepo."),
  // Fact: contest pumpkins have topped 1,200 kg (Guinness record 1,278.8 kg, 2025).
  // Source: https://www.guinnessworldrecords.com/world-records/heaviest-pumpkin
  h("pumpkin", "Cucurbita maxima", "Gourd", 1.0, 90,
    "Once settled, it is very hard to move. Giant pumpkins grown for contests have weighed over 1,200 kg."),

  // Fact: fiddleheads are coiled young fern fronds named for the scroll of a violin; ostrich fern ones are eaten cooked.
  // Source: https://extension.umaine.edu/publications/4198e/
  h("fern_fiddlehead", "Matteuccia struthiopteris", "Fiddlehead", 0.2, 0.2,
    "It stays curled up until it trusts you. Fiddleheads are named for the scroll of a violin, and in Maine they are cooked as a spring food."),
  // Fact: ostrich ferns grow separate brown fertile fronds that release spores.
  // Source: https://extension.umaine.edu/publications/2540e/
  h("unfurling_fern", "Matteuccia struthiopteris", "Frond", 0.8, 1.0,
    "Ferns make spores, not seeds. The ostrich fern grows separate brown fronds just for spores, which stand all winter."),
  // Fact: ferns appeared ~360+ million years ago, long before flowering plants (~130 Mya).
  // Source: https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=e180 (+ fossil record)
  h("ostrich_fern", "Matteuccia struthiopteris", "Old Frond", 1.6, 2.0,
    "Its fronds look like ostrich plumes. Ferns grew on Earth more than 360 million years ago, long before any flower."),

  // Fact: wild Venus flytraps grow only within ~120 km of Wilmington, North Carolina.
  // Source: https://homegrown.extension.ncsu.edu/2022/09/02/the-venus-flytrap-a-north-carolina-native
  h("flytrap_seedling", "Dionaea muscipula", "Snap Trap", 0.05, 0.1,
    "It snaps at anything, even raindrops. Wild flytraps grow only in bogs within about 120 km of Wilmington, North Carolina."),
  // Fact: a trap shuts when trigger hairs are touched twice within ~20-30 s.
  // Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC7351144/
  h("young_flytrap", "Dionaea muscipula", "Snap Trap", 0.1, 0.3,
    "It counts before it bites. A flytrap's trap usually shuts only when its trigger hairs are touched twice within about 20 seconds."),
  // Fact: a trap snaps shut in about a tenth of a second.
  // Source: https://asknature.org/strategy/leaves-rapidly-snap-shut/
  h("venus_flytrap", "Dionaea muscipula", "Snap Trap", 0.3, 1.5,
    "Its jaws are faster than your eyes. A flytrap's trap snaps shut in about a tenth of a second."),

  // Fact: sundew tentacles are tipped with glistening sticky drops that look like dew.
  // Source: https://www.ipcc.ie/a-to-z-peatlands/peatland-species/carnivorous-plants-killers-in-the-bog/
  h("sundew_rosette", "Drosera rotundifolia", "Dewtrap", 0.05, 0.05,
    "It sparkles even at noon. Its leaves are tipped with sticky drops that shine like dew, which is how the sundew got its name."),
  // Fact: tentacles bend toward prey and the leaf can curl around it; sundews grow in nitrogen-poor bogs.
  // Source: same as above
  h("sundew", "Drosera rotundifolia", "Dewtrap", 0.2, 0.3,
    "Bog soil is poor, so it eats insects instead. Its tentacles slowly bend toward trapped prey, and the leaf can curl around it."),

  // Fact: maple samaras spin like helicopter blades, slowing the fall so wind carries them farther.
  // Source: https://www.mdpi.com/2313-7673/6/2/23/htm
  h("maple_samara", "Acer saccharum", "Winged Seed", 0.1, 0.1,
    "It loves high places and long falls. A maple's winged seed spins like a rotor, so it falls slowly and drifts far."),
  // Fact: sugar maple saplings survive decades of shade until a canopy gap opens.
  // Source: https://www.srs.fs.usda.gov/pubs/misc/ag_654/volume_2/acer/saccharum.htm
  h("maple_sapling", "Acer saccharum", "Sweet Tree", 1.5, 8,
    "It is very patient. Young sugar maples can wait for decades in deep shade until a gap opens in the canopy above."),
  // Fact: about 40 L of sap boil down to 1 L of maple syrup.
  // Source: https://vermontmaple.org/learn/how-its-made
  h("sugar_maple", "Acer saccharum", "Sweet Tree", 5.0, 380,
    "Its sap runs on frosty nights and thawing days. About 40 litres of maple sap boil down to make 1 litre of syrup."),

  // Fact: young nettle leaves are cooked like spinach; cooking removes the sting.
  // Source: https://www.gettystewart.com/how-to-prepare-stinging-nettle-to-eat/
  h("nettle_sprout", "Urtica dioica", "Stinger", 0.2, 0.2,
    "Brush past it and you'll know. Young nettle leaves are cooked and eaten like spinach; cooking takes the sting away."),
  // Fact: nettle hairs have brittle silica tips that snap off and inject histamine and other irritants.
  // Source: Fu et al. 2006, Annals of Botany, https://doi.org/10.1093/aob/mcl089
  h("stinging_nettle", "Urtica dioica", "Stinger", 1.2, 3.0,
    "Every hair is a tiny needle. The tips are made of brittle silica; they snap off in skin and inject histamine."),

  // Fact: moonflower seeds have hard coats, so gardeners nick or soak them before sowing.
  // Source: https://blogs.ifas.ufl.edu/wakullaco/2020/10/14/moonflower-ipomoea-alba/
  h("moonflower_seed", "Ipomoea alba", "Night Bloom", 0.05, 0.05,
    "It only wakes after dark. Moonflower seeds have such hard coats that gardeners nick or soak them before sowing."),
  // Fact: moonflower shares the genus Ipomoea with morning glories, but blooms at night.
  // Source: https://en.wikipedia.org/wiki/Ipomoea_alba
  h("moonflower_vine", "Ipomoea alba", "Night Bloom", 2.0, 2.0,
    "It climbs toward the moon. It is a cousin of the morning glory, in the same genus, but it flowers at night instead."),
  // Fact: flowers open at dusk, often fast enough to watch, and are pollinated by hawk moths.
  // Source: https://en.wikipedia.org/wiki/Ipomoea_alba
  h("moonflower", "Ipomoea alba", "Night Bloom", 3.0, 4.0,
    "Its white flowers open at dusk, often fast enough to watch. Hawk moths come in the night to drink its nectar."),
];

export const HERBARIUM = Object.fromEntries(LIST.map((e) => [e.species, e])) as Record<SpeciesId, HerbariumEntry>;
