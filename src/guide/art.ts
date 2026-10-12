// Pictures for the guide, resolved through the game's own art runtime
// (src/art): species sprites, trainer portraits, item icons, UI images and
// character sheets. Logical paths go through the same registry the game
// uses, so art packs (?art=classic) apply here too.

import type { ItemId, SpeciesId, TrainerPortraitKey } from "../contracts";
import { characterPath, itemIconPath, portraitPath, speciesPath, uiPath } from "../contracts";
import { createArtAssets, type ArtRegistry } from "../art";
import { h } from "./dom";

let registry: ArtRegistry | null = null;

/** Create the page's registry and wait for the index and bundle JSON. */
export async function initArt(): Promise<ArtRegistry> {
  registry = createArtAssets();
  await registry.ready();
  return registry;
}

export function art(): ArtRegistry {
  if (!registry) throw new Error("initArt() first");
  return registry;
}

const urlCache = new Map<string, Promise<string | null>>();

/**
 * A URL for a logical path: the bundle file itself when no cutting or
 * recolouring is needed (lazy-loadable, printable), else a data URL of the
 * registry's cut canvas.
 */
export function artUrl(path: string): Promise<string | null> {
  let p = urlCache.get(path);
  if (!p) {
    p = (async () => {
      const r = art();
      const res = r.resolve(path);
      if (!res) return null;
      if (!res.rect && !res.recolor) return res.url;
      await r.loadAll([path]);
      const img = r.image(path);
      if (!img) return null;
      if (img instanceof HTMLCanvasElement) return img.toDataURL();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      return c.toDataURL();
    })();
    urlCache.set(path, p);
  }
  return p;
}

/** True when the art registry provides a logical path. */
export const hasArt = (path: string) => !!art().resolve(path) && art().exists(path);

/** A pixel-art <img> at an integer scale; `alt` describes it. Shows a neutral box if the art is missing. */
export function pixelImg(path: string, size: [number, number], scale: number, alt: string, cls = ""): HTMLImageElement {
  const img = h<HTMLImageElement>("img.px", {
    class: cls, alt, width: size[0] * scale, height: size[1] * scale, loading: "lazy", decoding: "async",
  });
  void artUrl(path).then((url) => {
    if (url) img.src = url;
    else img.classList.add("px-missing");
  });
  return img;
}

export const speciesFront = (id: SpeciesId, scale = 1, alt = "") => pixelImg(speciesPath(id, "front"), [56, 56], scale, alt, "sp-front");
export const speciesIcon = (id: SpeciesId, scale = 2, alt = "") => pixelImg(speciesPath(id, "icon"), [16, 16], scale, alt, "sp-icon");
export const portrait = (key: TrainerPortraitKey, scale = 1, alt = "") => pixelImg(portraitPath(key), [56, 56], scale, alt, "portrait");
export const uiImg = (name: Parameters<typeof uiPath>[0], size: [number, number], scale: number, alt = "") =>
  pixelImg(uiPath(name), size, scale, alt, "ui-img");

/** An item's 16x16 icon, or a pocket-shaped stand-in for items without one. */
export function itemIcon(id: ItemId, pocket: "items" | "pods" | "key", scale = 2): HTMLElement {
  const path = itemIconPath(id);
  if (hasArt(path)) return pixelImg(path, [16, 16], scale, "", "item-icon");
  if (pocket === "pods") return pixelImg(uiPath("pod"), [16, 16], scale, "", "item-icon");
  return h("span.item-glyph", { "aria-hidden": "true", style: `width:${16 * scale}px;height:${16 * scale}px` }, pocket === "key" ? "◆" : "●");
}

/** The front-facing standing frame of a character sheet, as a canvas. */
export function characterStill(key: Parameters<typeof characterPath>[0], scale = 2): HTMLCanvasElement {
  const c = h<HTMLCanvasElement>("canvas.px", { width: 16, height: 16, style: `width:${16 * scale}px;height:${16 * scale}px` });
  const r = art();
  void r.loadAll([characterPath(key)]).then(() => {
    const img = r.image(characterPath(key));
    if (img) c.getContext("2d")!.drawImage(img, 0, 0, 16, 16, 0, 0, 16, 16);
  });
  return c;
}
