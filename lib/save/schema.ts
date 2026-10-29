/** Current save schema. Bump SAVE_VERSION and add a migration in migrations.ts when this shape changes. */
export const SAVE_VERSION = 1;

export interface SrsCard {
  /** Epoch ms when the card is next due. */
  due: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface WorkshopRecord {
  /** Highest phase index passed (0 = base, 1..3 = Change Storms). */
  bestPhase: number;
  /** Best score 0..100. */
  bestScore: number;
  attempts: number;
}

export interface SaveSettings {
  audio: boolean;
  reducedMotion: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  player: { name: string };
  /** District ids whose badge the player has earned. */
  badges: string[];
  /** Lesson / card-set ids completed. */
  lessonsDone: string[];
  workshop: Record<string, WorkshopRecord>;
  srs: Record<string, SrsCard>;
  settings: SaveSettings;
}

export function newSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    player: { name: "Apprentice" },
    badges: [],
    lessonsDone: [],
    workshop: {},
    srs: {},
    settings: { audio: true, reducedMotion: false },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** Returns a list of problems; empty means the value is a valid current-version save. */
export function validateSave(v: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(v)) return ["save is not an object"];
  if (v.version !== SAVE_VERSION) errs.push(`version must be ${SAVE_VERSION}`);
  if (!isNum(v.createdAt)) errs.push("createdAt must be a number");
  if (!isNum(v.updatedAt)) errs.push("updatedAt must be a number");
  if (!isObj(v.player) || typeof v.player.name !== "string") errs.push("player.name must be a string");
  if (!isStrArr(v.badges)) errs.push("badges must be a string array");
  if (!isStrArr(v.lessonsDone)) errs.push("lessonsDone must be a string array");
  if (!isObj(v.workshop)) errs.push("workshop must be an object");
  else {
    for (const [id, r] of Object.entries(v.workshop)) {
      if (!isObj(r) || !isNum(r.bestPhase) || !isNum(r.bestScore) || !isNum(r.attempts)) errs.push(`workshop.${id} is malformed`);
    }
  }
  if (!isObj(v.srs)) errs.push("srs must be an object");
  else {
    for (const [id, c] of Object.entries(v.srs)) {
      if (!isObj(c) || !isNum(c.due) || !isNum(c.intervalDays) || !isNum(c.ease) || !isNum(c.reps) || !isNum(c.lapses)) errs.push(`srs.${id} is malformed`);
    }
  }
  if (!isObj(v.settings) || typeof v.settings.audio !== "boolean" || typeof v.settings.reducedMotion !== "boolean") errs.push("settings is malformed");
  return errs;
}
