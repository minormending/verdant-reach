// ?dev=world&map=<id> : a full-map overview for eyeballing layouts.
// Tiles are drawn from real art when present (else flat colours), structures as
// images or labelled boxes, and NPCs / warps / triggers / signs are marked.
// Unreachable walkable tiles are tinted red. Validation errors are listed.

import { AUTOTILE, MAP_IDS, STRUCTURES, characterPath, structurePath, tileAltPath, tilePath, tileVariantPath } from "../contracts";
import type { GameContext, MapDef, MapId, Scene, TileKey } from "../contracts";
import { flood, grid, validateWorld, walkable } from "./validate";
import { createOverworldScene } from "../overworld";
import { createQuickened } from "../battle";

const COLORS: Partial<Record<TileKey, string>> = {
  grass: "#78c850", tall_grass: "#3f9a3a", flowers: "#e8a0c8", path: "#d8c088", dirt: "#a07848",
  sand: "#e8d8a0", bog: "#5a6a3a", boardwalk: "#b08850", water: "#4878d0", ledge_down: "#507830",
  tree: "#1f5a2a", maple_tree: "#b04a28", tapped_maple: "#7a3a28", hedge: "#2e7a3a", bramble_bush: "#6a2a4a",
  rock: "#888080", fence: "#c8a070", sign: "#f0d070", mailbox: "#d05050", floor_wood: "#c89868",
  floor_tile: "#d8d8c8", floor_greenhouse: "#a8d098", rug: "#c04848", mat_exit: "#e05030", wall: "#504038",
  window: "#98c8e8", counter: "#806040", table: "#9a7050", bookshelf: "#6a4a30", plant_pot: "#c86838",
  planter_bed: "#5a4028", bed: "#7090d0", specimen_cabinet: "#40a0a0", stairs_up: "#e0e0e0",
  stairs_down: "#909090", water_channel: "#3060a8", void: "#000000",
  // polish-pass set dressing (flat stand-ins until the art lands)
  flowers_red: "#e86060", flowers_yellow: "#f0d040", stone_path: "#b8b8b0", bridge: "#b88850",
  mushrooms: "#c89070", gate_open: "#d8b888", chair: "#a07040", stump: "#7a5030", log: "#8a5a30",
  lamp_post: "#383840", barrel: "#9a6030", crate: "#b89060", bench: "#a87848", pond_lily: "#3870c0",
  reeds: "#6a8a40", cliff: "#806a50", stone_wall: "#909088", garden_plot: "#6a4a2a", crops: "#b0c040",
  scarecrow: "#d8b040", haybale: "#e8c860", fireplace: "#a04020", stove: "#505058", potted_tree: "#3a8a3a",
  glass_wall: "#b8e0e8", workbench: "#8a6a48", microscope: "#d0d0e0",
};

/**
 * ?dev=world&play=new                         -> real new game from the prologue
 * ?dev=world&play=1&map=<id>&x=&y=&flags=a,b  -> drop into a map with flags set
 */
function playtest(ctx: GameContext, params: URLSearchParams): Scene {
  const st = ctx.state;
  st.playerName = params.get("name") || "ROWAN";
  st.options.textSpeed = "fast";
  for (const f of (params.get("flags") ?? "").split(",").filter(Boolean)) st.flags[f] = true;
  if (params.get("play") === "new") return createOverworldScene(ctx, { mode: "new" });
  const map = (params.get("map") as MapId) || "fallowfield";
  const lvl = Number(params.get("level") || 0);
  if (lvl) {
    try { st.party.push(createQuickened(ctx.data, (params.get("species") as never) || "oak_acorn", lvl, ctx.rng)); } catch (e) { console.warn(e); }
    st.bag.terrarium_pod = 5;
    st.bag.field_herbarium = 1;
  }
  st.position = { map, x: Number(params.get("x") || 0), y: Number(params.get("y") || 0), facing: "down" };
  return createOverworldScene(ctx, { mode: "continue" });
}

