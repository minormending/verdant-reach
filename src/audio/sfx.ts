// Jingles (short fanfares that pause the music) and sound effects, in the
// same MML song format. All original.

import type { JingleId, SfxId } from "../contracts";
import type { SongDef } from "./song";

const j = (bpm: number, ch: Omit<SongDef, "bpm" | "loop">): SongDef => ({ bpm, loop: false, ...ch });

export const JINGLE_DEFS: Record<JingleId, SongDef> = {
  // Water, light and warm soil: a gentle rising figure that settles.
  heal: j(120, {
    p1: "v11 @1 q7 ~10 o5 g8 a8 b8 o6d4 c8 o5b8 o6c2",
    p2: "v7 @1 q7 o5 e8 f+8 g8 b4 a8 g8 e2",
    wave: "v14 q7 o3 c4. g4. o2 c2",
  }),
  // A plant has rooted in the pod.
  caught: j(144, {
    p1: "v12 @2 q6 o5 c8 e8 g8 c8 e8 g8 o6 c4 o5 a8 b8 o6 c8 d8 e2",
    p2: "v8 @1 q6 o4 g8 o5 c8 e8 o4 g8 o5 c8 e8 g4 f8 g8 a8 b8 o6 c2",
    wave: "v15 q6 o3 c4. c4. f4 g4 o2 c2",
    noise: "v7 r2. r4 r4 s8 s8 x2",
  }),
  // Growth (evolution) congratulations: wide, wondering, then bright.
  growth: j(116, {
    p1: "v11 @2 q7 ~12 o5 e8 g8 b8 o6 e4. d+8 e8 f+8 g+2.",
    p2: "v7 @1 q7 o5 b8 o6 e8 g8 o5 b4. b8 o6 c+8 d+8 e2.",
    wave: "v14 q7 o2 e4. c4. d4 e2.",
    noise: "v6 r2. r4 r4 x2",
  }),
  // A Pressed Mark: proud and ceremonial.
  mark: j(120, {
    p1: "v12 @2 q6 o5 d8. d16 d8 a8 r8 f+8 a8 o6 d8 c+4. o5 b8 o6 d2.",
    p2: "v8 @1 q6 o5 a8. a16 a8 f+8 r8 d8 f+8 a8 a4. g8 f+2.",
    wave: "v15 q6 o3 d4. d4. d4 a4 d2.",
    noise: "v8 s16 s16 s8 k8 r8 k8 r8 s8 s8 s8 s8 k8 r8 x2.",
  }),
  item_get: j(150, {
    p1: "v12 @2 q6 o5 a8 o6 c+8 e8 a4 g+8 a4",
    p2: "v8 @1 q6 o5 e8 a8 o6 c+8 e4 d8 c+4",
    wave: "v15 q6 o3 a4. e4 a4",
  }),
  // A warm "task done" cadence in F (I-V-I), a touch gentler than ITEM_GET.
  quest: j(140, {
    p1: "v12 @2 q6 o5 f8 a8 o6 c8 f4 e8 f4.",
    p2: "v8 @1 q6 o5 c8 f8 a8 o6 c4 c8 c4.",
    wave: "v15 q6 o3 f4. c4. f4.",
  }),
  level_up: j(160, {
    p1: "v13 @2 q6 o5 g16 b16 o6 d16 g8 r16 f+16 g8",
    p2: "v9 @1 q6 o5 d16 g16 b16 o6 d8 r16 d16 d8",
  }),
};

export const SFX_DEFS: Record<SfxId, SongDef> = {
  select:     j(150, { p1: "v10 @2 %1 q8 o6 e32 b16" }),
  cancel:     j(150, { p1: "v10 @2 %1 q8 o6 b32 o5 e16" }),
  cursor:     j(150, { p1: "v10 @1 %1 q8 o6 a32" }),
  bump:       j(120, { p1: "v12 @2 %2 q8 p-3 o2 a8", noise: "v8 %1 o2 c16" }),
  door:       j(120, { noise: "v10 @0 %2 p-12 o4 c8 r16 o3 c8" }),
  ledge:      j(150, { p1: "v10 @2 q8 p7 o4 c16 p-7 o4 g16" }),
  menu_open:  j(150, { p1: "v9 @1 %1 q8 o5 g32 o6 c32 e16" }),
  save:       j(140, { p1: "v10 @2 q6 o5 c16 e16 g16 o6 c8 r16 o5 g16 o6 c8", p2: "v6 @1 q6 r32 o5 c16 e16 g16 o6 c8" }),
  encounter:  j(150, { p1: "v12 @3 q8 p-5 o6 c16 o5 a16 p0 o6 e32 r32 o6 e32 r32 o6 e8", noise: "v9 @0 %1 o5 c16 o6 c16 o5 c16 o6 c8" }),
  hit:        j(150, { p1: "v12 @2 %1 q8 p-12 o3 c16", noise: "v12 @0 %2 o4 g8" }),
  hit_super:  j(150, { p1: "v13 @3 %1 q8 p-12 o3 c16 r32 o3 c16", noise: "v14 @0 %3 o5 c16 o4 c4" }),
  hit_weak:   j(150, { noise: "v11 @0 %1 o4 c16" }),
  wilt:       j(100, { p1: "v11 @2 q8 ~10 p-24 o5 c2", p2: "v6 @1 q8 p-24 o4 g2" }),
  stat_up:    j(160, { p1: "v10 @1 q8 p12 [o5 c32 e32 g32 o6 c32]2", p2: "v6 @2 q8 r32 p12 [o5 e32 g32 o6 c32 e32]2" }),
  stat_down:  j(160, { p1: "v10 @1 q8 p-12 [o6 c32 o5 g32 e32 c32]2", p2: "v6 @2 q8 r32 p-12 [o6 e32 c32 o5 g32 e32]2" }),
  pod_throw:  j(120, { p1: "v8 @0 q8 p12 o4 c8", noise: "v8 @0 p24 o3 c8" }),
  pod_shake:  j(150, { noise: "v10 @1 %1 o5 c32 r32 o4 g32", p1: "v8 @2 %1 q8 o3 g32 r32 o3 e32" }),
  pod_click:  j(150, { p1: "v11 @2 %1 q8 o6 c32 r32 o6 g16", noise: "v8 @1 %1 o6 c32" }),
  exp_tick:   j(150, { p1: "v9 @2 %1 q8 o6 e64" }),
  run:        j(150, { noise: "v7 @0 %1 o4 c32 r32 o4 d32 r32 o4 e32 r16", p1: "v8 @1 q8 p12 r16 o5 c16" }),
  text_blip:  j(150, { p1: "v8 @2 %1 q6 o6 c64" }),
};
