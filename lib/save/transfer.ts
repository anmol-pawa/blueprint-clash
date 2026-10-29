import { migrate, type Migration, MIGRATIONS } from "./migrations";
import { SAVE_VERSION, validateSave, type SaveData } from "./schema";

const APP = "blueprint-clash";

export interface ExportEnvelope {
  app: typeof APP;
  version: number;
  exportedAt: number;
  /** FNV-1a over the canonical JSON of `data`; catches accidental edits and truncation, not tampering. */
  checksum: string;
  data: SaveData;
}

/** Key-sorted JSON so the checksum does not depend on property order. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function exportSave(data: SaveData, now: number): string {
  const env: ExportEnvelope = { app: APP, version: SAVE_VERSION, exportedAt: now, checksum: checksum(canonicalJson(data)), data };
  return JSON.stringify(env, null, 2);
}

export type ImportResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** Parses an exported file: envelope, checksum, migration to the current version, then full validation. */
export function importSave(text: string, migrations: Migration[] = MIGRATIONS): ImportResult {
  let env: unknown;
  try {
    env = JSON.parse(text);
  } catch {
    return { ok: false, error: "not valid JSON" };
  }
  if (typeof env !== "object" || env === null) return { ok: false, error: "not a Blueprint Clash save" };
  const e = env as Record<string, unknown>;
  if (e.app !== APP) return { ok: false, error: "not a Blueprint Clash save" };
  if (typeof e.checksum !== "string" || checksum(canonicalJson(e.data)) !== e.checksum) {
    return { ok: false, error: "checksum mismatch: the file was edited or is truncated" };
  }
  const m = migrate(e.data, migrations);
  if (!m.ok) return m;
  const errs = validateSave(m.data);
  if (errs.length) return { ok: false, error: `invalid save: ${errs[0]}` };
  return { ok: true, data: m.data as unknown as SaveData };
}
