/**
 * Party state and the Singleton "Global State" debuff (GDD §5.2).
 * Using Solo when it was NOT the best fit counts as an overuse; enough recent
 * overuse debuffs later fights (attacks that touch shared state get weaker),
 * and picking better-suited Patternlings heals the count.
 */
import type { Matchup } from "./chart";

export interface PartyState {
  /** Patternling ids the player has recruited (from gym wins and lessons). */
  owned: string[];
  /** Mastery points per Patternling (levels derived below). */
  mastery: Record<string, number>;
  /** Rolling count of unjustified Solo picks. */
  singletonOveruse: number;
}

export const newParty = (): PartyState => ({ owned: [], mastery: {}, singletonOveruse: 0 });

export const DEBUFF_THRESHOLD = 3;
export const DEBUFF_MULTIPLIER = 0.8;
export const MAX_LEVEL = 30;

export function hasGlobalStateDebuff(p: PartyState): boolean {
  return p.singletonOveruse >= DEBUFF_THRESHOLD;
}

export function recruit(p: PartyState, id: string): PartyState {
  return p.owned.includes(id) ? p : { ...p, owned: [...p.owned, id] };
}

/** Level 1..30: each level needs 10 more mastery points than the last (triangular). */
export function levelFromMastery(points: number): number {
  let level = 1;
  let need = 10;
  let left = Math.max(0, points);
  while (level < MAX_LEVEL && left >= need) {
    left -= need;
    level += 1;
    need += 10;
  }
  return level;
}

/** Evolution stage: 1 (base), 2 at level 10, 3 at level 20. */
export const stageForLevel = (level: number): 1 | 2 | 3 => (level >= 20 ? 3 : level >= 10 ? 2 : 1);

/**
 * Record a pick. Solo on a non-super matchup raises overuse; any super pick by
 * another Patternling lowers it by one (floor 0).
 */
export function recordPick(p: PartyState, patternlingId: string, m: Matchup): PartyState {
  const gain = m.effectiveness === "super" ? 3 : m.effectiveness === "neutral" ? 1 : 0;
  const mastery = { ...p.mastery, [patternlingId]: (p.mastery[patternlingId] ?? 0) + gain };
  let overuse = p.singletonOveruse;
  if (patternlingId === "solo" && m.effectiveness !== "super") overuse += 1;
  else if (m.effectiveness === "super") overuse = Math.max(0, overuse - 1);
  return { ...p, mastery, singletonOveruse: overuse };
}

/** Final damage multiplier including the debuff, which only bites the neutral/weak outcomes. */
export function effectiveMultiplier(p: PartyState, m: Matchup): number {
  return hasGlobalStateDebuff(p) && m.effectiveness !== "super" ? m.multiplier * DEBUFF_MULTIPLIER : m.multiplier;
}


