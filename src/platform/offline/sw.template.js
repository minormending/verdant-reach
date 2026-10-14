// Verdant Reach's service worker: play offline after one visit.
//
// The build (vite.config.ts, offlineCache) fills in the version and the file
// list below: every file in the build, relative to this script. On install the whole
// build is stored in one cache per version, so a phone that opened the game
// once on wifi can play on a plane.
//
// - Pages (navigations) try the network first, so a new deploy shows up as
//   soon as you're online; offline, or after a few seconds of no answer, they
//   come from the cache.
// - Everything else (scripts, art, sounds) comes from the cache first, any
//   stored version, and falls back to the network.
// - The newest two versions are kept, so a page that was open during a deploy
//   can still lazy-load the files it was built with.
const VERSION = "__VERSION__";
const FILES = __FILES__;
const PREFIX = "verdant-reach-";
const CACHE = PREFIX + VERSION;
const KEEP = 2;
const NAV_TIMEOUT_MS = 4000;

async function tell(msg) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of clients) c.postMessage(msg);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const queue = FILES.slice();
    const total = queue.length;
    let done = 0;
    const worker = async () => {
      for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
        const req = new Request(file, { cache: "reload" });
        for (let attempt = 0; ; attempt++) {
          try {
            const res = await fetch(req);
            if (!res.ok) throw new Error(`${res.status} ${file}`);
            await cache.put(req, res);
            break;
          } catch (err) {
            if (attempt >= 2) throw err;
          }
        }
        done++;
        if (done % 40 === 0 || done === total) void tell({ type: "offline-progress", done, total });
      }
    };
    try {
      await Promise.all(Array.from({ length: 6 }, worker));
    } catch (err) {
      // A half-stored version must not replace a complete one.
      await caches.delete(CACHE);
      void tell({ type: "offline-failed", reason: String(err) });
      throw err;
    }
    void tell({ type: "offline-ready", version: VERSION });
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Cache names carry the build time first, so they sort oldest to newest.
    const ours = (await caches.keys()).filter((k) => k.startsWith(PREFIX)).sort();
    for (const old of ours.slice(0, Math.max(0, ours.length - KEEP))) await caches.delete(old);
    await self.clients.claim();
  })());
});

async function fromCache(req, ignoreSearch) {
  // ignoreVary: servers send "Vary: Origin", and module scripts carry an Origin
  // header the stored copies were fetched without.
  return (await caches.match(req, { ignoreSearch, ignoreVary: true })) ?? undefined;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await Promise.race([
          fetch(req),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
        ]);
        if (res.ok) return res;
        throw new Error(String(res.status));
      } catch (err) {
        const hit = await fromCache(req, true)
          ?? await fromCache(new URL("./index.html", self.registration.scope).href, true);
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }
  event.respondWith((async () => (await fromCache(req, true)) ?? fetch(req))());
});
