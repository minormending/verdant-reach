// In-memory character bundle: exercises tall frames without adding art to public/.
import type { CharacterBundle, RawBundle } from "./format";

export const tallCharacter: CharacterBundle = {
  format: "verdant.character/1", id: "player", sheet: "sheet.png",
  frame: [16, 32], rows: ["down", "up", "left", "right"], columns: ["stand", "stepA", "stepB"],
  credits: "Synthetic R1a test fixture.",
};
export const tallCharacterRaw: RawBundle = {
  kind: "characters", id: "player", pack: null, files: ["character.json", "sheet.png"], json: tallCharacter,
};
