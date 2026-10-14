// Registers the offline service worker (sw.js, built from sw.template.js) in
// the public build only, and shows a small note while the game is stored for
// offline play: "Saving for offline play… 40%", then "Ready to play offline".
// Dev servers and the e2e build never register it, so tests always load fresh
// files.

type OfflineMessage =
  | { type: "offline-progress"; done: number; total: number }
  | { type: "offline-ready"; version: string }
  | { type: "offline-failed"; reason: string };

function note(): { set(text: string): void; hideSoon(): void } {
  let el: HTMLDivElement | null = null;
  let timer = 0;
  const ensure = () => {
    if (el) return el;
    el = document.createElement("div");
    el.id = "vr-offline";
    el.setAttribute("role", "status");
    el.style.cssText = [
      "position:fixed", "left:50%", "bottom:12px", "transform:translateX(-50%)", "z-index:50",
      "padding:6px 12px", "border-radius:999px", "font:600 13px/1.3 system-ui,sans-serif",
      "background:rgba(12,26,18,0.88)", "color:#e8f0e0", "pointer-events:none",
      "box-shadow:0 2px 8px rgba(0,0,0,0.35)", "transition:opacity 0.4s",
    ].join(";");
    document.body.append(el);
    return el;
  };
  return {
    set(text) { clearTimeout(timer); const e = ensure(); e.textContent = text; e.style.opacity = "1"; },
    hideSoon() {
      clearTimeout(timer);
      timer = window.setTimeout(() => { if (el) el.style.opacity = "0"; }, 4000);
    },
  };
}

export function registerOffline(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE === "e2e") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  // A first install shows its progress; an update installs quietly and only says when it's done.
  const firstInstall = !sw.controller;
  const status = note();
  sw.addEventListener("message", (event: MessageEvent<OfflineMessage>) => {
    const m = event.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "offline-progress" && firstInstall) {
      status.set(`Saving for offline play… ${Math.floor((m.done / m.total) * 100)}%`);
    } else if (m.type === "offline-ready") {
      status.set(firstInstall ? "Ready to play offline" : "Update saved for offline play");
      status.hideSoon();
    } else if (m.type === "offline-failed" && firstInstall) {
      status.set("Couldn't save for offline play. It'll try again next time.");
      status.hideSoon();
    }
  });
  const start = () => { sw.register("./sw.js").catch((err) => console.warn("[offline] service worker not registered:", err)); };
  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
}
