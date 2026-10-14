// Registers the offline service worker (sw.js, built from sw.template.js) in
// the public build only, and keeps the player told:
// - first visit: "Saving for offline play… 40%", then "Ready to play offline";
// - a new release downloaded in the background: on the title screen the game
//   reloads itself into it; mid-game, a "New version ready. Tap to update"
//   note (or it switches the next time the game is opened).
// An open game checks for a new release every hour. Dev servers and the e2e
// build never register it, so tests always load fresh files.

type OfflineMessage =
  | { type: "offline-progress"; done: number; total: number }
  | { type: "offline-ready"; version: string }
  | { type: "offline-failed"; reason: string };

const UPDATE_CHECK_MS = 60 * 60 * 1000;

function note(): { set(text: string, onTap?: () => void): void; hideSoon(): void } {
  let el: HTMLButtonElement | null = null;
  let timer = 0;
  let tap: (() => void) | undefined;
  const ensure = () => {
    if (el) return el;
    el = document.createElement("button");
    el.id = "vr-offline";
    el.type = "button";
    el.setAttribute("role", "status");
    el.style.cssText = [
      "position:fixed", "left:50%", "bottom:12px", "transform:translateX(-50%)", "z-index:50",
      "padding:6px 12px", "border:0", "border-radius:999px", "font:600 13px/1.3 system-ui,sans-serif",
      "background:rgba(12,26,18,0.88)", "color:#e8f0e0", "box-shadow:0 2px 8px rgba(0,0,0,0.35)",
      "transition:opacity 0.4s",
    ].join(";");
    el.addEventListener("click", () => tap?.());
    document.body.append(el);
    return el;
  };
  return {
    set(text, onTap) {
      clearTimeout(timer);
      const e = ensure();
      tap = onTap;
      e.textContent = text;
      e.style.opacity = "1";
      e.style.pointerEvents = onTap ? "auto" : "none";
      e.style.cursor = onTap ? "pointer" : "default";
    },
    hideSoon() {
      clearTimeout(timer);
      timer = window.setTimeout(() => { if (el) { el.style.opacity = "0"; el.style.pointerEvents = "none"; } }, 4000);
    },
  };
}

/**
 * `atTitle` says whether a reload would lose nothing (the title screen, or
 * still loading); the game passes it from src/main.ts.
 */
export function registerOffline(atTitle: () => boolean = () => false): void {
  if (!import.meta.env.PROD || import.meta.env.MODE === "e2e") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  // Already controlled means this device has a stored release, so a download now is an update.
  const firstInstall = !sw.controller;
  const status = note();
  let updateReady = false;
  const applyUpdate = () => location.reload();
  const offerUpdate = () => {
    if (atTitle()) { applyUpdate(); return; }
    status.set("New version ready. Tap to update", applyUpdate);
  };
  sw.addEventListener("message", (event: MessageEvent<OfflineMessage>) => {
    const m = event.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "offline-progress" && firstInstall) {
      status.set(`Saving for offline play… ${Math.floor((m.done / m.total) * 100)}%`);
    } else if (m.type === "offline-ready") {
      if (firstInstall) { status.set("Ready to play offline"); status.hideSoon(); return; }
      updateReady = true;
      offerUpdate();
    } else if (m.type === "offline-failed" && firstInstall) {
      status.set("Couldn't save for offline play. It'll try again next time.");
      status.hideSoon();
    }
  });
  // Back on the title screen with an update waiting: take it then.
  window.setInterval(() => { if (updateReady && atTitle()) applyUpdate(); }, 2000);
  const start = () => {
    sw.register("./sw.js").then((reg) => {
      window.setInterval(() => { if (navigator.onLine) void reg.update().catch(() => {}); }, UPDATE_CHECK_MS);
    }).catch((err) => console.warn("[offline] service worker not registered:", err));
  };
  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
}
