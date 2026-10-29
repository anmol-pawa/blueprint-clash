import { migrate, SaveVersionError } from "./migrate";
import { sanitize } from "./validate";
import type { SaveData } from "./types";

export const EXPORT_FORMAT = "blueprint-clash-save";
/** Larger files are refused before parsing; a real save is a few KB. */
export const MAX_IMPORT_BYTES = 2_000_000;

/** FNV-1a, 32-bit. Detects truncation and accidental edits; it is not tamper-proofing (saves are local). */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function exportSave(save: SaveData): string {
  const data = JSON.stringify(save);
  return JSON.stringify({ format: EXPORT_FORMAT, version: save.version, checksum: checksum(data), data }, null, 2);
}

export type ImportResult = { ok: true; save: SaveData } | { ok: false; error: string };

/** Parses an exported file: size, JSON, envelope, checksum, migration, sanitising. Never throws. */
export function importSave(text: string, now: number): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "File is too large to be a save." };
  let env: unknown;
  try {
    env = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  if (typeof env !== "object" || env === null || (env as { format?: unknown }).format !== EXPORT_FORMAT) {
    return { ok: false, error: "This is not a Blueprint Clash save file." };
  }
  const { data, checksum: sum } = env as { data?: unknown; checksum?: unknown };
  if (typeof data !== "string" || typeof sum !== "string") return { ok: false, error: "Save file is incomplete." };
  if (checksum(data) !== sum) return { ok: false, error: "Checksum mismatch: the file is damaged or was edited." };
  try {
    const raw: unknown = JSON.parse(data);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "Save data is malformed." };
    return { ok: true, save: sanitize(migrate(raw as Record<string, unknown>), now) };
  } catch (e) {
    if (e instanceof SaveVersionError) return { ok: false, error: e.message };
    return { ok: false, error: "Save data is malformed." };
  }
}
