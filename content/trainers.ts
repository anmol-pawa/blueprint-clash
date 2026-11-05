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

export const DOVA_KILN: TrainerProfile = {
  id: "dova-kiln",
  name: "Dova Kiln",
  deckId: "creational-foundry",
  topics: ["L3.factory-method", "L3.abstract-factory", "L3.builder"],
  cardCount: 6,
  foeName: "DOVA'S MOLD",
  intro: "Dova Kiln has a line that must make three kinds of widget and a manager who will add a fourth next month.",
  win: "Dova hangs up her gloves. Callers ask for a thing, one place decides which: well cast.",
  lose: "Dova scrapes the mould clean. Re-read the explanations, then pour again.",
};

export const BRAM_CASK: TrainerProfile = {
  id: "bram-cask",
  name: "Bram Cask",
  deckId: "creational-foundry",
  topics: ["L3.prototype", "L3.singleton", "L3.object-pool", "L3.di"],
  cardCount: 6,
  foeName: "BRAM'S CASK",
  intro: "Bram Cask counts buffers out of a barrel and wants to know who owns what, and how many there should be.",
  win: "Bram taps the barrel twice. One owner, one lifetime, injected: nicely done.",
  lose: "Bram rolls the barrel back to you. Study the misses and rematch.",
};

export const NERYS_QUAY: TrainerProfile = {
  id: "nerys-quay",
  name: "Nerys Quay",
  deckId: "structural-bridges",
  topics: ["L4.adapter", "L4.facade", "L4.proxy"],
  cardCount: 6,
  foeName: "NERYS'S GATE",
  intro: "Nerys Quay runs the harbour gate: every ship speaks a different dialect and only some are allowed in.",
  win: "Nerys stamps your pass. Translate at the edge, hide the tangle, guard behind the same face: well done.",
  lose: "Nerys keeps the gate shut. Read the explanations, then come back to the quay.",
};

export const TOBIN_REEF: TrainerProfile = {
  id: "tobin-reef",
  name: "Tobin Reef",
  deckId: "structural-bridges",
  topics: ["L4.composite", "L4.decorator", "L4.bridge", "L4.flyweight"],
  cardCount: 6,
  foeName: "TOBIN'S REEF",
  intro: "Tobin Reef stacks crates, wraps cargo and counts how many identical labels the harbour really needs.",
  win: "Tobin tips his cap. Trees of parts, layers by choice, two axes apart, shared state shared: good.",
  lose: "Tobin points at the tide table. Study the misses and rematch.",
};

export const TRAINERS: readonly TrainerProfile[] = [SABLE_QUILL, ROOK_FERRIS, DOVA_KILN, BRAM_CASK, NERYS_QUAY, TOBIN_REEF];

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
