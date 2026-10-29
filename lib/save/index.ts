"use client";
import { useSyncExternalStore } from "react";
import { defaultSave, type SaveData } from "./schema";
import { createSaveStore, type SaveStore } from "./store";

export * from "./schema";
export { exportSave, importSave } from "./transfer";

const SERVER_SAVE = defaultSave();
let store: SaveStore | null = null;

/** The app-wide store, created on first use in the browser. */
export function getStore(): SaveStore {
  if (!store) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    store = createSaveStore(storage);
  }
  return store;
}

export function useSave(): SaveData {
  return useSyncExternalStore(
    (cb) => getStore().subscribe(cb),
    () => getStore().get(),
    () => SERVER_SAVE,
  );
}
