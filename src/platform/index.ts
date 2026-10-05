// Platform layer: everything between the browser and the game. Booted from
// src/main.ts; nothing else imports this.

export { computeLayout, integerScale, dpadDirection, type Layout } from "./layout";
export { createShell, isTouchDevice, type Shell } from "./shell";
export { createPause, pauseOnFocusLoss, type PauseController } from "./pause";
export { installErrorScreen, type ErrorScreen } from "./errors";
export { createLoadingScene, type LoadingScene } from "./loading";
export { sendKey, TOUCH_KEYS } from "./touch";

/** URL flags that switch platform features off for automated runs. */
export function platformFlags(search = location.search) {
  const p = new URLSearchParams(search);
  const dev = p.get("dev");
  return {
    /** Map overview pages are plain documents: no shell around them. */
    shell: !(dev === "world" && !p.get("play")),
    /** Hidden test panes (`?timer`) and e2e runs must never pause themselves. */
    pauseOnBlur: !p.has("timer") && !p.has("nopause") && !p.has("e2e"),
  };
}
