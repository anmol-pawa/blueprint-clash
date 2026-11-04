import type { MasterDeck } from "@/lib/battle/master";
import { SOLID_SQUARE_DECK } from "@/content/cards/solid-square";
import type { MasterProfile } from "./old-town";
import { SOLID_SQUARE_MASTER_SMELLS } from "./solid-square-smells";

export const SOLID_SQUARE_MASTER: MasterProfile = {
  id: "solid-square-master",
  name: "Provost Isolde Marlow",
  title: "Provost of the Principle Hall",
  district: "solid-square",
  badge: "solid-square",
  badgeName: "Hall Badge",
  arrival: "Provost Marlow raises her staff!",
  // Phase 2: the player picks the refactor they want to prove (all eight are judged packages).
  exercises: ["srp-invoice", "ocp-shipping", "lsp-account", "isp-machine", "dip-notifier", "dip-clock", "demeter-wallet", "composition-history"],
  intro: [
    "Five gems on my staff, one for each principle. A candidate who can recite them is common. One who can say what each costs is not.",
    "Answer for the concepts, then refactor a real tangle of your choice, then face what I have been collecting: bad habits that pass as good ones.",
  ],
  phaseLines: {
    workshop: "Choose your tangle. Make it pass every test, and keep the design honest while you do.",
    smell: "Last trial. These all compile, and several are fine by the book. Judge them, and name the cost.",
  },
  win: ["You named the principle and its price in one breath. That is the signal I look for.", "Take the Hall Badge. Patterns are the next district; use your principles to decide when one is earned."],
  lose: "Not yet. Re-read the lesson you missed and come back; the Hall keeps its doors open.",
};

/** Phase 1 draws the level 2+ half of the deck, with smell cards left to phase 3's dedicated set. */
export function solidSquareMasterDeck(): MasterDeck {
  const cards = SOLID_SQUARE_DECK.filter((c) => c.level >= 2 && c.kind !== "smell");
  return { cards, smells: SOLID_SQUARE_MASTER_SMELLS };
}
