import { migrate } from "./migrate";
import { sanitize } from "./validate";
import type { SaveData } from "./types";

/** Where the save lives. `load` never throws: a missing or unreadable save is `null`. */
export interface SaveStore {
  load(): Promise<SaveData | null>;
  /** Writes the save and keeps the previous one as a backup. */
  save(data: SaveData): Promise<void>;
  /** The save before the latest `save`, for recovery after a bad import. */
  loadBackup(): Promise<SaveData | null>;
  clear(): Promise<void>;
}

function parse(raw: unknown, now: number): SaveData | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  try {
    return sanitize(migrate(raw as Record<string, unknown>), now);
  } catch {
    return null;
  }
}

export function memorySaveStore(now: () => number = Date.now): SaveStore {
  let cur: unknown = null;
  let backup: unknown = null;
  return {
    async load() {
      return parse(cur && structuredClone(cur), now());
    },
    async save(data) {
      backup = cur;
      cur = structuredClone(data);
    },
    async loadBackup() {
      return parse(backup && structuredClone(backup), now());
    },
    async clear() {
      cur = null;
      backup = null;
    },
  };
}

const DB = "blueprint-clash-save";
const STORE = "save";

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => {
        db.close();
        resolve(req.result);
      };
      t.onerror = t.onabort = () => {
        db.close();
        reject(t.error);
      };
    };
  });
}

/** IndexedDB store. The two keys are written in one transaction, so a crash cannot leave a half-rotated save. */
export function indexedDbSaveStore(now: () => number = Date.now): SaveStore {
  const get = async (key: string) => {
    try {
      return parse(await tx<unknown>("readonly", (s) => s.get(key)), now());
    } catch {
      return null;
    }
  };
  return {
    load: () => get("current"),
    loadBackup: () => get("backup"),
    async save(data) {
      const prev = await tx<unknown>("readonly", (s) => s.get("current")).catch(() => undefined);
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(DB, 1);
        open.onupgradeneeded = () => open.result.createObjectStore(STORE);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const t = db.transaction(STORE, "readwrite");
          const s = t.objectStore(STORE);
          if (prev) s.put(prev, "backup");
          s.put(structuredClone(data), "current");
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = t.onabort = () => {
            db.close();
            reject(t.error);
          };
        };
      });
    },
    async clear() {
      await tx("readwrite", (s) => s.clear());
    },
  };
}
