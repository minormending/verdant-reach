import type { CharacterKey } from "../contracts";
/** Display name (as in `say.speaker`) -> whose face to show; null = no face. Owned by the story pass. */
export const SPEAKERS: Readonly<Record<string, CharacterKey | null>> = {};
export function speakerFace(name: string | undefined): CharacterKey | null {
  return (name && SPEAKERS[name.trim().toUpperCase()]) || null;
}
