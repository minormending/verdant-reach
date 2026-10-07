// Chapter 5's staging and progression (docs/CH5_IDS.md §F).
// Voice: docs/STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.
import type { ScriptCmd } from "../../contracts";
import { emote, face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";
import { COUNTER, type StarterLine } from "../trainers";

const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (frames = 30): ScriptCmd => ({ op: "cameraReset", frames });
const call = (script: string): ScriptCmd => ({ op: "call", script });
const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

export const ch5Scripts: Scripts = {
  ch5_grove_ranger: [
    face("grove_ranger", "toPlayer"),
    say("North path's shut. Ranger's orders. I'm the ranger.", "RANGER"),
    say("The cedars have been restless. Creaking all night, with no wind.", "RANGER"),
  ],
  ch5_arrival: [
    ifFlags({ ch5_arrived: false }, [
      camera(18, 10, 60),
      wait(20),
      say("CEDARHALLOW. A town among cedars a thousand years old."),
      say("Lamps glow inside hollow trunks. The trees are still alive around them."),
      say("It's very quiet here. The kind of quiet that listens back."),
      cameraReset(),
      flag("ch5_arrived"),
      flag("visited_cedarhallow"),
    ]),
  ],
  ch5_conservatory_door: [
    ifFlags({ burnt_vision_seen: false }, [
      { op: "sfx", id: "bump" },
      say("Locked. A note on the door: \"At the BURNT STAND. Back by dawn. -M.\""),
      movePlayer("down"),
    ], [
      ifFlags({ got_lantern: false }, [
        say("The door gives. Inside, it's pitch black. You'll need a light."),
        movePlayer("down"),
      ]),
    ]),
  ],
  ch5_grunts: [
    ifFlags({ ch5_grunts_seen: false }, [
      // The camp: cone_sack NPCs at (9,20), (10,20) and (13,19).
      camera(11, 19, 60),
      wait(20),
      face("grunt_bs_1", "down"),
      say("Grey coats. ROOTSTOCK, shovelling open pine cones into sacks."),
      say("Keep those sacks dry! Damp cones are no use to anyone.", "GRUNT"),
      say("They're for the doctor. Every open cone. Every last one.", "GRUNT"),
      say("Opened without a fire... The doctor will want to know how.", "GRUNT"),
      emote("grunt_bs_2", "..."),
      wait(20),
      flag("ch5_grunts_seen"),
      cameraReset(),
    ]),
  ],
  ch5_cone_sack: [
    say("A sack of opened pine cones. A tag on the cord reads FOR THE DOCTOR."),
  ],
  rival_4: [
    ifFlags({ rival_4_done: false }, [
      camera(29, 15, 30),
      { op: "music", id: "rival_appears" },
      face("bram", "toPlayer"),
      emote("bram", "!"),
      say("You. Here. Of course you're here.", "BRAM"),
      say("Behind him stands his partner. Fully grown now. Far too soon."),
      say("The GRAFT COLLAR has bitten deep. The stem around it weeps sap."),
      say("Look at it. Full grown, months early. The collar did that.", "BRAM"),
      say("So don't tell me it doesn't work. Go on. PROVE it.", "BRAM"),
      cameraReset(20),
      byStarter((line) => [{ op: "battle", trainer: `rival_4_${COUNTER[line]}`, canLose: true }]),
      { op: "ifLastBattle", result: "won", then: [
        emote("bram", "..."),
        say("...How? It's BIGGER. It's bigger than yours!", "BRAM"),
        say("You useless... No. That's not... It tried. It tried.", "BRAM"),
      ], else: [
        say("See? Grown. Strong. That's what the collar's FOR.", "BRAM"),
        wait(20),
        say("His partner sags where it stands. It doesn't straighten up."),
      ] },
      wait(30),
      say("The collar creaks tighter. His partner shudders, root to tip."),
      emote("bram", "?"),
      say("Hey. Hey! Stand up. Come on. Please stand up.", "BRAM"),
      say("It's helping. My father says it helps. It's HELPING.", "BRAM"),
      say("Stop looking at it! It's mine. I look after it!", "BRAM"),
      camera(29, 12, 30),
      // The ash lane at x29 is clear from y15 to y9, beside the dead trunks.
      moveNpc("bram", ...steps("up", 6)),
      { op: "hideNpc", npc: "bram" },
      flag("rival_4_done"),
      cameraReset(),
      { op: "restoreMusic" },
      say("BRAM stalks off into the ash. He doesn't sound sure. Not this time."),
      // Either story-battle result must leave the player able to explore.
      { op: "heal" },
    ]),
  ],
  ch5_vision: [
    ifFlags({ rival_4_done: true, burnt_vision_seen: false }, [
      camera(34, 13, 45),
      say("In the burnt heart lies a single pine cone, still sealed tight with resin."),
      say("<PLAYER> picks it up. It's warm. It's getting warmer."),
      wait(30),
      say("There's no flame anywhere. Still, with a soft crack, the cone opens."),
      { op: "shake", frames: 50 },
      { op: "flash", color: "gold" },
      { op: "sfx", id: "pulse" },
      { op: "still", image: "fire_cone_vision" },
      wait(40),
      say("Pale trunks. Hundreds of them, all leaning toward you."),
      say("Under their roots, something vast stirs in the dark."),
      wait(40),
      say("It flinches, as if you'd touched a bruise. Then it's gone."),
      { op: "stillClear" },
      wait(30),
      say("Ash, and silence. The open cone sits in your shaking hands."),
      flag("burnt_vision_seen"),
      { op: "showNpc", npc: "morrow_bs" },
      face("morrow_bs", "toPlayer"),
      emote("morrow_bs", "..."),
      say("Nearby, someone kneels by the GHOST PIPES. Very still. Listening."),
      cameraReset(),
    ]),
  ],
  ch5_morrow_burnt: [
    ifFlags({ burnt_vision_seen: true, morrow_returned: false }, [
      { op: "still", image: "morrow_listening" },
      wait(40),
      say("A tall man in a long coat, his ear pressed to a clump of pale GHOST PIPES."),
      { op: "stillClear" },
      wait(20),
      face("morrow_bs", "toPlayer"),
      say("You saw it too.", "MORROW"),
      wait(30),
      say("...It isn't dreaming.", "MORROW"),
      say("It's frightened.", "MORROW"),
      say("GHOST PIPES feed on the fungi under the roots. I hear what they hear.", "MORROW"),
      ifFlags({ got_lantern: false }, [
        say("You'll need a light. Ask the keeper in THE HOLLOW.", "MORROW"),
        say("I'm MORROW. I keep the CONSERVATORY. Come when you can see in the dark.", "MORROW"),
      ], [
        say("You carry FOXFIRE already. Good. The dark won't stop you.", "MORROW"),
        say("I'm MORROW. I keep the CONSERVATORY. Come and find me there.", "MORROW"),
      ]),
      // From (34,11), down to the east-west lane, then toward town at x28.
      camera(31, 15, 30),
      moveNpc("morrow_bs", ...steps("down", 4), ...steps("left", 6)),
      flag("morrow_returned"),
      { op: "hideNpc", npc: "morrow_bs" },
      cameraReset(),
    ]),
  ],
  ch5_shrine_keeper: [
    face("shrine_keeper", "toPlayer"),
    ifFlags({ burnt_vision_seen: true, got_lantern: false }, [
      say("You've seen them. The pale trees. It's there in your face.", "KEEPER"),
      say("The old forest is stirring. I've felt it in the floor all autumn.", "KEEPER"),
      say("Fungi are the old roads.", "KEEPER"),
      say("They'll light yours.", "KEEPER"),
      give("foxfire_lantern"),
      flag("got_lantern"),
      say("FOXFIRE. A fungus that grows on old wood, and glows all by itself.", "KEEPER"),
      say("Keep it in your bag. Wherever it's dark, it will GLOW for you.", "KEEPER"),
    ], [
      say("I keep the shrines in this cedar. Hollow as a drum, and still alive.", "KEEPER"),
      say("Under the floor, threads of fungus knit the whole forest together.", "KEEPER"),
    ]),
    ifFlags({ got_lantern: true }, [call("q_shrine_offerings")]),
  ],
  morrow: [
    face("morrow", "toPlayer"),
    ifFlags({ beat_morrow: true }, [
      say("Shh. ...It's gone quieter down there. Not calmer. Quieter.", "MORROW"),
      say("A forest goes quiet when something is hunting it.", "MORROW"),
    ], [
      ifFlags({ burnt_vision_seen: true, got_lantern: true }, [
        say("You crossed in the dark. That's most of the lesson already.", "MORROW"),
        say("A GHOST PIPE has no green in it at all. It can't eat light.", "MORROW"),
        say("It drinks from the fungi that link the trees. All it has, the forest lent it.", "MORROW"),
        say("Let's see what you've been lent. Listen closely.", "MORROW"),
        { op: "battle", trainer: "morrow" },
        { op: "ifLastBattle", result: "won", then: [
          wait(20),
          emote("morrow", "..."),
          say("You listened. Most people only look.", "MORROW"),
          say("The PIPE MARK. A ghost pipe turns black when it's pressed. Mine always do.", "MORROW"),
          { op: "giveMark", mark: "pipe_mark" },
          say("Root and fungus, all joined up under us. One forest-wide nerve.", "MORROW"),
          say("At its heart is what the keeper calls the ELDER. It's listened since the LONG BLOOM.", "MORROW"),
          wait(30),
          say("Something you carry called to it. It answered. Not angry. Afraid.", "MORROW"),
          say("Keep listening, <PLAYER>. Someone should.", "MORROW"),
        ] },
      ], [
        say("Not yet. Go to the BURNT STAND first. Then find a light.", "MORROW"),
      ]),
    ]),
  ],
  ch5_end: [
    ifFlags({ beat_morrow: true, ch5_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("Behind you, a telephone rings. MORROW leans out of the door and holds up the receiver."),
      say("<PLAYER>? FOUR MARKS! I've told everyone. I told the postman twice.", "VALE"),
      { op: "music", id: "prologue_bloom" },
      say("But listen. I've had a letter from SALTMARSH HARBOUR, down on the coast.", "VALE"),
      say("The LANTERN TREE on the point has gone dark. Sick, they think.", "VALE"),
      say("CAPTAIN REYES won't battle anyone until it's well. Not even you.", "VALE"),
      wait(30),
      say("And <PLAYER>... someone's been asking about your seed at the docks.", "VALE"),
      emote("player", "..."),
      say("I posted you a GLIDER SEED, care of the GREENHOUSE. Has it come?", "VALE"),
      give("glider_seed"),
      say("Outdoors, pick GLIDE from your menu. It'll carry you to any town you've been.", "VALE"),
      say("Glide back south, and make for the coast from there.", "VALE"),
      say("And keep that seed close. Closer than close. Mind how you go.", "VALE"),
      flag("ch5_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
};
