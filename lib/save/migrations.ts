import { SAVE_VERSION } from "./schema";

/** A migration upgrades a save from `from` to `from + 1`. It must not mutate its input. */
export interface Migration {
  from: number;
  up(old: Record<string, unknown>): Record<string, unknown>;
}

/** Registered migrations. Empty while v1 is the first shipped schema. */
export const MIGRATIONS: Migration[] = [];

export type MigrateResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

export function migrate(raw: unknown, migrations: Migration[] = MIGRATIONS, target = SAVE_VERSION): MigrateResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "save is not an object" };
  let cur = raw as Record<string, unknown>;
  let v = cur.version;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) return { ok: false, error: "save has no valid version" };
  if (v > target) return { ok: false, error: `save is from a newer version (${v}); update the game first` };
  while (v < target) {
    const m = migrations.find((x) => x.from === v);
    if (!m) return { ok: false, error: `no migration from version ${v}` };
    cur = { ...m.up(cur), version: v + 1 };
    v += 1;
  }
  return { ok: true, data: cur };
}
