// PLACEHOLDER - replaced by the data/audio agent.
import type { AudioService } from "../contracts";

export function createAudio(): AudioService {
  let current: AudioService["current"] extends () => infer R ? R : never = null;
  return {
    playMusic(id) { current = id; },
    stopMusic() { current = null; },
    current: () => current,
    playSfx() {},
    playJingle: async () => {},
    playCry: async () => {},
    unlock() {},
    setVolume() {},
  };
}
