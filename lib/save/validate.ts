import {
  CURRENT_SAVE_VERSION,
  MASTERY_STATES,
  newSave,
  type CompletionEntry,
  type MasteryEntry,
  type SaveData,
  type MasteryState,
} from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Keys that would let imported JSON poison object prototypes. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function mastery(v: unknown): Record<string, MasteryEntry> {
  const out: Record<string, MasteryEntry> = Object.create(null);
  if (!isObj(v)) return { ...out };
  for (const [id, e] of Object.entries(v)) {
    if (UNSAFE_KEYS.has(id) || !isObj(e)) continue;
    if (!MASTERY_STATES.includes(e.state as MasteryState)) continue;
    out[id] = {
      state: e.state as MasteryState,
      lastSeen: num(e.lastSeen, 0, 0),
      intervalDays: num(e.intervalDays, 1, 0, 3650),
      streak: Math.floor(num(e.streak, 0, 0, 1e6)),
    };
  }
  return { ...out };
}

function completions(v: unknown): Record<string, CompletionEntry> {
  const out: Record<string, CompletionEntry> = {};
  if (!isObj(v)) return out;
  for (const [id, e] of Object.entries(v)) {
    if (UNSAFE_KEYS.has(id) || !isObj(e)) continue;
    out[id] = {
      bestScore: num(e.bestScore, 0, 0, 100),
      assisted: bool(e.assisted, false),
      completedAt: num(e.completedAt, 0, 0),
    };
  }
  return out;
}

/**
 * Coerces a migrated raw object into a well-formed `SaveData`: unknown fields are dropped, out-of-range
 * numbers are clamped, malformed entries are skipped. Imported files are untrusted input.
 */
export function sanitize(raw: Record<string, unknown>, now: number): SaveData {
  const base = newSave(now);
  const s = isObj(raw.settings) ? raw.settings : {};
  const name = typeof raw.playerName === "string" ? raw.playerName.trim().slice(0, 24) : "";
  return {
    version: CURRENT_SAVE_VERSION,
    createdAt: num(raw.createdAt, now, 0),
    updatedAt: num(raw.updatedAt, now, 0),
    playerName: name || base.playerName,
    bits: Math.floor(num(raw.bits, 0, 0, 1e9)),
    badges: Array.isArray(raw.badges)
      ? [...new Set(raw.badges.filter((b): b is string => typeof b === "string" && b.length <= 64 && !UNSAFE_KEYS.has(b)))].slice(0, 100)
      : [],
    mastery: mastery(raw.mastery),
    completions: completions(raw.completions),
    settings: {
      sound: bool(s.sound, base.settings.sound),
      music: bool(s.music, base.settings.music),
      reducedMotion: bool(s.reducedMotion, base.settings.reducedMotion),
    },
  };
}