export default function worldDev(ctx: GameContext): Scene {
  const params = new URLSearchParams(location.search);
  if (params.get("play")) return playtest(ctx, params);
  const current = (params.get("map") as MapId) || "fallowfield";
  const scale = Number(params.get("scale") || 2);
  const warnings: string[] = [];
  const errors = validateWorld(ctx.world, warnings);

  const screen = document.getElementById("screen");
  if (screen) screen.style.display = "none";
  document.body.style.display = "block";
  document.body.style.overflow = "auto";
  document.body.style.color = "#e8f0e0";
  document.body.style.font = "12px monospace";

  const root = document.createElement("div");
  root.style.padding = "8px";
  document.body.appendChild(root);

  const nav = document.createElement("div");
  nav.style.marginBottom = "8px";
  for (const id of MAP_IDS) {
    const a = document.createElement("a");
    a.href = `?dev=world&map=${id}&scale=${scale}${params.has("grid") ? "&grid=1" : ""}${params.has("timer") ? "&timer" : ""}`;
    a.textContent = id;
    a.style.marginRight = "10px";
    a.style.color = id === current ? "#ffe060" : "#a8d098";
    nav.appendChild(a);
  }
  root.appendChild(nav);

  const map = ctx.world.maps[current];
  if (!map) {
    root.append(`No map "${current}".`);
    return { update() {}, draw() {} };
  }
  const info = document.createElement("div");
  info.textContent = `${map.name} (${map.id}) ${map.tiles[0].length}x${map.tiles.length} music=${map.music} outdoor=${map.outdoor}`;
  root.appendChild(info);

  const canvas = document.createElement("canvas");
  root.appendChild(canvas);
  render(ctx, map, canvas, scale);

  const list = document.createElement("pre");
  const mine = errors.filter((e) => e.includes(`[${current}]`));
  list.textContent = [
    mine.length ? `${mine.length} problems on this map:` : "No problems on this map.",
    ...mine,
    "",
    `World: ${errors.length} problems total.`,
    ...(warnings.length ? [`${warnings.length} warnings (waiting on other owners):`, ...warnings.map((w) => `  ${w}`)] : []),
    "",
    "NPCs:",
    ...map.npcs.map((n) => `  ${n.id} (${n.sprite}) @${n.x},${n.y} ${n.trainer ? "trainer " + n.trainer : n.script ?? "pickup"}${n.visibleWhen ? " when " + n.visibleWhen.map((c) => `${c.flag}=${c.is}`).join("&") : ""}`),
    "Hidden items:",
    ...(map.hidden ?? []).map((h) => `  @${h.x},${h.y} ${h.item}${h.qty && h.qty > 1 ? " x" + h.qty : ""}`),
    "Warps:",
    ...map.warps.map((w) => `  @${w.x},${w.y} -> ${w.to} ${w.toX},${w.toY}`),
    "Triggers:",
    ...map.triggers.map((t) => `  @${t.x},${t.y} ${t.w ?? 1}x${t.h ?? 1} ${t.script}`),
  ].join("\n");
  root.appendChild(list);

  return { update() {}, draw() {} };
}

