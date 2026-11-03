// District master fight (GDD 5.1, 9): three phases against one opponent with one shared HP pool.
//   1. cards    - a concept card battle (reuses the battle state machine)
//   2. workshop - a small judged exercise; the result is a pass ratio, not an answer
//   3. smell    - the "smell boss": smell-spotter cards only
// Pure and deterministic: no DOM, no Pixi, no judge. The UI feeds in the judge's verdict.
import { answer, startBattle, type AnswerResult, type BattleConfig, type BattleState } from "./battle";
import type { Card } from "./cards";

export interface MasterConfig {
  playerHp: number;
  cardsFoeHp: number;
  smellFoeHp: number;
  baseDamage: number;
  streakBonus: number;
  streakCap: number;
  /** Damage dealt to the player by a wrong card answer. */
  counterDamage: number;
  /** Fraction of the exercise's tests that must pass to beat phase 2. */
  workshopPassRatio: number;
  /** Damage to the player for each failed workshop submission. */
  workshopMissDamage: number;
  /** Failed submissions allowed before the master wins the phase. */
  workshopMaxAttempts: number;
  /** HP restored after phases 1 and 2 (capped at `playerHp`). */
  healBetweenPhases: number;
}

export const DEFAULT_MASTER_CONFIG: Readonly<MasterConfig> = {
  playerHp: 60,
  cardsFoeHp: 60,
  smellFoeHp: 48,
  baseDamage: 12,
  streakBonus: 3,
  streakCap: 3,
  counterDamage: 10,
  workshopPassRatio: 1,
  workshopMissDamage: 12,
  workshopMaxAttempts: 3,
  healBetweenPhases: 10,
};

export type MasterPhase = "cards" | "workshop" | "smell" | "won" | "lost";

export interface MasterDeck {
  cards: readonly Card[];
  /** Only `smell` cards; validated by `startMaster`. */
  smells: readonly Card[];
}

export interface MasterState {
  config: MasterConfig;
  phase: MasterPhase;
  /** Which phase the fight ended in (so a loss can say where). Equals `phase` while ongoing. */
  endedIn: "cards" | "workshop" | "smell" | null;
  playerHp: number;
  /** Inner card battle for the cards and smell phases (kept after a loss for display); null during the workshop and after a win. */
  battle: BattleState | null;
  /** Failed workshop submissions so far. */
  workshopFails: number;
  workshopBest: number;
  /** Ids missed in either card phase (first-miss order); feeds the review queue. */
  missed: string[];
  deck: MasterDeck;
  seed: number;
}

export function startMaster(deck: MasterDeck, seed: number, config: MasterConfig = { ...DEFAULT_MASTER_CONFIG }): MasterState {
  if (deck.cards.length === 0) throw new Error("master needs a cards deck");
  if (deck.smells.length === 0) throw new Error("master needs smell cards");
  const bad = deck.smells.find((c) => c.kind !== "smell");
  if (bad) throw new Error(`smell phase only takes smell cards (got ${bad.kind}: ${bad.id})`);
  return {
    config,
    phase: "cards",
    endedIn: null,
    playerHp: config.playerHp,
    battle: startBattle(deck.cards, seed, battleConfig(config, config.cardsFoeHp, config.playerHp)),
    workshopFails: 0,
    workshopBest: 0,
    missed: [],
    deck,
    seed,
  };
}

function battleConfig(c: MasterConfig, foeHp: number, playerHp: number): BattleConfig {
  return { foeHp, playerHp, baseDamage: c.baseDamage, streakBonus: c.streakBonus, streakCap: c.streakCap, counterDamage: c.counterDamage };
}

const heal = (s: MasterState): number => Math.min(s.config.playerHp, s.playerHp + s.config.healBetweenPhases);

export const masterCard = (s: MasterState): Card | undefined => (s.battle && s.battle.status === "asking" ? s.battle.queue[0] : undefined);

