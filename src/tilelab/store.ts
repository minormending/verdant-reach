// The lab's state in IndexedDB, so a reload (and the game's ?tilelab=1 boot)
// gets the same overrides. Every call is guarded: without IndexedDB (private
// windows, blocked storage) the lab still works, it just forgets on reload.

import type { LabState } from "./plan";

const DB = "verdant.tilelab";
const STORE = "state";
const KEY = "current";
const VERSION = 1;

interface Saved { v: 1; state: LabState; savedAt: number }

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") { resolve(null); return; }
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Run one request; `ok` is false when IndexedDB is unavailable or the transaction failed. */
function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<{ ok: boolean; value?: T }> {
  return open().then((db) => new Promise<{ ok: boolean; value?: T }>((resolve) => {
    if (!db) { resolve({ ok: false }); return; }
    try {
      const tx = db.transaction(STORE, mode);
      const req = f(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve({ ok: true, value: req.result }); };
      tx.onerror = tx.onabort = () => { db.close(); resolve({ ok: false }); };
    } catch {
      db.close();
      resolve({ ok: false });
    }
  }));
}

/** The saved state, or null (nothing saved, or no IndexedDB). */
export async function loadState(): Promise<LabState | null> {
  const s = (await run("readonly", (st) => st.get(KEY))).value as Saved | undefined;
  if (!s || s.v !== 1 || !s.state || typeof s.state !== "object") return null;
  const st = s.state;
  return { edits: st.edits ?? {}, sheets: st.sheets ?? {}, mapping: st.mapping ?? null, packs: Array.isArray(st.packs) ? st.packs : [] };
}

/** Save the state. Resolves false when it could not be stored. */
export async function saveState(state: LabState): Promise<boolean> {
  const saved: Saved = { v: 1, state, savedAt: Date.now() };
  try {
    return (await run("readwrite", (st) => st.put(saved, KEY))).ok;
  } catch {
    return false; // e.g. a value that can't be cloned
  }
}

export async function clearState(): Promise<boolean> {
  return (await run("readwrite", (st) => st.delete(KEY))).ok;
}
