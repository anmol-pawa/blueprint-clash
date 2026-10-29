/** Save data model. Pure: no DOM, no storage. Bump SAVE_VERSION and add a migration in migrate.ts when the shape changes. */
export const SAVE_VERSION = 1;

export interface Settings {
  volume: number; // 0..1
  music: boolean;
  reducedMotion: boolean;
  zen: boolean; // no timers in battles and mocks
}

/** Mastery ladder from GDD §6. */
export const MASTERY_LEVELS = ["seen", "learning", "practiced", "mastered", "ingrained"] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export interface MasteryEntry {
  level: MasteryLevel;
  /** Day number (days since epoch, UTC) the item is next due for review. */
  due: number;
  /** Correct answers in a row, unassisted. */
  streak: number;
}

export interface WorkshopResult {
  /** Best number of behaviour tests passed in each phase, keyed by phase name. */
  best: Record<string, number>;
  /** True once every phase passed without viewing the reference. */
  cleared: boolean;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  xp: number;
  bits: number; // soft currency; never buys mastery
  seenIntro: boolean;
  badges: string[];
  cleared: string[]; // lesson / card-set ids completed at least once
  mastery: Record<string, MasteryEntry>;
  workshop: Record<string, WorkshopResult>;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { volume: 0.6, music: true, reducedMotion: false, zen: false };

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    xp: 0,
    bits: 0,
    seenIntro: false,
    badges: [],
    cleared: [],
    mastery: {},
    workshop: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nat = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 120))] : [];

/**
 * Coerce untrusted data (storage, imported file) into a valid current-version save.
 * Bad fields fall back to defaults, so a hand-edited file can never crash the game.
 */
export function sanitizeSave(raw: unknown): SaveData {
  const out = defaultSave();
  if (!isObj(raw)) return out;
  out.xp = nat(raw.xp);
  out.bits = nat(raw.bits);
  out.seenIntro = bool(raw.seenIntro, false);
  out.badges = strings(raw.badges);
  out.cleared = strings(raw.cleared);

  if (isObj(raw.mastery)) {
    for (const [id, e] of Object.entries(raw.mastery)) {
      if (!isObj(e) || !(MASTERY_LEVELS as readonly unknown[]).includes(e.level)) continue;
      out.mastery[id] = { level: e.level as MasteryLevel, due: nat(e.due), streak: nat(e.streak) };
    }
  }
  if (isObj(raw.workshop)) {
    for (const [id, w] of Object.entries(raw.workshop)) {
      if (!isObj(w)) continue;
      const best: Record<string, number> = {};
      if (isObj(w.best)) for (const [phase, n] of Object.entries(w.best)) best[phase] = nat(n);
      out.workshop[id] = { best, cleared: bool(w.cleared, false) };
    }
  }
  if (isObj(raw.settings)) {
    const s = raw.settings;
    const vol = typeof s.volume === "number" && Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : DEFAULT_SETTINGS.volume;
    out.settings = {
      volume: vol,
      music: bool(s.music, DEFAULT_SETTINGS.music),
      reducedMotion: bool(s.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
      zen: bool(s.zen, DEFAULT_SETTINGS.zen),
    };
  }
  return out;
}

export const level = (xp: number) => Math.floor(Math.sqrt(xp / 120)) + 1;
