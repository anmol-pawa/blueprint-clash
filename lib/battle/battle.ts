import type { Card, Response } from "./types";

export interface BattleConfig {
  foeHp: number;
  playerHp: number;
  /** Damage for a correct answer, before the streak bonus. */
  baseDamage: number;
  /** Extra damage per consecutive correct answer, capped by `maxStreakBonus` steps. */
  streakBonus: number;
  maxStreakBonus: number;
  /** Damage the foe deals when the answer is wrong. */
  counterDamage: number;
}

export const DEFAULT_CONFIG: BattleConfig = { foeHp: 60, playerHp: 45, baseDamage: 20, streakBonus: 5, maxStreakBonus: 3, counterDamage: 15 };

export type Outcome = "ongoing" | "won" | "lost";

export interface BattleState {
  config: BattleConfig;
  foeHp: number;
  playerHp: number;
  streak: number;
  answered: number;
  correct: number;
  outcome: Outcome;
}

export interface TurnResult {
  state: BattleState;
  correct: boolean;
  /** Damage dealt to the foe (correct) or taken by the player (wrong). */
  damage: number;
  explain: string;
}

export function startBattle(config: BattleConfig = DEFAULT_CONFIG): BattleState {
  return { config, foeHp: config.foeHp, playerHp: config.playerHp, streak: 0, answered: 0, correct: 0, outcome: "ongoing" };
}

/** True when `response` is exactly right for `card`. A multi-select needs the exact set. */
export function grade(card: Card, response: Response): boolean {
  if (card.kind === "multi") {
    if (!Array.isArray(response)) return false;
    const given = new Set(response);
    return given.size === card.answers.length && card.answers.every((i) => given.has(i));
  }
  return typeof response === "number" && response === card.answer;
}

/** Correct = attack (with a streak bonus), wrong = the foe's counter. No-op once the battle is over. */
export function answerCard(state: BattleState, card: Card, response: Response): TurnResult {
  if (state.outcome !== "ongoing") return { state, correct: false, damage: 0, explain: card.explain };
  const { config } = state;
  const correct = grade(card, response);
  let { foeHp, playerHp, streak } = state;
  let damage: number;
  if (correct) {
    damage = config.baseDamage + config.streakBonus * Math.min(streak, config.maxStreakBonus);
    foeHp = Math.max(0, foeHp - damage);
    streak += 1;
  } else {
    damage = config.counterDamage;
    playerHp = Math.max(0, playerHp - damage);
    streak = 0;
  }
  const outcome: Outcome = foeHp === 0 ? "won" : playerHp === 0 ? "lost" : "ongoing";
  const next: BattleState = { ...state, foeHp, playerHp, streak, answered: state.answered + 1, correct: state.correct + (correct ? 1 : 0), outcome };
  return { state: next, correct, damage, explain: card.explain };
}

/** Small deterministic PRNG (mulberry32) so a seed reproduces the same battle. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], next: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns the card with options shuffled and the answer index(es) remapped. */
export function shuffleCard(card: Card, next: () => number): Card {
  const order = shuffle(card.options.map((_, i) => i), next);
  const options = order.map((i) => card.options[i]);
  const remap = (old: number) => order.indexOf(old);
  if (card.kind === "multi") return { ...card, options, answers: card.answers.map(remap).sort((a, b) => a - b) };
  return { ...card, options, answer: remap(card.answer) };
}

/** Picks up to `n` distinct cards in a seeded order, shuffling each card's options. */
export function drawDeck(cards: readonly Card[], n: number, seed: number): Card[] {
  const next = rng(seed);
  return shuffle(cards, next).slice(0, n).map((c) => shuffleCard(c, next));
}
