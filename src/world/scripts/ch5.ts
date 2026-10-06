// Chapter 5's staging and progression (docs/CH5_IDS.md §F).
// Dialogue placeholders preserve the final scene's boxes and speaker changes.
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
    say("TODO(text): The north path is closed.", "RANGER"),
    say("TODO(text): The old cedars are restless.", "RANGER"),
  ],
  ch5_arrival: [
    ifFlags({ ch5_arrived: false }, [
      camera(18, 10, 60),
      wait(20),
      say("TODO(text): Cedarhallow stands among living cedars.", "NARRATOR"),
      say("TODO(text): Lamps shine in hollow trunks.", "NARRATOR"),
      say("TODO(text): The forest seems to be listening.", "NARRATOR"),
      cameraReset(),
      flag("ch5_arrived"),
      flag("visited_cedarhallow"),
    ]),
  ],
  ch5_conservatory_door: [
    ifFlags({ burnt_vision_seen: false }, [
      { op: "sfx", id: "bump" },
      say("TODO(text): Morrow is out at the Burnt Stand.", "NARRATOR"),
      movePlayer("down"),
    ], [
      ifFlags({ got_lantern: false }, [
        say("TODO(text): It is pitch black; bring a light.", "NARRATOR"),
        movePlayer("down"),
      ]),
    ]),
  ],
  ch5_grunts: [
    ifFlags({ ch5_grunts_seen: false }, [
      // Cone sacks: crates/barrels at (10..12,19) and (10,20).
      camera(11, 19, 60),
      wait(20),
      face("grunt_bs_1", "down"),
      say("TODO(text): Grunts bag the opened cones.", "NARRATOR"),
      say("TODO(text): Keep the cone sacks dry.", "GRUNT"),
      say("TODO(text): These are for the doctor.", "GRUNT"),
      say("TODO(text): The doctor wants every opened cone.", "GRUNT"),
      emote("grunt_bs_2", "..."),
      wait(20),
      flag("ch5_grunts_seen"),
      cameraReset(),
    ]),
  ],
  rival_4: [
    ifFlags({ rival_4_done: false }, [
      camera(29, 15, 30),
      { op: "music", id: "rival_appears" },
      face("bram", "toPlayer"),
      emote("bram", "!"),
      say("TODO(text): Bram challenges the player again.", "BRAM"),
      say("TODO(text): His partner has grown to its final form.", "NARRATOR"),
      say("TODO(text): The graft collar bites into the stem.", "NARRATOR"),
      say("TODO(text): Bram insists the collar made it strong.", "BRAM"),
      say("TODO(text): He orders his partner to prove it.", "BRAM"),
      cameraReset(20),
      byStarter((line) => [{ op: "battle", trainer: `rival_4_${COUNTER[line]}`, canLose: true }]),
      { op: "ifLastBattle", result: "won", then: [
        emote("bram", "..."),
        say("TODO(text): Bram cannot explain another loss.", "BRAM"),
        say("TODO(text): He blames his partner, then hesitates.", "BRAM"),
      ], else: [
        say("TODO(text): Bram claims the ugly win proves his point.", "BRAM"),
        wait(20),
        say("TODO(text): His triumph fades as his partner wilts.", "NARRATOR"),
      ] },
      wait(30),
      say("TODO(text): The collar tightens and his partner shudders.", "NARRATOR"),
      emote("bram", "?"),
      say("TODO(text): Bram asks his partner to stand up.", "BRAM"),
      say("TODO(text): He insists the collar is helping.", "BRAM"),
      say("TODO(text): He angrily rejects the player's concern.", "BRAM"),
      camera(29, 12, 30),
      // The ash lane at x29 is clear from y15 to y9, beside the dead trunks.
      moveNpc("bram", ...steps("up", 6)),
      { op: "hideNpc", npc: "bram" },
      flag("rival_4_done"),
      cameraReset(),
      { op: "restoreMusic" },
      say("TODO(text): Bram leaves, less certain than before.", "NARRATOR"),
      // Either story-battle result must leave the player able to explore.
      { op: "heal" },
    ]),
  ],
  ch5_vision: [
    ifFlags({ rival_4_done: true, burnt_vision_seen: false }, [
      camera(34, 13, 45),
      say("TODO(text): A sealed cone lies in the burnt heart.", "NARRATOR"),
      say("TODO(text): The cone warms in the player's hands.", "NARRATOR"),
      wait(30),
      say("TODO(text): Its resin seal breaks without a fire.", "NARRATOR"),
      { op: "shake", frames: 50 },
      { op: "flash", color: "gold" },
      { op: "sfx", id: "pulse" },
      { op: "still", image: "relay_pulse" },
      wait(40),
      say("TODO(text): Pale trunks lean toward the player.", "NARRATOR"),
      say("TODO(text): Something vast moves beneath their roots.", "NARRATOR"),
      wait(40),
      say("TODO(text): The presence recoils, then vanishes.", "NARRATOR"),
      { op: "stillClear" },
      wait(30),
      say("TODO(text): The opened cone rests in shaking hands.", "NARRATOR"),
      flag("burnt_vision_seen"),
      { op: "showNpc", npc: "morrow_bs" },
      face("morrow_bs", "toPlayer"),
      emote("morrow_bs", "..."),
      say("TODO(text): Morrow listens beside a ghost pipe.", "NARRATOR"),
      cameraReset(),
    ]),
  ],
  ch5_morrow_burnt: [
    ifFlags({ burnt_vision_seen: true, morrow_returned: false }, [
      face("morrow_bs", "toPlayer"),
      say("TODO(text): Morrow asks whether the player saw it too.", "MORROW"),
      wait(30),
      say("TODO(text): The presence is not dreaming.", "MORROW"),
      say("TODO(text): It is frightened.", "MORROW"),
      say("TODO(text): The ghost pipes hear it through the fungi.", "MORROW"),
      say("TODO(text): Seek a light from the Hollow's keeper.", "MORROW"),
      say("TODO(text): Morrow will wait at his Conservatory.", "MORROW"),
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
      say("TODO(text): The keeper recognises the vision.", "KEEPER"),
      say("TODO(text): The old forest has begun to stir.", "KEEPER"),
      say("TODO(text): Fungi are the old roads.", "KEEPER"),
      say("TODO(text): Their light will guide the player.", "KEEPER"),
      give("foxfire_lantern"),
      flag("got_lantern"),
      say("TODO(text): The jar holds glowing fungus.", "KEEPER"),
      say("TODO(text): Use GLOW to light the dark rooms.", "KEEPER"),
    ], [
      say("TODO(text): The keeper tends the cedar's old shrines.", "KEEPER"),
      say("TODO(text): Roots and fungi keep the forest connected.", "KEEPER"),
    ]),
    ifFlags({ got_lantern: true }, [call("q_shrine_offerings")]),
  ],
  morrow: [
    face("morrow", "toPlayer"),
    ifFlags({ beat_morrow: true }, [
      say("TODO(text): Morrow listens for the Elder's answer.", "MORROW"),
      say("TODO(text): The forest's quiet is no longer peaceful.", "MORROW"),
    ], [
      ifFlags({ burnt_vision_seen: true, got_lantern: true }, [
        say("TODO(text): Morrow welcomes the player into the night garden.", "MORROW"),
        say("TODO(text): Ghost pipes live through fungi linked to trees.", "MORROW"),
        say("TODO(text): Their strength is borrowed and shared.", "MORROW"),
        say("TODO(text): Morrow asks the player to listen in battle.", "MORROW"),
        { op: "battle", trainer: "morrow" },
        { op: "ifLastBattle", result: "won", then: [
          wait(20),
          emote("morrow", "..."),
          say("TODO(text): Morrow acknowledges the player's care.", "MORROW"),
          say("TODO(text): He presents the Pipe Mark.", "MORROW"),
          { op: "giveMark", mark: "pipe_mark" },
          say("TODO(text): The network is a forest-wide nerve.", "MORROW"),
          say("TODO(text): The Elder has listened since the Long Bloom.", "MORROW"),
          wait(30),
          say("TODO(text): The seed's answer has frightened it.", "MORROW"),
          say("TODO(text): Keep listening as the journey continues.", "MORROW"),
        ] },
      ], [
        say("TODO(text): First seek the burnt heart and a light.", "MORROW"),
      ]),
    ]),
  ],
  ch5_end: [
    ifFlags({ beat_morrow: true, ch5_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("TODO(text): A call from Dr. Vale reaches the player.", "NARRATOR"),
      say("TODO(text): Vale celebrates the fourth Mark.", "VALE"),
      { op: "music", id: "prologue_bloom" },
      say("TODO(text): Saltmarsh Harbour needs help.", "VALE"),
      say("TODO(text): Its Lantern Tree has gone dark.", "VALE"),
      say("TODO(text): Captain Reyes refuses battles until it recovers.", "VALE"),
      wait(30),
      say("TODO(text): Someone at the docks asks about the seed.", "VALE"),
      emote("player", "..."),
      say("TODO(text): Vale sent a Glider Seed to the Greenhouse.", "VALE"),
      give("glider_seed"),
      say("TODO(text): SEED GLIDE returns to visited towns.", "VALE"),
      say("TODO(text): Travel south, then onward to the harbour.", "VALE"),
      say("TODO(text): Keep the seed close and be careful.", "VALE"),
      flag("ch5_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
};
