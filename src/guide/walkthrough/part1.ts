import type { Section } from "../types";

// Walkthrough part 1: the Prologue through Chapter 4 (Conservatories 1-3 and
// GLASSHOUSE CITY). Ends with DR. VALE's call after FLORA VANCE; Chapter 5
// (CEDARHALLOW) is part 2. Every fact here was checked against src/world and
// src/data: map rows for directions, trainers.ts for teams, the type chart for
// strategy. The map, boss and species blocks expand into tables on the page,
// so the prose sticks to route, order and strategy.

export const PART_1: Section[] = [
  // --- Prologue ------------------------------------------------------------------
  {
    id: "prologue-deck",
    part: "Prologue",
    title: "The Observation Deck",
    blocks: [
      { p: "DR. VALE first asks whether you're a **BOY** or a **GIRL** (you play as the one you pick; the story is the same), then your name (BASIL or BRYONY by default, up to 7 letters). After that, the game opens on the **OBSERVATION DECK** on the HERBARIUM roof. It's your first evening shift, and DR. VALE has brought you up to watch the CENTURYHEART bloom on the far slope for the first time in a hundred years. This part is a cutscene: gold pollen drifts down the valley, and a low hum rises through the floor that only you seem to notice. There's nothing to collect and no way to go wrong." },
      { map: "herbarium_roof", note: "Always night. You can come back later by the stairs in the north-west corner of DR. VALE's lab." },
      { p: "When the scene fades out, you wake up at home the next morning." },
    ],
  },
  {
    id: "prologue-home",
    part: "Prologue",
    title: "Morning at Home",
    blocks: [
      { p: "Your housemate JUNE has a message: DR. VALE rang at dawn to say \"the greenhouse moved.\" Walk out of the door at the bottom of the room into FALLOWFIELD." },
      { map: "player_home" },
      { tip: "Once you have a partner, talk to JUNE and answer YES to have her water your team. It's a free full heal, handy when you're grinding on ROUTE 1.", title: "A free heal" },
    ],
  },

  // --- Chapter 1 -------------------------------------------------------------------
  {
    id: "ch1-fallowfield",
    part: "Chapter 1",
    title: "Fallowfield",
    blocks: [
      { p: "Your house is on the west side of town. Follow the main lane east; the **HERBARIUM** stands on its stone forecourt in the north-east corner. The hedged lane north to ROUTE 1 is watched by a lookout, who sends you back until you have a partner. The south road to SALTMARSH HARBOUR is shut while the ford is in flood. That's for a much later chapter." },
      { map: "fallowfield" },
      { tip: "A **WATER FLASK** is hidden in the mushrooms beside the stump on the far south-east corner of the duck pond. Stand on the grass just north of the mushrooms, face down and press A. A faint sparkle marks every hidden item in the game.", title: "Hidden item" },
      { p: "WILLA, who keeps the SEED LIBRARY, stands outside the big house by the duck pond. Once you have a starter she offers the **SEED LIBRARY** side quest: press six kinds of QUICKENED in your FIELD HERBARIUM and show her, for 3 GLASS PODS. You'll finish it on ROUTE 1 and ROUTE 2 without trying." },
    ],
  },
  {
    id: "ch1-starter",
    part: "Chapter 1",
    title: "The Herbarium: Choosing a Starter",
    blocks: [
      { p: "DR. VALE calls you straight through the open arch on the east side of her lab into the glass greenhouse wing (she won't let you back out of the front door yet). Three potted seedlings sit on the bench at the top of the room, all turned to face the door. Inspect each pot to see the plant and a short description, then answer YES to the one you want. All three start at level 5." },
      { map: "herbarium" },
      { species: "oak_acorn", note: "WOOD. Bulky and patient. Learns PALE TOUCH (GHOST) at 7, ACORN DROP at 9 and SPLINTER (THORN) at 14. Grows into OAK SAPLING at 16." },
      { species: "chili_blossom", note: "FIRE. Fast, with strong special attacks. Learns SEED BURST at 6 and SMOULDER at 13. Grows into GREEN CHILI at 16." },
      { species: "lily_seedpod", note: "WATER. Sturdy on the special side. Learns HOARFROST (FROST) at 7 and COLD MIST (FROST) at 12. Grows into LILY PAD at 16." },
      { tip: "**CHILI FLOWER** is the easy mode for this part of the game: FIRE hits HOLLIS's FIDDLEHEAD, SHEARS's MAPLE SPROUT and every one of NELL PITCHER's bug plants for double damage. **LILY SEEDPOD** is the cleverest pick. Its FROST moves hit WOOD and BLOOM plants for double damage, and BRAMBLEBERRY (WOOD/THORN, which you'll meet a lot) for four times the damage. FLORA VANCE's whole team is weak to them. **OAK ACORN** is the hard road: NELL's bugs hit it for double damage, and nothing it learns early hits BLOOM plants hard except SPLINTER.", title: "Which starter?" },
      { tip: "Whichever you choose, your rival BRAM steals the pot that's strong against it: pick OAK and he takes the CHILI, pick CHILI and he takes the LILY, pick LILY and he takes the OAK. Plan your second and third catches around that line.", title: "Your rival's starter" },
      { p: "DR. VALE waters your new partner (a full heal), then hands you the **FIELD HERBARIUM**, your record of every QUICKENED you sketch (see) and press (catch). Her errand: OLD FENNIMORE in HEDGEROW, up ROUTE 1, has found \"a seed that won't sit still.\"" },
      { item: "field_herbarium", note: "Unlocks the HERBARIUM entry in the START menu. Each page holds one true plant fact." },
    ],
  },
  {
    id: "ch1-route-1",
    part: "Chapter 1",
    title: "Route 1 to Hedgerow",
    blocks: [
      { p: "The lookout lets you through now. ROUTE 1 snakes north in an S: up past the lower lily pond on its west side, east to the stream, north over the footbridge, west along the laid hedge, up the west side, then east and north again to HEDGEROW. SCHOOLKID MILO watches the lane just north of the footbridge." },
      { map: "route_1" },
      { tip: "You can't catch anything yet: DR. VALE only hands out TERRARIUM PODS later in this chapter. For now, battle the wild QUICKENED for experience. A starter at level 6 or 7 makes the rival battle ahead much easier (CHILI learns SEED BURST at 6, LILY and OAK learn their first off-type move at 7).", title: "No pods yet" },
      { list: [
        "**TERRARIUM POD**: on the lip of the ledge in the east meadow. You can see it from the bend below, but you reach it from the top: walk east off the northern lane and drop south into the meadow, then hop the ledge to come back.",
        "**WATER FLASK**: on the east shore of the lower lily pond, reached from the meadow south of it.",
        "**2 TERRARIUM PODS** (hidden): under the mushroom-ringed stump in the west hollow, near the FALLOWFIELD end.",
        "**WILD BERRY** bushes: one in the hedge corner of the north meadow, one in the river nook east of the footbridge. Each gives 2 berries a day (by your real clock).",
      ] },
      { tip: "Come back for **MINT SPRIG** once you have pods. It's FROST, the type that hits HOLLIS hardest (FIDDLEHEAD takes double, BRAMBLEBERRY four times) and it stays useful against SHEARS and FLORA. It shows up by day and is even more common at night. Night also brings **FOX ROSETTE**, which grows into FOXGLOVE (BLOOM/GHOST) at 18, but only at night. **SUN SEEDLING** and **SHAMROCK** only appear by day. In this game \"day\" means 4:00 to 18:00 on your real clock, and night means 18:00 to 4:00.", title: "Catches worth coming back for" },
    ],
  },
  {
    id: "ch1-hedgerow",
    part: "Chapter 1",
    title: "Hedgerow and Old Fennimore",
    blocks: [
      { p: "You arrive at the south end of HEDGEROW's crossing lanes. Go straight north through the crossroads and the gate in the stone wall to **FENNIMORE's HOUSE** in its walled kitchen garden. The west lane (to ROUTE 2) is blocked by a hedge-layer who won't stand aside until DR. VALE has sent you out \"properly kitted\". The east lane runs out to ROUTE 5, which is choked with brambles for now." },
      { map: "hedgerow" },
      { map: "fennimore_house" },
      { p: "FENNIMORE gives you the **CENTURYHEART SEED** (your bag calls it the CENTURY SEED). It turned up on his step the morning after the bloom, and it's warm, and it hums. He also gives you FENNIMORE'S LETTER for DR. VALE. Both are key items." },
      { item: "centuryheart_seed", note: "The story's MacGuffin. Keep it: the ROOT RELAY in Chapter 4 wants to hear it." },
      { list: [
        "**SPRING WATER**: on the strip of grass behind FENNIMORE's garden wall. Go the long way round: east past the east cottage, north up its east side, then west along the top of the wall.",
        "**NEEM SPRAY** (hidden): on the grass just north of the old oak on the green, south-east of the crossroads. Face it from the lane above.",
        "**OLIVE** waits at the lavender cottage's garden gate by the west lane. She starts **MOSS IS MISSING**: her cat MOSS has wandered off to ROUTE 2 (reward: 2 SPRING WATER).",
        "The **BAKER** by the bakehouse (south-west) matters later, for THE SAP RUN in Chapter 3.",
      ] },
    ],
  },
  {
    id: "ch1-theft",
    part: "Chapter 1",
    title: "The Theft and Rival Bram",
    blocks: [
      { p: "Head back south. At the top of ROUTE 1, PIP (a kid who knows a fact about every plant) runs up and shows you how catching works: tire a QUICKENED in battle, then throw a TERRARIUM POD. It's a demonstration only; you still don't have pods." },
      { p: "Back in the HERBARIUM, a seedling is gone: the one strong against yours. A boy in a dark coat bolted out with it. The moment you step back outside into FALLOWFIELD, he's waiting for you." },
      { boss: "rival_1", note: "FALLOWFIELD, outside the HERBARIUM. You can lose this one: the story carries on either way, and your team is healed afterwards." },
      { tip: "BRAM has a single level 5 starter with the type advantage over yours. It's winnable if you trained on ROUTE 1. **CHILI vs LILY SEEDPOD**: SEED BURST (WOOD, learned at 6) hits the LILY for double damage. **LILY vs OAK ACORN**: HOARFROST (learned at 7) is FROST, double damage on the OAK. **OAK vs CHILI FLOWER**: the hardest of the three, since everything you know is resisted. Stack SAP SEAL to soak up EMBER SEED, and keep ROUTE 1's WATER FLASK handy. Losing costs you nothing here.", title: "Beating Bram 1" },
      { p: "DR. VALE waves you back in. She reads FENNIMORE's letter (\"the heart blooms and the woods listen\") and gives you **5 TERRARIUM PODS** and **2 WATER FLASKS**. Your mission: catalogue every QUICKENED and earn the eight PRESSED MARKS, starting with HOLLIS in BRAMBLEGATE, on ROUTE 2 west of HEDGEROW. From now on, talking to DR. VALE at her desk heals your team." },
      { p: "Before you go, talk to the **ARCHIVIST** at the reading table in the lab. He starts **THE SURVEY**: press fifteen kinds of QUICKENED and he gives you the seed from drawer nine, which sprouted on the night of the bloom." },
      { species: "snapdragon_sprout", note: "THE SURVEY's reward: a level 10 SNAP SPROUT (DRAGON). It's also wild on ROUTE 3, but only by day and at a 1% rate, so this is the easy way to get one. DRAGON hits GHOST and DRAGON plants for double damage." },
      { checklist: [
        "Starter chosen; FIELD HERBARIUM received",
        "CENTURYHEART SEED from FENNIMORE",
        "5 TERRARIUM PODS and 2 WATER FLASKS from DR. VALE",
        "Hidden WATER FLASK in FALLOWFIELD; ROUTE 1's pods and flask; HEDGEROW's SPRING WATER and NEEM SPRAY",
        "Quests open: SEED LIBRARY (WILLA), THE SURVEY (ARCHIVIST), MOSS IS MISSING (OLIVE)",
        "Catch a MINT SPRIG on ROUTE 1 for HOLLIS",
      ] },
    ],
  },

  // --- Chapter 2 -------------------------------------------------------------------
  {
    id: "ch2-route-2",
    part: "Chapter 2",
    title: "Route 2",
    blocks: [
      { p: "With pods in your bag, HEDGEROW's hedge-layer steps aside. Take the west lane onto ROUTE 2. The lane runs west from the HEDGEROW end, turns north, then west under a long line of ledges. It dips south round a copse (or cut straight across through the tall grass), climbs back north, and finally heads up the west side to BRAMBLEGATE. Two trainers stand right on the lane: BIRDWATCHER ALDER at the first bend north, and BEEKEEPER MAE where the lane climbs back out of the dip." },
      { map: "route_2" },
      { p: "Above the ledges is a high plateau you can only reach from the top of the final climb, just below BRAMBLEGATE. Walk east along it for GARDENER ROSA (optional), a WILD BERRY bush that gives 3 berries, the **COMPOST** on the plateau's edge, and a hidden **SPRING WATER** in the stump in the far north-east corner. When you're done, hop off any ledge to drop back onto the lane." },
      { list: [
        "**NEEM SPRAY**: in the hollow south-west of the dip. Walk west through the tall grass from the bottom of the dip.",
        "**COMPOST** (hidden): in the reeds at the south-east corner of the forest pool, south of the dip.",
        "**MOSS** the cat curls up behind the fallen log by the forest pool, but only once you've talked to OLIVE in HEDGEROW. Kneel by her, then go back and tell OLIVE for 2 SPRING WATER.",
      ] },
      { tip: "**HOLLY SPROUT** (THORN) learns HOARFROST at level 5, so it's another FROST attacker for HOLLIS. Catch a **SUN SEEDLING** by day for MARIGOLD's quest in BRAMBLEGATE. FIDDLEHEAD and BRAMBLE BUD are common, and FOX ROSETTE is much more common here at night. PUMPKIN BUD is rare.", title: "Catches" },
    ],
  },
  {
    id: "ch2-bramblegate",
    part: "Chapter 2",
    title: "Bramblegate",
    blocks: [
      { p: "BRAMBLEGATE is a brick town inside a living bramble wall. You enter through the south arch onto the high street. The **GREENHOUSE** (heal, and the SPECIMEN CABINET where QUICKENED beyond your six are stored) is in the north-east. The **MARKET** is on the west side of the well square, and the **CONSERVATORY** is the glass palace in the north-west, through the gate in the brick court wall. The north arch to ROUTE 3 is guarded by a WARDEN who won't let you onto the NIGHT MEADOW without HOLLIS's mark." },
      { map: "bramblegate" },
      { map: "bramblegate_greenhouse" },
      { map: "bramblegate_market", note: "The only shop until GLASSHOUSE CITY. SUGARBUSH has no MARKET, so stock up here before Chapter 3." },
      { list: [
        "**A SUNNY ORDER**: MARIGOLD, at the east end of the market stalls, needs to see a live SUNFLOWER. Have any stage of the line (SUN SEEDLING, SUN BUD or SUNFLOWER) in your party when you talk to her for a **RAIN JAR** and **$1000**.",
        "**SPRING WATER** (hidden): among the mushrooms under the old oak in the south-west.",
        "A wild rose grows out of the bramble wall at the west end of the market street: 2 **ROSE HIPS** a day.",
        "PIP has walked all the way here and has a fact for you, near the GREENHOUSE.",
      ] },
    ],
  },
  {
    id: "ch2-conservatory",
    part: "Chapter 2",
    title: "Conservatory 1: Hollis",
    blocks: [
      { p: "HOLLIS's CONSERVATORY is a hedge maze under glass, with two levers that swing woven hazel gates. JR. GARDENER HAZEL stands on the entrance terrace and JR. GARDENER LINDEN guards the east lane." },
      { map: "bramblegate_conservatory" },
      { tip: "Leave the lever on the entrance terrace (west side) alone; it's the red herring. 1) Go through the gate that's already open on the **east** side of the terrace and north up the east lane, past LINDEN. 2) Pull the second lever at the top of the east lane. It opens the gate in the middle of the cross lane, and a root locks it open for good. 3) Walk west through that gate into the west lane. 4) Before going north, follow the west lane down to its south end for a **SPRING WATER**. 5) Then go north up the west lane, through the open gate, to HOLLIS. If you pulled the terrace lever by mistake, walk back and pull it again: it opens the west gate but shuts the two you need.", title: "Puzzle solution" },
      { boss: "hollis" },
      { tip: "HOLLIS uses WOOD types. FIDDLEHEAD knows CURL UP (a protect move), so don't waste your strongest hit on the turn he uses it. BRAMBLEBERRY is WOOD/THORN: FIRE, GHOST and BUG moves only do normal damage to it, WOOD moves do a quarter, but **FROST does four times the damage**. A MINT SPRIG, HOLLY SPROUT or LILY SEEDPOD with HOARFROST makes this fight short. He has 2 WATER FLASKS. **CHILI**: EMBER SEED wins the first half, then slug it out with BRAMBLEBERRY (its THORN moves do normal damage to you, and you resist its VINE LASH). **OAK**: PALE TOUCH hits FIDDLEHEAD for double damage, and OAK resists everything they throw, so it's slow but safe. **LILY**: lead with HOARFROST, because their VINE LASH hits you for double damage. Recommended level: 11 or 12.", title: "Strategy" },
      { p: "HOLLIS's lesson: \"You don't catch them. They choose you.\" You get the **BRAMBLE MARK**. Step back out into BRAMBLEGATE and you'll see a man in a grey work coat, a strip of grafting tape round one sleeve, hurrying out through the north arch. The WARDEN now lets you through." },
      { checklist: [
        "BRAMBLE MARK",
        "ROUTE 2: COMPOST and hidden SPRING WATER on the plateau, NEEM SPRAY, hidden COMPOST by the pool",
        "SPRING WATER in HOLLIS's west lane; hidden SPRING WATER under BRAMBLEGATE's oak",
        "A SUNNY ORDER done (RAIN JAR and $1000); MOSS found",
        "Six kinds pressed? Show WILLA in FALLOWFIELD for 3 GLASS PODS",
        "Pods and WATER FLASKS stocked: no shop until GLASSHOUSE CITY",
      ] },
    ],
  },

  // --- Chapter 3 -------------------------------------------------------------------
  {
    id: "ch3-route-3",
    part: "Chapter 3",
    title: "Route 3 and the Night Meadow",
    blocks: [
      { p: "From BRAMBLEGATE's north arch the road bends west into a hedged lane, where HIKER GUS waits. It turns north along the east shore of a lily pond, past FLORIST PETRA, then squeezes through the **WOODLAND PASS**, a cleft between cliffs. A ROOTSTOCK grunt pretending to be a \"surveyor\" blocks the pass. Stepping up to him starts a battle you must win (NETTLE SHOOT 9 and BRAMBLE BUD 10). Beyond is the **NIGHT MEADOW**, where BIRDWATCHER OWEN watches the path, and then the road north to SUGARBUSH." },
      { map: "route_3" },
      { tip: "The **SPRING WATER** you can see past the trees on the pond's east side sits in a pocket between two ledges. Just north of PETRA, where the path opens east, walk onto the plateau and go south to its bottom edge. Hop the ledge down into the pocket, take the SPRING WATER, then hop the next ledge south back onto the road.", title: "The ledge pocket" },
      { tip: "In the middle of the meadow is a ring of mushrooms. You can walk on mushrooms, so step into the ring and press A facing its empty centre: a hidden **RAIN JAR**. The meadowkeeper standing next to it hints that folk used to leave gifts in the middle.", title: "The fairy ring" },
      { list: [
        "**COMPOST**: tucked in the tall grass at the meadow's north-east corner.",
        "**TERRARIUM POD**: in the grass field west of GUS's hedged lane.",
        "**2 WATER FLASKS** (hidden): in the reeds on the lily pond's east shore, beside the path.",
        "WILD BERRY bush on the pond plateau; ROSE HIP bush in the hedged lane.",
      ] },
      { tip: "After dark (18:00 to 4:00), the meadow fills with **MOON SEED** (GHOST), the majority of night encounters. GHOST hits SHEARS's MAPLE SPROUT for double damage and shrugs off BUG moves, so it's useful in NELL's CONSERVATORY too. ORRIN sits on the bench at the meadow's north-west corner only at night: catch any MOONFLOWER stage for his **MOONWATCH** quest (2 GLASS PODS and his grandmother's star log). By day you'll find **ROSE BUD** (THORN, good against NELL), PUMPKIN BUD and, at a 1% rate, **SNAP SPROUT**. The boggy margin along the pond's east and south edges, right beside the path, holds **BULRUSH** (WATER), a good answer to a FIRE rival.", title: "Day and night catches" },
    ],
  },
  {
    id: "ch3-sugarbush",
    part: "Chapter 3",
    title: "Sugarbush",
    blocks: [
      { p: "SUGARBUSH is a maple-syrup town in trouble: every maple on the grove lane bristles with taps, and the sugar shack's chimney is cold. The **GREENHOUSE** is east of the square with the great SUGAR MAPLE. The grove lane runs north from the square to SUGARBUSH GROVE. NELL PITCHER's CONSERVATORY stands in the fenced bog to the west, but a worried villager blocks the boardwalk gate until the grove is sorted out. The east road is blocked by a sap collector's broken cart until Chapter 4." },
      { map: "sugarbush" },
      { map: "sugarbush_greenhouse" },
      { tip: "There's no MARKET in SUGARBUSH. If you're short on pods or flasks, the walk back to BRAMBLEGATE's MARKET is the only option until GLASSHOUSE CITY.", title: "No shop here" },
      { p: "A **COMPOST** is hidden behind the woodpile by the SUGAR SHACK in the north-east: face the stump from its west side." },
    ],
  },
  {
    id: "ch3-grove",
    part: "Chapter 3",
    title: "Sugarbush Grove",
    blocks: [
      { p: "The grove is a small maze of sugar maples, the tapped ones trailing tubing into ROOTSTOCK's drums. From the entrance clearing the lane forks. Go **west** first to a dead end with a **RAIN JAR**. Then take the narrow lane **east and north**: the first grunt waits in a side gap and spots you as you walk past. The lane opens into ROOTSTOCK's camp, watched by the second grunt at its mouth. A **GLASS POD** sits behind the crates on the camp's east side." },
      { map: "sugarbush_grove" },
      { p: "From the camp, a trail climbs north up the west side to a long avenue. Right where you reach it, a little nook to the north holds another **GLASS POD**. Then walk east along the avenue; the third grunt steps out of a gap above it as you pass under him. At the avenue's east end, head north through the cleft. Stepping into it starts the scene with SHEARS." },
      { boss: "shears", note: "ROOTSTOCK's first admin. A must-win battle." },
      { tip: "Both of SHEARS's plants are WOOD. MAPLE SPROUT takes double damage from FIRE, FROST, GHOST and BUG. BRAMBLEBERRY takes normal damage from all of those except FROST, which does four times the damage. MOON SEED from the NIGHT MEADOW and any FROST user are ideal. LILY players should be careful: SAP DRAIN and LEAF EDGE hit you for double damage, so open with COLD MIST if you've reached level 12. SHEARS carries no healing items. Recommended level: 14 or 15. The grunts' MAPLE SAMARAS and MAPLE SPROUT can be caught wild here too (MAPLE SPROUT is rare).", title: "Strategy" },
      { tip: "Once SHEARS leaves, the clearing is yours: a **GLASS POD** is hidden under the stump on the clearing's east side. The path north out of the clearing is closed by a ranger until Chapter 5.", title: "Don't miss" },
      { p: "With ROOTSTOCK gone, the taps drop out and the maples stir. Walk back down to SUGARBUSH." },
    ],
  },
  {
    id: "ch3-bram",
    part: "Chapter 3",
    title: "Bram in Sugarbush",
    blocks: [
      { p: "The villager at the boardwalk gate has gone, and BRAM stands in his place. As you step up beside him, he turns. His partner wears a grey **GRAFT COLLAR**: it was grown weeks early, and it won't turn toward him." },
      { boss: "rival_2", note: "SUGARBUSH, at the boardwalk gate. You must win this one; if your team wilts, you go back to your last heal point and he is still waiting." },
      { tip: "Every version has BRAMBLEBERRY 11 (FROST does four times the damage) and DANDELION 13 (BLOOM: weak to BUG, THORN and FROST). His ace is his starter's second stage at 14. **You chose OAK, he has GREEN CHILI** (FIRE): use a WATER type such as BULRUSH from ROUTE 3's bog, or a THORN type, which resists FIRE. **You chose CHILI, he has LILY PAD** (WATER): WOOD and BLOOM moves do double damage (MAPLE SPROUT, PUMPKIN BUD, LION'S TOOTH), but its HOARFROST and COLD MIST hit those types hard too, so hit first. **You chose LILY, he has OAK SAPLING** (WOOD): your own HOARFROST and COLD MIST do double damage. MOON SEED's GHOST moves do too, but its PALE TOUCH hits GHOST types just as hard. Recommended level: 15 or 16.", title: "Strategy" },
      { p: "Now that the sap is running, the SYRUP MAKER by the SUGAR SHACK offers **THE SAP RUN**: carry the first SYRUP JAR of the year to the BAKER in HEDGEROW for **$1500** and **5 WILD BERRIES**. It's a long walk back now, but in Chapter 4 ROUTE 5 opens a shortcut from GLASSHOUSE CITY straight to HEDGEROW, so take the jar and deliver it then." },
    ],
  },
  {
    id: "ch3-conservatory",
    part: "Chapter 3",
    title: "Conservatory 2: Nell Pitcher",
    blocks: [
      { p: "Walk west along the boardwalk across the bog, then north to the CONSERVATORY door. The bog on either side is wild-encounter ground (as is the bog inside the CONSERVATORY): **DEW ROSETTE**, **TINY FLYTRAP**, **TINY PITCHER** and BULRUSH. They're the first BUG types you can catch, and bugs hit BLOOM plants (all of FLORA VANCE's team) for double damage, so they're worth picking up." },
      { map: "sugarbush_conservatory" },
      { tip: "Three sluice channels cut the room. The valve at the entrance sends the water west or east; the valve at the top of the east lane drains the channel below NELL's dais. At the start the west channel is full and the east one is dry. 1) Cross the **dry east channel** on its sunken boardwalk and go up the east lane; JR. TANSY battles you on the way. 2) Turn the valve at the top of the east lane: the channel under the dais drains. 3) Walk back down to the entrance and turn the **entrance valve**: the west channel drains (and the east one floods). 4) Cross the west channel, go up the west lane's boardwalk past JR. SORREL, cross the drained channel under the dais and climb to NELL. If you turn the entrance valve first, the west lane only leads to a full channel: go back and do the east lane first.", title: "Puzzle solution" },
      { boss: "nell" },
      { tip: "All three are BUG types, and both FLYTRAPS also carry VINE LASH. **FIRE** hits them for double damage and resists both BUG and WOOD moves, so CHILI or GREEN CHILI cruises through. **THORN** also hits bugs for double damage and resists BUG moves (NETTLE SHOOT, ROSE BUD, HOLLY SPROUT), but VINE LASH hits THORN plants for double damage. STICKY DEW cuts your speed by two stages, and FLYTRAP's SNAP TRAP lands critical hits often. **OAK** players: bug moves hit you for double damage, so SPLINTER (THORN, learned at 14) is your best attack; let a THORN or FIRE partner do most of the work. NELL has 2 SPRING WATER. Recommended level: 17 or 18.", title: "Strategy" },
      { p: "NELL gives you the **SUNDEW MARK** and confides that the bog has hummed at night ever since the bloom. Then the CONSERVATORY telephone rings: it's DR. VALE. FENNIMORE's grandfather's diary says the ground hummed after the last bloom too, and the seed hums at the same pitch as the bog. She asks you to take the CENTURYHEART SEED to the **ROOT RELAY in GLASSHOUSE CITY**, east of SUGARBUSH. The sap collector has fixed his cart, so the east road is open." },
      { checklist: [
        "SUNDEW MARK",
        "ROUTE 3: the ledge-pocket SPRING WATER, the fairy ring RAIN JAR, 2 hidden WATER FLASKS, COMPOST, TERRARIUM POD",
        "SUGARBUSH GROVE: RAIN JAR, 2 GLASS PODS, hidden GLASS POD under the stump",
        "MOONWATCH done (night, MOON SEED)",
        "SYRUP JAR in your bag for THE SAP RUN",
        "A BUG catch from the bog (DEW ROSETTE, TINY FLYTRAP or TINY PITCHER) for FLORA",
      ] },
    ],
  },

  // --- Chapter 4 -------------------------------------------------------------------
  {
    id: "ch4-route-4",
    part: "Chapter 4",
    title: "Route 4 to Glasshouse City",
    blocks: [
      { p: "The east road leaves SUGARBUSH just inside its south entrance and runs east onto ROUTE 4. The road goes straight east past the **ORCHARD** (north) and the CIDER PRESS yard (south), crosses the river on **stepping stones**, then bends south round a lily pond to GLASSHOUSE CITY's west gate. ORCHARDIST RUSSET looks down onto the road from the orchard, and SCHOOLKID TAM waits just past the stepping stones; you can slip past either by keeping to the far edge of the road. BIRDWATCHER KIT stands right beside the narrow path round the pond and can't be avoided. BEEKEEPER CLEM in the south meadow and HIKER FORD up on the rise are optional." },
      { map: "route_4" },
      { list: [
        "**SPRING WATER** and **listening post 1** are up on the rise north of the lily pond. A path climbs north from the road just before the city gate. The rise's west lip is a ledge that drops you back by the stepping stones.",
        "**GLASS POD**: at the far east end of the south-east meadow.",
        "**SPRING WATER** (hidden): in the reeds on the river's west bank, just south of the road.",
        "**COMPOST** (hidden): in the map's far south-west corner, south of the orchardist's cottage.",
        "**RAIN JAR**: inside the ring of brambles on the orchard's east edge. You'll need PRUNE, so come back later in this chapter.",
      ] },
      { tip: "**DANDELION** (the grown LION'S TOOTH) joins the wild roster here, and **MAPLE SPROUT** is far more common than in the grove. **APPLE PIP** is common by day, and **MINT SPRIG** is back. The boggy margin downstream of the stones has DEW ROSETTE, BULRUSH and TINY PITCHER. Rack up levels here: FLORA's ace is level 22.", title: "Catches" },
    ],
  },
  {
    id: "ch4-glasshouse-city",
    part: "Chapter 4",
    title: "Glasshouse City",
    blocks: [
      { p: "A whole city under one glass dome. From the west gate: the **GREENHOUSE** is just north-east of you, and the fountain square fills the middle. The big **MARKET** is east of the square, with a row of street stalls in front of it. Along the north side, from west to east, stand the **ROOT RELAY** and its mast, FLORA VANCE's **ROSE CONSERVATORY** at the top of the lamp-lined avenue, and the **PALM HOUSE**. In the south are the **NURSERY GARDEN** (south-west), the lily pool, the townhouses, and the south gate to ROUTE 5. The east gate is guarded until a later chapter." },
      { map: "glasshouse_city" },
      { p: "The ROSE CONSERVATORY is locked: a card on the door says FLORA is at the ROOT RELAY open day. That's where DR. VALE sent you anyway." },
      { map: "glasshouse_greenhouse" },
      { map: "glasshouse_market", note: "Two counters: pods and medicine on the left, plant care on the right. The first place to buy GLASS PODS." },
      { map: "glasshouse_house", note: "The GLAZIER's family. Nothing to collect, just some history of the dome." },
      { list: [
        "**PLANT FOOD** (hidden): in the east rose garden, beside the CONSERVATORY.",
        "**GLASS POD** (hidden): at the bottom of the lily pool in the south-west. Face the pool and press A.",
        "**ROSE HIP** bush in the west rose garden.",
        "Listening post 2 stands on the square's north-west lawn (it only matters once WREN's quest is running).",
      ] },
    ],
  },
  {
    id: "ch4-root-relay",
    part: "Chapter 4",
    title: "The Root Relay Open Day",
    blocks: [
      { p: "The RELAY is in the north-west corner of the city. Walk through the lobby and step through the doorway into the **LISTENING ROOM** to start the scene. DR. MAREN ODELL runs the station, FLORA VANCE paid for the rose-gold sensors, and WREN, the network engineer, hears your bag humming. You set the CENTURYHEART SEED on the listening desk, and something enormous deep under the valley answers with a single pulse. WREN asks to borrow the seed for a night; ODELL refuses for you. FLORA leaves to reopen her CONSERVATORY and challenges you to come and battle." },
      { map: "glasshouse_relay" },
      { p: "When the scene ends, talk to WREN again to start **LISTENING POSTS**: three sensor posts went quiet after the pulse. Face each one and press A to read it: one on ROUTE 4's rise, one on the city square's north-west lawn, one in the PALM HOUSE. Then report back for **$2000** and **3 GLASS PODS**." },
      { tip: "Finish LISTENING POSTS before the end of Chapter 8. WREN leaves the RELAY for good then, and the quest can't be handed in after that.", title: "Missable" },
      { p: "Outside, you spot a ROOTSTOCK grey coat writing notes at the foot of the RELAY's mast before he slips away. Then the fan by FLORA's CONSERVATORY offers **FAN MAIL**: take his letter, and give it to FLORA after you beat her for a **SIGNED PHOTO** and **$1000**." },
    ],
  },
  {
    id: "ch4-nursery",
    part: "Chapter 4",
    title: "The Nursery Garden and Bram",
    blocks: [
      { p: "The NURSERY GARDEN is in the city's south-west corner. The first time you walk in after the RELAY, BRAM is at the counter, demanding a stronger seed from PEONY. His collared partner is bigger and paler than before." },
      { map: "glasshouse_nursery", flags: { relay_listened: true } },
      { boss: "rival_3", note: "NURSERY GARDEN, the first visit after the RELAY. You may lose; the scene plays on and PEONY heals your team afterwards." },
      { tip: "BRAMBLEBERRY 18 and DANDELION 19 lead, and his ace is the collared stage-two starter at 21, with four attacking moves. **You chose OAK, his GREEN CHILI** has CHILI BURST and SMOULDER: bring a WATER type (BULRUSH, TINY PITCHER, LOTUS SEED from the PALM HOUSE) or a THORN type, which resists FIRE. **You chose CHILI, his LILY PAD** has UNDERTOW and COLD MIST: WOOD and BLOOM moves do double damage (APPLE PIP, MAPLE SPROUT, DANDELION), and it also carries SAP DRAIN. **You chose LILY, his OAK SAPLING** has ACORN DROP, SPLINTER and VINE LASH: COLD MIST does double damage, and so does any FIRE, GHOST or BUG move. Recommended level: 21. The PALM HOUSE is a good place to train first.", title: "Strategy" },
      { p: "BRAM shoves straight through the keepers' hedge on his way out. PEONY waters your team, and LUPIN hands you his old **GARDEN SHEARS**: face a bramble and press A to **PRUNE** it." },
      { item: "pruning_shears", note: "The field move PRUNE: face a bramble and press A. It clears that bramble for good. Optional for now, but required in Chapter 10, and this is the only place to get it." },
      { p: "PEONY's counter is the game's breeding service. Leave up to two QUICKENED with her and they gain experience with every step you take (but learn no moves and never grow). Every 256 steps, two boarders that share pollinators may set a seed: a 50% chance for two of the same line, 20% for different lines that share pollinators. Carry the seed in your party and it sprouts after 600 to 1200 steps. Taking a boarder back costs $100, plus $100 for every level it gained. LUPIN, out in the yard, starts **THE FIRST SEED**: sprout any NURSERY seed for a **RAIN JAR** and **5 PLANT FOOD**. He also tells you when a seed is waiting." },
    ],
  },
  {
    id: "ch4-palm-house",
    part: "Chapter 4",
    title: "The Palm House",
    blocks: [
      { p: "The PALM HOUSE, in the north-east of the city, is a hot, misty tropical glasshouse with a lotus pool in the middle. A boardwalk crosses the pool from west to east, and a ring of paths runs round it. RESEARCHER LIN watches the path just north of the entrance. FLORIST AMARYL watches the east side of the ring. Every patch of undergrowth under the palms is encounter grass." },
      { map: "palm_house" },
      { list: [
        "**Listening post 3**: in the north-east thicket.",
        "**GLASS POD**: in the far north-east corner. **SPRING WATER**: on the west side.",
        "**PLANT FOOD** (hidden): in the potted palm by the north wall. **COMPOST** (hidden): on a lily pad at the pool's north edge.",
      ] },
      { tip: "**ORCHID KEIKI** is far more common at night. It grows into ORCHID SPIKE at 16, then into MOTH ORCHID (FLORA's ace) at 22, but that second step only happens at night. **MONSTERA TIP** and **LOTUS SEED** are here day and night; LOTUS SEED is most common in the pool's muddy margin. **PARADISE BUD** is the rare find: daytime only, at a 3% rate. It grows into CRANE FLOWER (BLOOM/FIRE) at 28.", title: "Catches" },
    ],
  },
  {
    id: "ch4-route-5",
    part: "Chapter 4",
    title: "Route 5 and the PRUNE Detours",
    blocks: [
      { p: "With the GARDEN SHEARS, take the city's south gate. Brambles close ROUTE 5 just past the gate: PRUNE one to get in. The old drove road to HEDGEROW has gone wild since the bloom. GARDENER IVY waits near the top and HIKER DALE in the middle, both with teams at levels 19 and 20, so this is good training before FLORA. The lane winds south through meadow and tall grass. At the far west end, more brambles block the way out; PRUNE them and you come out on the east side of HEDGEROW." },
      { map: "route_5" },
      { list: [
        "**GLASS POD**: inside the ring of brambles on the west side. PRUNE your way in.",
        "**SPRING WATER**: on the north-east rise (walk up from its south-east corner).",
        "**COMPOST** (hidden): in the old stump near the south end. **RAIN JAR** (hidden): among the flowers at the lane's south-west end.",
      ] },
      { tip: "ROUTE 5 has **PEPPERMINT** (FROST, the grown form of MINT SPRIG), **BRAMBLEBERRY**, **FERN FROND**, **SUN BUD** by day and the rare **GREAT NETTLE**. PEPPERMINT and GREAT NETTLE are just what you want against FLORA.", title: "Catches" },
      { tip: "Now that HEDGEROW is a short walk from GLASSHOUSE CITY, deliver THE SAP RUN's SYRUP JAR to the BAKER. Then sweep back through the earlier routes with PRUNE: **ROUTE 1**: a RAIN JAR hidden in the bramble-choked nook just west of the north exit to HEDGEROW. **HEDGEROW**: a PLANT FOOD hidden in the bakehouse garden's south-west corner. **ROUTE 2**: the bramble at the west end of the ledges is a shortcut up onto the plateau. **ROUTE 3**: 2 SPRING WATER hidden in the clearing behind the brambles at the NIGHT MEADOW's south-east edge. **ROUTE 4**: the RAIN JAR in the bramble ring on the orchard's east edge.", title: "PRUNE return trips" },
    ],
  },
  {
    id: "ch4-rose-conservatory",
    part: "Chapter 4",
    title: "Conservatory 3: Flora Vance",
    blocks: [
      { p: "The ROSE CONSERVATORY opens after the RELAY. It's a rose maze with two levers that swing trellis gates. ARRANGER POSY guards the east wing and GENTLEMAN WEXLEY the west wing; each one only sees the tile right in front of them, but both stand where you have to walk." },
      { map: "glasshouse_conservatory" },
      { tip: "Lever 1 is on the entrance hall's west wall. Lever 2 is at the top of the east wing. At the start the east gate is open and the west gate and the stage gate are shut. 1) Go through the open **east** gate, up the east wing past POSY, and pull **lever 2**: the stage gate opens (and the west alcove's gate shuts). 2) Walk back to the hall and pull **lever 1**: the west gate opens (and the east one shuts). 3) Go up the west wing past WEXLEY, east along the top corridor, and through the stage gate to FLORA. For the **PLANT FOOD** in the west alcove, pull lever 1 *first*: walk up the west wing, west along the corridor and down into the alcove to grab it. Then go back, pull lever 1 again to reopen the east gate, and follow steps 1 to 3. A **NEEM SPRAY** is also hidden in the rose bed by the hall's east wall.", title: "Puzzle solution" },
      { boss: "flora" },
      { tip: "This is the early difficulty spike. FLORA's team is all BLOOM: WHITE CLOVER 19 (LUCKY LEAF lands critical hits often, and ROOT SNARE leaves you ROOTBOUND: half speed, and sometimes unable to move. NEEM SPRAY or a ROSE HIP cures it), WILD ROSE 20 (THORN/BLOOM: ROSE THORN also crits often, and PERFUME cuts your attack by two stages) and MOTH ORCHID 22. The ORCHID uses SUN TRACK to raise its special attack by two stages, then sweeps with WIND SCATTER, which never misses. It also carries MOONBEAM (GHOST, double damage on WOOD) and VELAMEN (WATER, double damage on FIRE), so knock it out before it sets up. She has one SPRING WATER. Ignore the CONSERVATORY guide's \"bring fire\" advice: FIRE only does normal damage to BLOOM plants, and WILD ROSE resists it. What works is **FROST** (double damage on the CLOVER and the ORCHID, four times on the ROSE: LILY PAD's COLD MIST, PEPPERMINT, HOLLY SPROUT), **THORN** (NETTLE, ROSE BUD, BRAMBLEBERRY, OAK's SPLINTER) and **BUG** (DEW ROSETTE, FLYTRAP, TINY PITCHER), all double damage on the CLOVER and the ORCHID. WATER and WOOD moves also hit WILD ROSE for double damage. FROST users should watch out for ROSE THORN, which hits them for double damage. Recommended level: 23 or 24.", title: "Strategy" },
      { p: "FLORA cries, loudly, and hands over the **ROSE MARK**. If you're carrying the fan's letter, **talk to her again before you leave** to deliver it for the SIGNED PHOTO and $1000. You can also bring it back later." },
      { tip: "Walking out of the CONSERVATORY with the ROSE MARK ends the chapter. DR. VALE calls: something under the valley answered your seed, and in CEDARHALLOW, to the north, the fire-cones of the BURNT STAND have opened with no fire. Chapter 5 begins straight away, so **SAVE from the menu** before you set off. Finish any errands in the city first, or come back for them later. Nothing here is lost.", title: "End of the chapter" },
      { checklist: [
        "ROSE MARK (three PRESSED MARKS)",
        "GARDEN SHEARS from LUPIN (PRUNE)",
        "LISTENING POSTS done: all three posts read",
        "FAN MAIL delivered (SIGNED PHOTO)",
        "THE SAP RUN delivered to HEDGEROW's BAKER",
        "PRUNE detours: ROUTE 1, HEDGEROW, ROUTE 3, ROUTE 4 and ROUTE 5",
        "THE SURVEY: 15 kinds pressed? Visit the ARCHIVIST for SNAP SPROUT",
        "Optional: board two compatible QUICKENED at the NURSERY GARDEN for THE FIRST SEED",
      ] },
      { p: "Next stop: the north path out of SUGARBUSH GROVE, which the ranger now opens, and the old cedars of Chapter 5." },
    ],
  },
];
