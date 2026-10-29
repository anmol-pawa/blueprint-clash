// Pure card-battle state machine (GDD 5.1): correct = attack, wrong = the foe's counter + an explanation.
import { isCorrect, type Card } from "./cards";

export interface BattleConfig {
  foeHp: number;
  playerHp: number;
  /** Damage dealt by a correct answer before the streak bonus. */
  baseDamage: number;
  /** Extra damage per consecutive correct answer, capped at `streakCap` steps. */
  streakBonus: number;
  streakCap: number;
  /** Damage the foe deals on a wrong answer. */
  counterDamage: number;
}

export const DEFAULT_CONFIG: Readonly<BattleConfig> = { foeHp: 60, playerHp: 40, baseDamage: 12, streakBonus: 3, streakCap: 3, counterDamage: 10 };

export type BattleStatus = "asking" | "won" | "lost";

export interface BattleState {
  config: BattleConfig;
  foeHp: number;
  playerHp: number;
  streak: number;
  /** Cards still to ask; the head is the current card. */
  queue: Card[];
  status: BattleStatus;
  /** Ids answered wrongly at least once, in first-miss order (feeds the review queue later). */
  missed: string[];
  answered: number;
}

export interface AnswerResult {
  correct: boolean;
  damageToFoe: number;
  damageToPlayer: number;
  explain: string;
}

/** Small deterministic PRNG (mulberry32) so battles and tests are reproducible. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Re-orders a card's options, remapping `answer`. Predict cards keep their option text. */
export function shuffleOptions(card: Card, rand: () => number): Card {
  const order = shuffled(card.options.map((_, i) => i), rand);
  return { ...card, options: order.map((i) => card.options[i]), answer: card.answer.map((a) => order.indexOf(a)).sort((x, y) => x - y) };
}

export function startBattle(deck: readonly Card[], seed: number, config: BattleConfig = { ...DEFAULT_CONFIG }): BattleState {
  const rand = rng(seed);
  return {
    config,
    foeHp: config.foeHp,
    playerHp: config.playerHp,
    streak: 0,
    queue: shuffled(deck, rand).map((c) => shuffleOptions(c, rand)),
    status: deck.length === 0 ? "won" : "asking",
    missed: [],
    answered: 0,
  };
}

export const currentCard = (s: BattleState): Card | undefined => (s.status === "asking" ? s.queue[0] : undefined);

/**
 * Applies an answer to the current card. A missed card goes to the back of the queue so it returns
 * after the player has seen other cards (spacing, not instant repeat). Never mutates `s`.
 */
export function answer(s: BattleState, selected: readonly number[]): { state: BattleState; result: AnswerResult } {
  const card = currentCard(s);
  if (!card) throw new Error("battle is over");
  const correct = isCorrect(card, selected);
  const rest = s.queue.slice(1);
  const { config } = s;
  let foeHp = s.foeHp;
  let playerHp = s.playerHp;
  let streak = s.streak;
  let damageToFoe = 0;
  let damageToPlayer = 0;
  let queue = rest;
  const missed = s.missed.slice();
  if (correct) {
    damageToFoe = config.baseDamage + config.streakBonus * Math.min(streak, config.streakCap);
    foeHp = Math.max(0, foeHp - damageToFoe);
    streak += 1;
  } else {
    damageToPlayer = config.counterDamage;
    playerHp = Math.max(0, playerHp - damageToPlayer);
    streak = 0;
    queue = [...rest, card];
    if (!missed.includes(card.id)) missed.push(card.id);
  }
  const status: BattleStatus = foeHp === 0 ? "won" : playerHp === 0 ? "lost" : queue.length === 0 ? "won" : "asking";
  return { state: { ...s, foeHp, playerHp, streak, queue, missed, status, answered: s.answered + 1 }, result: { correct, damageToFoe, damageToPlayer, explain: card.explain } };
}

/** 0-3 stars: perfect = 3, at most one miss = 2, victory = 1, defeat = 0. */
export function stars(s: BattleState): number {
  if (s.status !== "won") return 0;
  return s.missed.length === 0 ? 3 : s.missed.length === 1 ? 2 : 1;
}
