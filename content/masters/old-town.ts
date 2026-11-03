import type { MasterDeck } from "@/lib/battle/master";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { OLD_TOWN_MASTER_SMELLS } from "./old-town-smells";

export interface MasterProfile {
  id: string;
  name: string;
  title: string;
  district: string;
  /** Badge id written to the save on victory. */
  badge: string;
  /** Exercise (content/exercises) used as the phase-2 mini Workshop. */
  exercise: string;
  intro: string[];
  phaseLines: { workshop: string; smell: string };
  win: string[];
  lose: string;
}

export const OLD_TOWN_MASTER: MasterProfile = {
  id: "old-town-master",
  name: "Warden Hollis Vane",
  title: "Keeper of the Old Town Gate",
  district: "old-town",
  badge: "old-town",
  exercise: "file-handle",
  intro: [
    "Everything in this district stands because somebody decided who owns what.",
    "Show me you can say it in a class, build it, and smell it when it is wrong.",
  ],
  phaseLines: {
    workshop: "Good. Now build one: a type that cleans up after itself, on every path.",
    smell: "Last test. My creature feeds on bad habits. Name each one before it bites.",
  },
  win: ["Ownership, invariants, clean polymorphism. That is the Old Town creed.", "Take the Gate Badge. The Foundry will want those habits."],
  lose: "Not yet. Re-read what you missed and come back; the Gate does not move.",
};

/** The cards phase draws the level 2+ half of the deck plus the capstone basics; smell phase uses dedicated cards. */
export function oldTownMasterDeck(): MasterDeck {
  const cards = OLD_TOWN_DECK.filter((c) => c.level >= 2 && c.kind !== "smell");
  return { cards, smells: OLD_TOWN_MASTER_SMELLS };
}
