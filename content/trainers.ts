import type { Card } from "@/lib/battle/cards";
import { DEFAULT_CONFIG, type BattleConfig } from "@/lib/battle/battle";
import { getDeck } from "./decks";

/** A short "concept duel" with an overworld trainer: a few cards from one deck, filtered by topic. */
export interface TrainerProfile {
  id: string;
  name: string;
  /** Deck the duel cards come from. */
  deckId: string;
  /** CURRICULUM topic tags the duel draws from. */
  topics: readonly string[];
  /** Cards in the duel (fewer than the deck: duels are a warm-up, not a trial). */
  cardCount: number;
  /** Foe label in the battle HUD. */
  foeName: string;
  intro: string;
  win: string;
  lose: string;
}

export const SABLE_QUILL: TrainerProfile = {
  id: "sable-quill",
  name: "Sable Quill",
  deckId: "solid-square",
  topics: ["L2.srp", "L2.cohesion", "L2.ocp", "L2.kiss", "L2.dry"],
  cardCount: 6,
  foeName: "SABLE'S DRAFT",
  intro: "Sable Quill wants to know what you do when a class has three reasons to change.",
  win: "Sable nods. Reasons to change, not method count: you have it.",
  lose: "Sable slides a red pen across. Read the explanations, then come back.",
};

export const ROOK_FERRIS: TrainerProfile = {
  id: "rook-ferris",
  name: "Rook Ferris",
  deckId: "solid-square",
  topics: ["L2.dip", "L2.isp", "L2.lsp", "L2.coupling"],
  cardCount: 6,
  foeName: "ROOK'S DRAFT",
  intro: "Rook Ferris plugs in a fake clock and asks which way the arrows should point.",
  win: "Rook grins. The policy owns the interface; the detail plugs in.",
  lose: "Rook shrugs and resets the fake clock. Study the misses and rematch.",
};

export const TRAINERS: readonly TrainerProfile[] = [SABLE_QUILL, ROOK_FERRIS];

/** Duel flag stored in `lessonsDone` (no save-schema change). */
export const duelFlag = (t: TrainerProfile): string => `duel:${t.id}`;

export function getTrainer(id: string | null | undefined): TrainerProfile | undefined {
  return TRAINERS.find((t) => t.id === id);
}

/** Duels are short: ~3 correct hits win, and the player has the usual health. */
export const DUEL_CONFIG: Readonly<BattleConfig> = { ...DEFAULT_CONFIG, foeHp: 36 };

/** The topic-filtered pool a duel draws from (the battle shuffles it and takes `cardCount`). */
export function trainerPool(t: TrainerProfile): Card[] {
  const topics = new Set(t.topics);
  return getDeck(t.deckId).cards.filter((c) => topics.has(c.topic));
}

/** Deterministic pick of the duel cards for a seed. */
export function trainerCards(t: TrainerProfile, seed: number): Card[] {
  const pool = trainerPool(t);
  // Small LCG-free deterministic rotation: stable, spreads topics, no extra PRNG dependency.
  const start = pool.length === 0 ? 0 : seed % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, t.cardCount);
}