function render(ctx: GameContext, map: MapDef, canvas: HTMLCanvasElement, scale: number) {
  const T = 16;
  const w = map.tiles[0].length;
  const h = map.tiles.length;
  canvas.width = w * T;
  canvas.height = h * T;
  canvas.style.width = `${w * T * scale}px`;
  canvas.style.height = `${h * T * scale}px`;
  canvas.style.imageRendering = "pixelated";
  const g = canvas.getContext("2d")!;
  g.imageSmoothingEnabled = false;

  const gr = grid(map);
  // Mirror the engine's tile choice: an autotile edge variant when the art has
  // one, else a ground variant picked by position hash, else the base tile.
  const has = (p: string) => ctx.assets.has(p);
  const group = (x: number, y: number): string | undefined => {
    if (x < 0 || y < 0 || x >= w || y >= h) return undefined;
    const k = map.legend[map.tiles[y][x]];
    return AUTOTILE[k];
  };
  const pick = (key: TileKey, x: number, y: number): string => {
    const grp = AUTOTILE[key];
    if (grp) {
      const same = (nx: number, ny: number) => nx < 0 || ny < 0 || nx >= w || ny >= h || group(nx, ny) === grp;
      const mask = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) | (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
      if (has(tileVariantPath(key, mask))) return tileVariantPath(key, mask);
    }
    const alt = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 4;
    if (alt && has(tileAltPath(key, alt as 1 | 2 | 3))) return tileAltPath(key, alt as 1 | 2 | 3);
    return tilePath(key);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = map.legend[map.tiles[y][x]];
      const img = ctx.assets.image(pick(key, x, y));
      if (img) g.drawImage(img, x * T, y * T);
      else {
        g.fillStyle = COLORS[key] ?? "#ff00ff";
        g.fillRect(x * T, y * T, T, T);
        if (key === "ledge_down") { g.fillStyle = "#203010"; g.fillRect(x * T, y * T + 12, T, 4); }
        if (key === "tall_grass") { g.fillStyle = "#2a7028"; for (let i = 0; i < 4; i++) g.fillRect(x * T + 2 + i * 4, y * T + 4, 2, 8); }
      }
    }
  }

  // structures
  for (const s of map.structures) {
    const def = STRUCTURES[s.key];
    const img = ctx.assets.image(structurePath(s.key));
    if (img) g.drawImage(img, s.x * T, s.y * T);
    else {
      g.fillStyle = "#806858";
      g.fillRect(s.x * T, s.y * T, def.w * T, def.h * T);
      g.fillStyle = "#3a2a20";
      if (def.door) g.fillRect((s.x + def.door.x) * T + 3, (s.y + def.door.y) * T + 2, T - 6, T - 2);
      g.fillStyle = "#fff";
      g.font = "8px monospace";
      g.fillText(s.key, s.x * T + 2, s.y * T + 9);
    }
  }

  // reachability tint
  const starts: { x: number; y: number }[] = [];
  for (const m of Object.values(ctx.world.maps)) for (const wp of m.warps) if (wp.to === map.id) starts.push({ x: wp.toX, y: wp.toY });
  if (ctx.world.newGame.map === map.id) starts.push(ctx.world.newGame);
  const reach = flood(gr, starts);
  g.fillStyle = "rgba(255,0,0,0.35)";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (walkable(gr, x, y) && !reach.has(`${x},${y}`)) g.fillRect(x * T, y * T, T, T);
  }

  // &grid=1: the 10x9 screen grid, for judging each screen's composition
  if (new URLSearchParams(location.search).get("grid")) {
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += 10) { g.beginPath(); g.moveTo(x * T + 0.5, 0); g.lineTo(x * T + 0.5, h * T); g.stroke(); }
    for (let y = 0; y <= h; y += 9) { g.beginPath(); g.moveTo(0, y * T + 0.5); g.lineTo(w * T, y * T + 0.5); g.stroke(); }
  }

  // triggers
  for (const t of map.triggers) {
    g.strokeStyle = "#ffe000";
    g.lineWidth = 2;
    g.strokeRect(t.x * T + 1, t.y * T + 1, (t.w ?? 1) * T - 2, (t.h ?? 1) * T - 2);
  }
  // warps
  for (const wp of map.warps) {
    g.strokeStyle = "#00e0ff";
    g.lineWidth = 2;
    g.strokeRect(wp.x * T + 2, wp.y * T + 2, T - 4, T - 4);
  }
  // signs
  g.font = "8px monospace";
  for (const s of map.signs) { g.fillStyle = "#000"; g.fillText("S", s.x * T + 5, s.y * T + 11); }
  // hidden items: a small gold diamond
  for (const hd of map.hidden ?? []) {
    const cx = hd.x * T + 8, cy = hd.y * T + 8;
    g.fillStyle = "#ffe860";
    g.strokeStyle = "#000";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx, cy - 5); g.lineTo(cx + 4, cy); g.lineTo(cx, cy + 5); g.lineTo(cx - 4, cy); g.closePath();
    g.fill(); g.stroke();
  }
  // heal point
  if (map.healPoint) { g.fillStyle = "#ff60c0"; g.fillRect(map.healPoint.x * T + 5, map.healPoint.y * T + 5, 6, 6); }
  // npcs
  for (const n of map.npcs) {
    const img = ctx.assets.image(characterPath(n.sprite));
    if (img) g.drawImage(img, 0, 0, 16, 16, n.x * T, n.y * T, 16, 16);
    else {
      g.fillStyle = n.trainer ? "#ff4040" : n.sprite === "item_pickup" ? "#ffd040" : n.visibleWhen ? "#c080ff" : "#ffffff";
      g.beginPath();
      g.arc(n.x * T + 8, n.y * T + 8, 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#000";
      g.lineWidth = 1;
      g.stroke();
    }
    if (n.trainer && n.sight !== 0) {
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[n.facing];
      g.strokeStyle = "rgba(255,64,64,0.8)";
      g.beginPath();
      g.moveTo(n.x * T + 8, n.y * T + 8);
      g.lineTo((n.x + d[0] * (n.sight ?? 4)) * T + 8, (n.y + d[1] * (n.sight ?? 4)) * T + 8);
      g.stroke();
    }
  }
}
