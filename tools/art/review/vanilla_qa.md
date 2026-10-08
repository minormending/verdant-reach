# Vanilla art review

Final changed-art gate: `qa.py --line vanilla --changed ch6`, **0 errors**.

| Check | vanilla_vine | vanilla_orchid |
|---|---|---|
| crystal | PASS — 0 errors/0 warnings | PASS — 0 errors/0 warnings |
| face_risk | PASS — 0 | PASS — 0 |
| size_class | PASS — teen: 47px/41.0%/1 edges | WARN — adult: 56px/58.3%/2 edges |
| grounding | PASS — 55 | PASS — 55 |
| centre_of_mass | PASS — 29.01 | PASS — 30.84 |
| back_fill | PASS — 82.3% | PASS — 82.7% |
| anim_signature | PASS — 6.3% changed/100.0% inside | PASS — 20.5% changed/100.0% inside |
| clone_risk | PASS — 0 pairs; nearest a/d=6/13 | PASS — 0 pairs; nearest a/d=14/12 |
| silhouette_noise | PASS — 1 tips/0 holes | PASS — 1 tips/0 holes |
| stage_progression | PASS — first stage | PASS — 47->56px/41.0%->58.3% |

The adult size warning is its 56px extent near the inclusive limit. All frames remain within the adult 52–56px and 38–62% bands, with two actual canvas edges touched. Its per-frame fill range is 57.5–60.5%.

Visual review: every front frame, back and both icons inspected at 1× and 3×, including the sport. An additional 8-connected scan of indexes 0–1 found no fully enclosed dark components in any image.

Verified: `build.py vanilla --sheet` (0 kit errors); `npm run art:index`; full `build_all.py --regen` (0 validation errors, byte-identical across 1,774 files); `npm run typecheck`; `npm test` (858 tests, 81 files); `npm run build`. The build retains its existing large-chunk advisory.

Runtime review limitation: `npm run dev -- --host 127.0.0.1 --port 5179 --strictPort` failed with sandbox `listen EPERM`, so an in-game battle/Art Lab review could not be completed here.

Potential next refinement for vanilla_vine: expose more of the pale aerial-root arcs between the established leaves.

Potential next refinement for vanilla_orchid: sharpen the miniature icon’s trumpet profile while keeping its hanging beans distinct.

The requested lead layout is `vanilla_lead_layout.png`: front, back and icon for each species at nearest-neighbour 3× in one unlabelled row. No commits or branches were created.
