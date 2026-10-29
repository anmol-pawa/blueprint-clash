import { CURRENT_SAVE_VERSION } from "./types";

/** A migration upgrades a raw object from version `from` to `from + 1`. It must not throw on missing fields. */
export interface Migration {
  from: number;
  up(raw: Record<string, unknown>): Record<string, unknown>;
}

/** Append-only. Version 1 is the first shipped schema, so there is nothing to migrate yet. */
export const MIGRATIONS: Migration[] = [];

export class SaveVersionError extends Error {}

/**
 * Walks `raw` up to `target` one version at a time. Throws `SaveVersionError` for a save from a newer
 * game (never silently downgrade) or when a migration step is missing.
 */
export function migrate(
  raw: Record<string, unknown>,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = CURRENT_SAVE_VERSION,
): Record<string, unknown> {
  let cur = raw;
  let v = typeof cur.version === "number" && Number.isInteger(cur.version) ? cur.version : NaN;
  if (Number.isNaN(v) || v < 1) throw new SaveVersionError("Save has no valid version.");
  if (v > target) throw new SaveVersionError(`Save is from a newer game version (${v} > ${target}). Update the app.`);
  while (v < target) {
    const step = migrations.find((m) => m.from === v);
    if (!step) throw new SaveVersionError(`No migration from save version ${v}.`);
    cur = { ...step.up(cur), version: v + 1 };
    v += 1;
  }
  return cur;
}
