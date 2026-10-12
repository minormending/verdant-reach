// Front matter: the cover, "How to play" and the table of contents. Facts come
// from the game's modules (key bindings, time of day, pods, growth triggers,
// field tools, the type chart) so they match the build.

import type { Button, GrowthTrigger, ItemId, TypeId } from "../contracts";
import { SPECIES_IDS, TIME_OF_DAY, TYPES, uiPath } from "../contracts";
import { KEYMAP } from "../engine/core";
import { PAD_LABELS } from "../engine/gamepad";
import { FIELD_MOVE_FX } from "../overworld/fieldmove";
import { typeEffectiveness } from "../battle/logic/damage";
import { SPORT_ODDS } from "../battle/logic/stats";
import { STARTER_LINES, STARTER_SPECIES } from "../world/trainers";
import { drawBitmapText, measureText } from "../ui/font";
import { h } from "./dom";
import { itemIcon, pixelImg, speciesFront } from "./art";
import type { Guide } from "./context";
import type { RefSection } from "./reference";
import { anchor, growthText, itemLink, speciesLink, typePill } from "./ui";

/** Text in the game's 8x8 bitmap font, drawn once onto a canvas and scaled with CSS. */
export function pixelText(text: string, scale: number, color = "#f8f8f8", cls = ""): HTMLCanvasElement {
  const w = Math.max(8, measureText(text));
  const c = h<HTMLCanvasElement>("canvas.px.pixel-text", { class: cls, width: w, height: 8, role: "img", "aria-label": text, style: `width:${w * scale}px;height:${8 * scale}px` });
  const g = c.getContext("2d");
  if (g) drawBitmapText(g, text, 0, 0, color);
  return c;
}

export function cover(g: Guide): HTMLElement {
  const starters = STARTER_LINES.map((l) => STARTER_SPECIES[l][0]);
  return h("header.cover", { id: "top" },
    h("div.cover-art",
      pixelImg(uiPath("title"), [160, 144], 3, "Verdant Reach: a pixel-art valley at dusk with a towering golden flower spike", "cover-title"),
      h("div.cover-logo", pixelImg(uiPath("title_logo"), [130, 39], 3, "Verdant Reach")),
    ),
    h("div.cover-text",
      pixelText("OFFICIAL", 3, "#a8d098", "kicker-px"),
      pixelText("STRATEGY GUIDE", 3, "#a8d098", "kicker-px"),
      h("h1", "Verdant Reach"),
      h("p.tagline", "The complete walkthrough, every map, every trainer, and the full Field Herbarium."),
      h("div.cover-starters", starters.map((id) => h("a", { href: `#${anchor.species(id)}`, title: g.data.species[id]?.name }, speciesFront(id, 2, g.data.species[id]?.name ?? id)))),
      h("p.cover-stats",
        `${SPECIES_IDS.length} Quickened · ${Object.keys(g.data.moves).length} moves · ${Object.keys(g.data.items).length} items · ${Object.keys(g.world.trainers).length} trainer battles · ${Object.keys(g.world.maps).length} maps`),
      h("p.cover-play", h("a.button", { href: "./" }, "▶ Play the game")),
    ),
  );
}

// ---------------------------------------------------------------------------
// How to play
// ---------------------------------------------------------------------------

const KEY_NAMES: Record<string, string> = {
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D",
  KeyZ: "Z", KeyX: "X", KeyJ: "J", KeyK: "K", Space: "Space", Backspace: "Backspace", Escape: "Esc", Enter: "Enter",
  ShiftLeft: "Shift", ShiftRight: "Shift",
};

function controls(): HTMLElement {
  const rows: [string, Button[], string][] = [
    ["Move", ["up", "down", "left", "right"], "Hold B while walking to run."],
    ["A", ["a"], "Talk, read, confirm, pick up. Press A facing a sparkle to find a hidden item."],
    ["B", ["b"], "Cancel, back."],
    ["START", ["start"], "The menu: party, bag, Herbarium, notes, save."],
    ["SELECT", ["select"], ""],
  ];
  const keysFor = (bs: Button[]) => [...new Set(Object.entries(KEYMAP).filter(([, b]) => bs.includes(b)).map(([k]) => KEY_NAMES[k] ?? k))];
  return h("table.controls",
    h("thead", h("tr", h("th", ""), h("th", "Keyboard"), h("th", "Controller"), h("th", ""))),
    h("tbody", rows.map(([label, bs, what]) => h("tr",
      h("th", label), h("td", keysFor(bs).map((k) => h("kbd", k))), h("td.small", PAD_LABELS[bs[0]]), h("td.small", what),
    ))));
}

const GROWTH_EXAMPLE_KINDS: GrowthTrigger["kind"][] = ["vigor", "vigor_day", "vigor_night", "tending", "item", "cross_pollination"];
const GROWTH_KIND_LABEL: Record<GrowthTrigger["kind"], string> = {
  vigor: "Vigour (level)", vigor_day: "Sunlight", vigor_night: "Moonlight", tending: "Tending", item: "An item", cross_pollination: "Cross-pollination",
};

/** Field tools: key items that open the map (the HM equivalents). */
const FIELD_TOOLS: { item: ItemId; move: string }[] = [
  { item: "pruning_shears", move: FIELD_MOVE_FX.prune.name },
  { item: "lily_raft", move: "RAFT" },
  { item: "saxifrage", move: "UPROOT" },
  { item: "foxfire_lantern", move: "GLOW" },
  { item: "glider_seed", move: "SEED GLIDE" },
  { item: "fig_root", move: FIELD_MOVE_FX.rootbridge.name },
];

