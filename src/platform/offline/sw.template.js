// Verdant Reach's service worker: play offline after one visit, and switch
// to a new release cleanly.
//
// The build (vite.config.ts, offlineCache) fills in the version and the file
// list below: every file in the build, relative to this script. Each release
// is stored whole, in its own cache, and a cache is only used once every file
// is in it (the COMPLETE marker), so a half-downloaded release never mixes in.
//
// - A page opens from the newest complete release, and keeps using that same
//   release for everything it loads, so its code and art always match (art
//   files keep their names between releases; code files don't).
// - The browser checks this script for a new release whenever a page opens
//   online. A new release downloads in the background; when it's stored, the
//   page is told (register.ts reloads on the title screen, or offers a tap to
//   update) and the next page opens on it, whichever worker answers.
// - With nothing stored yet (the first visit), pages come from the network.
// - The newest two releases are kept, so a page that's still open on the
//   previous release can finish loading its own files.
const VERSION = "__VERSION__";
const FILES = __FILES__;
const PREFIX = "verdant-reach-";
const CACHE = PREFIX + VERSION;
const COMPLETE = "__complete__";
const KEEP = 2;

/** Which release each open page started on (lost if the browser stops this worker; then the newest is used). */
const pinned = new Map();

async function tell(msg) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of clients) c.postMessage(msg);
}

function markerUrl(name) {
  return new URL(`./${COMPLETE}?${name}`, self.registration.scope).href;
}

/** Complete releases, newest first (names carry the build time, so they sort by age). */
async function scanComplete() {
  const ours = (await caches.keys()).filter((k) => k.startsWith(PREFIX)).sort().reverse();
  const out = [];
  for (const name of ours) {
    const cache = await caches.open(name);
    if (await cache.match(markerUrl(name))) out.push(name);
  }
  return out;
}

// The scan runs once per worker start and again after an install or activate,
// not for each of the ~2,000 files a page loads at boot.
let completeList;
function completeCaches() {
  completeList ??= scanComplete();
  return completeList.then((list) => list.slice());
}
function rescan() { completeList = undefined; }

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    if (await cache.match(markerUrl(CACHE))) return;
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
      await cache.put(markerUrl(CACHE), new Response(VERSION));
      rescan();
    } catch (err) {
      await caches.delete(CACHE);
      void tell({ type: "offline-failed", reason: String(err) });
      throw err;
    }
    void tell({ type: "offline-ready", version: VERSION });
    // No skipWaiting: the worker that is already running opens new pages from
    // this release as soon as it is complete (see fetch below), so nothing
    // waits on this worker taking over. Taking over mid-request can drop a page
    // load that the old worker is answering, which hangs it (seen offline).
    // This worker becomes the active one once every tab has closed.
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const ours = (await caches.keys()).filter((k) => k.startsWith(PREFIX)).sort();
    const complete = new Set(await completeCaches());
    // Drop incomplete releases (except one still installing: this one is complete by now)
    // and everything but the newest KEEP complete ones.
    const keep = new Set([...complete].sort().reverse().slice(0, KEEP));
    for (const name of ours) if (!keep.has(name)) await caches.delete(name);
    rescan();
    await self.clients.claim();
  })());
});

async function matchIn(name, req) {
  const cache = await caches.open(name);
  // ignoreSearch: ?tilelab=1 and the like are the same file. ignoreVary: servers
  // send "Vary: Origin", and module scripts carry an Origin header the stored
  // copies were fetched without.
  return (await cache.match(req, { ignoreSearch: true, ignoreVary: true })) ?? undefined;
}

/** The page's own release first, then the others newest first. */
async function lookup(req, first) {
  const order = await completeCaches();
  if (first && order.includes(first)) order.splice(order.indexOf(first), 1), order.unshift(first);
  for (const name of order) {
    const hit = await matchIn(name, req);
    if (hit) return { hit, name };
  }
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      // A release stored by a newer worker since this one started counts too.
      rescan();
      const found = await lookup(req) ?? await lookup(new URL("./index.html", self.registration.scope).href);
      if (found) {
        if (event.resultingClientId) pinned.set(event.resultingClientId, found.name);
        return found.hit;
      }
      return fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const found = await lookup(req, pinned.get(event.clientId));
    return found ? found.hit : fetch(req);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "offline-version") event.source?.postMessage({ type: "offline-version", version: VERSION });
});
