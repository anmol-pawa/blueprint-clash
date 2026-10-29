import { SAVE_VERSION, sanitizeSave, type SaveData } from "./schema";

/** A migration upgrades the raw JSON from version N to N+1. `migrations[n]` upgrades version n. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Version 1 is the first schema, so there is nothing to upgrade yet. Add `1: (raw) => ({...})` when v2 ships. */
export const MIGRATIONS: Record<number, Migration> = {};

export type MigrateResult = { ok: true; save: SaveData; from: number } | { ok: false; error: string };

/**
 * Bring raw saved data up to the current version, then sanitize it.
 * Data without a version is treated as version 1 (the oldest). Data from a newer
 * build is refused rather than silently downgraded and overwritten.
 */
export function migrateSave(
  raw: unknown,
  target: number = SAVE_VERSION,
  migrations: Record<number, Migration> = MIGRATIONS,
): MigrateResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "Save data is not an object." };
  let cur = raw as Record<string, unknown>;
  const v = cur.version;
  const from = v === undefined ? 1 : v;
  if (typeof from !== "number" || !Number.isInteger(from) || from < 1) return { ok: false, error: "Save has an invalid version." };
  if (from > target) return { ok: false, error: `Save is from a newer version (${from}); update the game to load it.` };
  for (let n = from; n < target; n++) {
    const step = migrations[n];
    if (!step) return { ok: false, error: `No migration from version ${n}.` };
    cur = { ...step(cur), version: n + 1 };
  }
  return { ok: true, save: sanitizeSave(cur), from };
}