export function howToPlay(g: Guide): HTMLElement {
  const examples = GROWTH_EXAMPLE_KINDS.map((kind) => {
    const sp = Object.values(g.data.species).find((s) => s.growsInto?.trigger.kind === kind);
    return { kind, sp };
  }).filter((x) => x.sp);
  const pods = Object.values(g.data.items).filter((i) => i.effect.kind === "pod");
  const strong = (t: TypeId) => TYPES.filter((d) => typeEffectiveness(g.data.typeChart, t, [d]) > 1);
  return h("section.how", { id: "how-to-play" },
    h("h2", h("span.kicker", "Before you start"), "How to play"),
    h("div.how-grid",
      h("div.card",
        h("h3", "Controls"),
        controls(),
        h("p.small", "On phones and tablets an on-screen pad appears. Press F for fullscreen."),
      ),
      h("div.card",
        h("h3", "The Quickened"),
        h("p", "The night the Centuryheart blooms, plants across the valley wake. You catalogue these QUICKENED in your FIELD HERBARIUM: a plant you've met is sketched, one you've caught is pressed. Every page holds one true fact about the real plant."),
        h("p", `Time follows your real clock: morning ${TIME_OF_DAY.morningStart}:00–${TIME_OF_DAY.dayStart}:00, day until ${TIME_OF_DAY.nightStart}:00, then night. Some plants only appear by day or by night, and sun-lovers fight harder in daylight (photoperiod). Encounter tables in this guide show both.`),
        h("p", "A plant that loses a battle has WILTED. GREENHOUSES heal your party for free. Win the Pressed Mark at each of the eight CONSERVATORIES."),
      ),
      h("div.card",
        h("h3", "Catching"),
        h("p", "Weaken a wild plant, then throw a pod: a tiny portable greenhouse a tired plant chooses to root in. You can throw at any time in a wild battle, and a critical capture can happen. The lower its HP, the better your odds; a status condition helps too, dormant or frostbitten most of all. Each plant's catch rate is in the Herbarium (lower is harder)."),
        h("ul.plain", pods.map((p) => h("li", itemLink(g, p.id), ` · ×${p.effect.kind === "pod" ? p.effect.catchMultiplier : 1} catch rate`, p.price ? ` · $${p.price}` : ""))),
        h("p.small", `One wild plant in about ${SPORT_ODDS} is a SPORT: a natural colour mutation, like a variegated leaf.`),
      ),
      h("div.card",
        h("h3", "Growth"),
        h("p", "Quickened grow into their next stage as real plants do. Most grow with VIGOUR (level); some need sun, night, care, an item or a partner."),
        h("table.compact", h("tbody", examples.map(({ kind, sp }) => h("tr",
          h("th", GROWTH_KIND_LABEL[kind]),
          h("td", h("span.chain", speciesLink(g, sp!.id), h("span.arrow", "→"), speciesLink(g, sp!.growsInto!.species)), h("div.small.muted", growthText(g, sp!.growsInto!.trigger))),
        )))),
        h("p.small", "At the NURSERY GARDEN two compatible plants can set a seed, which you carry until it sprouts."),
      ),
      h("div.card.wide",
        h("h3", "Types"),
        h("p", "Nine types. A move of a type strong against the target hits for double; a resisted one for half. Physical and special is set per move, not per type. Full chart in the reference section."),
        h("table.compact.types-mini", h("tbody", TYPES.map((t) => h("tr", h("th", typePill(t)), h("td.small", strong(t).length ? ["Strong against ", strong(t).map((d, i) => [i ? " " : "", typePill(d)])] : "—"))))),
      ),
      h("div.card.wide",
        h("h3", "Field tools"),
        h("p", "No move slots are spent on field moves. Each is unlocked by a key item."),
        h("table.compact", h("tbody", FIELD_TOOLS.filter((t) => g.data.items[t.item]).map((t) => h("tr",
          h("td", itemIcon(t.item, "key", 2)),
          h("th", t.move),
          h("td", itemLink(g, t.item, false), h("div.small.muted", g.data.items[t.item].description)),
        )))),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Table of contents
// ---------------------------------------------------------------------------

export function partsOf(g: Guide): { part: string; id: string; sections: Guide["sections"] }[] {
  const parts: { part: string; id: string; sections: Guide["sections"] }[] = [];
  for (const s of g.sections) {
    let p = parts.find((x) => x.part === s.part);
    if (!p) { p = { part: s.part, id: `part-${parts.length + 1}`, sections: [] }; parts.push(p); }
    p.sections.push(s);
  }
  return parts;
}

export function contents(g: Guide, refs: RefSection[]): HTMLElement {
  const parts = partsOf(g);
  return h("nav.toc", { id: "contents", "aria-label": "Table of contents" },
    h("h2", h("span.kicker", "Contents"), "In this guide"),
    h("div.toc-cols",
      h("div",
        h("h3", h("a", { href: "#how-to-play" }, "How to play")),
        h("h3", h("a", { href: "#walkthrough" }, "Walkthrough")),
        parts.length
          ? h("ol.toc-parts", parts.map((p) => h("li",
            h("a.toc-part", { href: `#${p.id}` }, p.part),
            h("ol", p.sections.map((s) => h("li", h("a", { href: `#${s.id}` }, s.title)))),
          )))
          : h("p.muted.small", "The walkthrough is being written."),
      ),
      h("div",
        h("h3", "Reference"),
        h("ol.toc-refs", refs.map((r) => h("li", h("a", { href: `#${r.id}` }, r.title)))),
      ),
    ),
  );
}
