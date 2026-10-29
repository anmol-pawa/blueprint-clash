import { migrate } from "./migrations";
import { newSave, validateSave, type SaveData } from "./schema";

/** Where the single save slot lives. */
export interface SaveStore {
  read(): Promise<unknown | null>;
  write(data: SaveData): Promise<void>;
  clear(): Promise<void>;
}

export function memorySaveStore(initial?: unknown): SaveStore {
  let v: unknown = initial ?? null;
  return {
    async read() {
      return v === null ? null : structuredClone(v);
    },
    async write(d) {
      v = structuredClone(d);
    },
    async clear() {
      v = null;
    },
  };
}

const DB = "blueprint-clash-save";
const STORE = "save";
const KEY = "slot1";

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => {
        db.close();
        resolve(req.result);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    };
  });
}

export function indexedDbSaveStore(): SaveStore {
  return {
    read: async () => (await tx<unknown>("readonly", (s) => s.get(KEY))) ?? null,
    write: async (d) => {
      await tx("readwrite", (s) => s.put(d, KEY));
    },
    clear: async () => {
      await tx("readwrite", (s) => s.delete(KEY));
    },
  };
}

export interface LoadOutcome {
  data: SaveData;
  /** Why a stored save was not used (corrupt or from a newer game); the stored value is left untouched. */
  warning?: string;
}

/**
 * Loads the slot, migrating old versions. A missing slot gives a fresh save. A corrupt or newer save also gives a
 * fresh in-memory save with a warning, and is not overwritten until the caller saves (so the player can export it).
 */
export async function loadSave(store: SaveStore, now: number): Promise<LoadOutcome> {
  let raw: unknown;
  try {
    raw = await store.read();
  } catch {
    return { data: newSave(now), warning: "storage unavailable; progress will not persist" };
  }
  if (raw === null) return { data: newSave(now) };
  const m = migrate(raw);
  if (!m.ok) return { data: newSave(now), warning: m.error };
  const errs = validateSave(m.data);
  if (errs.length) return { data: newSave(now), warning: `stored save is invalid: ${errs[0]}` };
  return { data: m.data as unknown as SaveData };
}

/** Applies `update` to a copy and persists it with a fresh `updatedAt`. */
export async function updateSave(store: SaveStore, current: SaveData, update: (d: SaveData) => void, now: number): Promise<SaveData> {
  const next = structuredClone(current);
  update(next);
  next.updatedAt = now;
  await store.write(next);
  return next;
}
