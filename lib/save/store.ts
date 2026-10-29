import { migrateSave } from "./migrate";
import { defaultSave, SAVE_VERSION, type SaveData } from "./schema";

export const SAVE_KEY = "blueprint-clash-save";

/** The slice of the Storage API the store needs, so tests and private windows can swap it. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

export interface SaveStore {
  get(): SaveData;
  update(fn: (s: SaveData) => SaveData): void;
  replace(save: SaveData): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
  /** Non-null when stored data was unreadable and has been set aside (see `quarantineKey`). */
  loadWarning(): string | null;
}

const quarantineKey = (key: string) => `${key}.unreadable`;

/**
 * localStorage-backed store. Storage failures (private mode, quota) keep the game playable in memory.
 * Unreadable or too-new data is copied to a side key before anything overwrites it.
 */
export function createSaveStore(storage: KeyValueStorage | null, key = SAVE_KEY): SaveStore {
  const listeners = new Set<() => void>();
  let warning: string | null = null;

  const load = (): SaveData => {
    if (!storage) return defaultSave();
    try {
      const text = storage.getItem(key);
      if (text === null) return defaultSave();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        raw = null;
      }
      const m = migrateSave(raw);
      if (m.ok) return m.save;
      warning = raw === null ? "Your saved progress could not be read; it was kept aside and a fresh save started." : m.error;
      storage.setItem(quarantineKey(key), text);
    } catch {
      /* storage blocked: play in memory */
    }
    return defaultSave();
  };

  let cache = load();

  const persist = () => {
    try {
      storage?.setItem(key, JSON.stringify(cache));
    } catch {
      /* quota or blocked: keep going in memory */
    }
  };
  const set = (next: SaveData) => {
    cache = { ...next, version: SAVE_VERSION };
    persist();
    listeners.forEach((l) => l());
  };

  return {
    get: () => cache,
    update: (fn) => set(fn(cache)),
    replace: (s) => set(s),
    reset: () => set(defaultSave()),
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    loadWarning: () => warning,
  };
}
