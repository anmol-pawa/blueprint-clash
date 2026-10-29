import type { ProjectFile } from "@/lib/judge/types";

/** Persists the player's files per problem so a refresh never loses work. */
export interface DraftStore {
  load(key: string): Promise<ProjectFile[] | null>;
  save(key: string, files: ProjectFile[]): Promise<void>;
  clear(key: string): Promise<void>;
}

export function memoryDraftStore(): DraftStore {
  const m = new Map<string, ProjectFile[]>();
  return {
    async load(key) {
      const v = m.get(key);
      return v ? v.map((f) => ({ ...f })) : null;
    },
    async save(key, files) {
      m.set(key, files.map((f) => ({ path: f.path, content: f.content })));
    },
    async clear(key) {
      m.delete(key);
    },
  };
}

const DB = "blueprint-clash-drafts";
const STORE = "drafts";

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

/** IndexedDB-backed store. Failures (private mode, quota) degrade to "no draft" instead of breaking the editor. */
export function indexedDbDraftStore(): DraftStore {
  return {
    async load(key) {
      try {
        const v = await tx<ProjectFile[] | undefined>("readonly", (s) => s.get(key));
        return v ?? null;
      } catch {
        return null;
      }
    },
    async save(key, files) {
      try {
        await tx("readwrite", (s) => s.put(files.map((f) => ({ path: f.path, content: f.content })), key));
      } catch {
        /* drafts are best-effort */
      }
    },
    async clear(key) {
      try {
        await tx("readwrite", (s) => s.delete(key));
      } catch {
        /* best-effort */
      }
    },
  };
}

/** Coalesces rapid edits into one save after `ms` of quiet. `flush` writes immediately. */
export function debouncedSaver(store: DraftStore, key: string, ms = 600) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: ProjectFile[] | null = null;
  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const files = pending;
    pending = null;
    if (files) await store.save(key, files);
  };
  return {
    schedule(files: ProjectFile[]) {
      pending = files;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), ms);
    },
    flush,
  };
}
