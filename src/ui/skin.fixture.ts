// Original synthetic pixels/metadata only: safe to use in public tests.
import { ArtRegistry } from "../art/registry";
import { ArtCatalog } from "../art/catalog";
import type { ArtImage } from "../contracts";
import type { ImageSetEntry, ImageSetBundle } from "../art/format";
import { vi } from "vitest";

export function fixtureSkin() {
  const keys = ["panel_window", "panel_inset", "panel_plain", "highlight", "slot", "button_round", "bar_frame", "bar_green", "bar_yellow", "bar_red", "bar_blue", "focus_corners", "cursor_arrow", "cursor_hand", "toggle_on", "toggle_off", "coin", "heart", "check_on"];
  const images = Object.fromEntries(keys.map(k => [k, { file: `${k}.png`, size: [16, 16], insets: k.startsWith("bar_") ? [3, 0, 3, 0] : [3, 3, 3, 3], ink: "#3a2a1e", fill: "#d0be9c" }])) as Record<string, ImageSetEntry>;
  const json: ImageSetBundle = { format: "verdant.imageset/1", id: "ui_limezu", logicalDir: "assets/ui", images };
  const art = new ArtRegistry({ packs: ["limezu"] });
  art.catalog = new ArtCatalog([{ kind: "sets", id: "ui_limezu", pack: "limezu", files: ["set.json", ...keys.map(k => `${k}.png`)], json }], { packs: ["limezu"], legacy: [] });
  const sheets = Object.fromEntries(keys.map(k => [k, { width: 16, height: 16, key: k } as unknown as ArtImage]));
  vi.spyOn(art, "image").mockImplementation(path => sheets[path.split("/").pop()!.replace(".png", "")]);
  return art;
}