/** Answers the current card (phases 1 and 3). Never mutates `s`. */
export function masterAnswer(s: MasterState, selected: readonly number[]): { state: MasterState; result: AnswerResult } {
  if (!s.battle || (s.phase !== "cards" && s.phase !== "smell")) throw new Error(`no card to answer in phase ${s.phase}`);
  const { state: b, result } = answer(s.battle, selected);
  const missed = s.missed.slice();
  for (const id of b.missed) if (!missed.includes(id)) missed.push(id);
  let next: MasterState = { ...s, battle: b, playerHp: b.playerHp, missed };
  if (b.status === "lost") return { state: { ...next, phase: "lost", endedIn: s.phase }, result };
  if (b.status === "won") {
    if (s.phase === "cards") {
      next = { ...next, phase: "workshop", battle: null, playerHp: heal(next) };
    } else {
      next = { ...next, phase: "won", endedIn: "smell", battle: null };
    }
  }
  return { state: next, result };
}

export interface WorkshopVerdict {
  passed: number;
  total: number;
  /** True if the player looked at the reference first; an assisted pass does not beat the master. */
  assisted?: boolean;
}

export interface WorkshopOutcome {
  state: MasterState;
  beaten: boolean;
  damageToPlayer: number;
}

/**
 * Applies a judged submission in phase 2. A pass moves to the smell boss (with a small heal); a miss costs HP, and
 * running out of attempts or HP loses the fight. An assisted submission never counts as a pass.
 */
export function submitWorkshop(s: MasterState, v: WorkshopVerdict): WorkshopOutcome {
  if (s.phase !== "workshop") throw new Error(`not in the workshop phase (${s.phase})`);
  const ratio = v.total > 0 ? v.passed / v.total : 0;
  const best = Math.max(s.workshopBest, ratio);
  const beaten = !v.assisted && v.total > 0 && ratio >= s.config.workshopPassRatio;
  if (beaten) {
    const healed = heal(s);
    return {
      beaten: true,
      damageToPlayer: 0,
      state: {
        ...s,
        workshopBest: best,
        playerHp: healed,
        phase: "smell",
        battle: startBattle(s.deck.smells, s.seed + 1, battleConfig(s.config, s.config.smellFoeHp, healed)),
      },
    };
  }
  const damage = s.config.workshopMissDamage;
  const playerHp = Math.max(0, s.playerHp - damage);
  const workshopFails = s.workshopFails + 1;
  const out = playerHp === 0 || workshopFails >= s.config.workshopMaxAttempts;
  return {
    beaten: false,
    damageToPlayer: damage,
    state: { ...s, workshopBest: best, playerHp, workshopFails, ...(out ? { phase: "lost" as const, endedIn: "workshop" as const } : {}) },
  };
}

/** The master's remaining HP across the whole fight, 1 = untouched, 0 = beaten. Phases weigh cards 40 %, workshop 20 %, smell 40 %. */
export function masterHpFraction(s: MasterState): number {
  const frac = (b: BattleState | null) => (b ? b.foeHp / b.config.foeHp : 0);
  switch (s.phase) {
    case "cards":
      return 0.6 + 0.4 * frac(s.battle);
    case "workshop":
      return 0.6;
    case "smell":
      return 0.4 * frac(s.battle);
    case "won":
      return 0;
    case "lost":
      return s.endedIn === "workshop" ? 0.6 : s.endedIn === "cards" ? 0.6 + 0.4 * frac(s.battle) : 0.4 * frac(s.battle);
  }
}

/** 0-3 stars. Defeat 0; a clean run (no card misses, workshop first try) 3; at most two slips 2; otherwise 1. */
export function masterStars(s: MasterState): number {
  if (s.phase !== "won") return 0;
  const slips = s.missed.length + s.workshopFails;
  return slips === 0 ? 3 : slips <= 2 ? 2 : 1;
}

/** Badge earned only on victory. */
export const earnsBadge = (s: MasterState): boolean => s.phase === "won";
