// The editor's edits in IndexedDB, so a reload (and the game's ?trainerlab=1
// boot) sees the same trainers. Every call is guarded: without IndexedDB
// (private windows, blocked storage) the editor still works, it just forgets
// on reload.

import type { Edits } from "./edits";

const DB = "verdant.trainereditor";
const STORE = "state";
const KEY = "current";
const VERSION = 1;

interface Saved { v: 1; edits: Edits; savedAt: number }

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

/** The saved edits, or null (nothing saved, or no IndexedDB). */
export async function loadEdits(): Promise<Edits | null> {
  try {
    const s = (await run("readonly", (st) => st.get(KEY))).value as Saved | undefined;
    if (!s || s.v !== 1 || !s.edits || typeof s.edits !== "object") return null;
    return s.edits;
  } catch {
    return null;
  }
}

/** Save the edits. Resolves false when they could not be stored. */
export async function saveEdits(edits: Edits): Promise<boolean> {
  try {
    return (await run("readwrite", (st) => st.put({ v: 1, edits, savedAt: Date.now() } satisfies Saved, KEY))).ok;
  } catch {
    return false;
  }
}
