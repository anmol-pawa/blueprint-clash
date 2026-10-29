import { migrateSave } from "./migrate";
import type { SaveData } from "./schema";

/** Envelope format of an exported file. Independent of the save's own schema version. */
export const EXPORT_FORMAT = 1;
const APP = "blueprint-clash";

export interface ExportFile {
  app: typeof APP;
  format: number;
  exportedAt: string;
  save: SaveData;
  /** FNV-1a of the canonical save JSON. Catches truncation and accidental edits; it is not a security feature. */
  checksum: string;
}

/** JSON with sorted keys, so the checksum does not depend on property order. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function exportSave(save: SaveData, now: Date = new Date()): string {
  const file: ExportFile = {
    app: APP,
    format: EXPORT_FORMAT,
    exportedAt: now.toISOString(),
    save,
    checksum: checksum(canonicalJson(save)),
  };
  return JSON.stringify(file, null, 2);
}

export type ImportResult = { ok: true; save: SaveData; migratedFrom: number } | { ok: false; error: string };

export function importSave(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null) return { ok: false, error: "That file is not a Blueprint Clash save." };
  const f = parsed as Partial<ExportFile>;
  if (f.app !== APP) return { ok: false, error: "That file is not a Blueprint Clash save." };
  if (typeof f.format !== "number" || f.format > EXPORT_FORMAT) return { ok: false, error: "That save file is from a newer export format." };
  if (f.checksum !== checksum(canonicalJson(f.save))) return { ok: false, error: "The save file is damaged or was edited (checksum mismatch)." };
  const m = migrateSave(f.save);
  if (!m.ok) return m;
  return { ok: true, save: m.save, migratedFrom: m.from };
}
