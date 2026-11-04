import type { MasterDeck } from "@/lib/battle/master";
import { CREATIONAL_FOUNDRY_DECK } from "@/content/cards/creational-foundry";
import type { MasterProfile } from "./old-town";
import { CREATIONAL_FOUNDRY_MASTER_SMELLS } from "./creational-foundry-smells";

export const CREATIONAL_FOUNDRY_MASTER: MasterProfile = {
  id: "creational-foundry-master",
  name: "Foreman Corvo",
  title: "Foreman of the Creational Foundry",
  district: "creational-foundry",
  badge: "creational-foundry",
  badgeName: "Foundry Badge",
  arrival: "Foreman Corvo taps his wrench!",
  // Phase 2: the player picks the build they want to prove (all six are judged packages).
  exercises: ["factory-registry", "builder-request", "abstract-factory-family", "prototype-clone", "singleton-meyers", "pool-lease"],
  intro: [
    "Every creational pattern answers one question: who decides what gets built, and who has to know how? Get that wrong and every caller pays for it.",
    "Answer for the concepts, then build one of my six jobs to pass every test, then judge the shop-floor habits I have collected. Some of them are patterns nobody needed.",
  ],
  phaseLines: {
    workshop: "Pick a job. Make it pass every test, and keep ownership clear while you do.",
    smell: "Last trial. Some of these are bugs, one or two are fine. Name the smell, and name what the fix costs.",
  },
  win: ["You chose the tool and said what it costs. A candidate who does both is rarer than one who knows the diagram.", "Take the Foundry Badge. Structure is next: bridges, wrappers and the cost of every layer you add."],
  lose: "Not yet. Re-run the cards you missed and come back; the shop floor stays open.",
};

/** Phase 1 draws the level 2+ half of the deck, with smell cards left to phase 3's dedicated set. */
export function creationalFoundryMasterDeck(): MasterDeck {
  const cards = CREATIONAL_FOUNDRY_DECK.filter((c) => c.level >= 2 && c.kind !== "smell");
  return { cards, smells: CREATIONAL_FOUNDRY_MASTER_SMELLS };
}
