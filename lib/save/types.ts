/** Mastery ladder (GDD §6). Intervals are scheduled by the SRS (C3). */
export const MASTERY_STATES = ["seen", "learning", "practiced", "mastered", "ingrained"] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];

export interface MasteryEntry {
  state: MasteryState;
  /** Epoch ms of the last review. */
  lastSeen: number;
  /** Days until the next review is due. */
  intervalDays: number;
  /** Consecutive correct reviews. */
  streak: number;
}

export interface CompletionEntry {
  /** Best score in [0, 100]. */
  bestScore: number;
  /** True when the reference was viewed; assisted completions never advance mastery. */
  assisted: boolean;
  completedAt: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  playerName: string;
  /** Currency for hints and cosmetics. Never buys mastery. */
  bits: number;
  badges: string[];
  mastery: Record<string, MasteryEntry>;
  completions: Record<string, CompletionEntry>;
  settings: Settings;
}

export const CURRENT_SAVE_VERSION = 1;

export function newSave(now: number): SaveData {
  return {
    version: CURRENT_SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    playerName: "Architect",
    bits: 0,
    badges: [],
    mastery: {},
    completions: {},
    settings: { sound: true, music: true, reducedMotion: false },
  };
}
