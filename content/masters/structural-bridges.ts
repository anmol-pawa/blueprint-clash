import type { MasterDeck } from "@/lib/battle/master";
import { STRUCTURAL_BRIDGES_DECK } from "@/content/cards/structural-bridges";
import type { MasterProfile } from "./old-town";
import { STRUCTURAL_BRIDGES_MASTER_SMELLS } from "./structural-bridges-smells";

export const STRUCTURAL_BRIDGES_MASTER: MasterProfile = {
  id: "structural-bridges-master",
  name: "Harbourmaster Vale",
  title: "Harbourmaster of the Structural Bridges",
  district: "structural-bridges",
  badge: "structural-bridges",
  badgeName: "Bridges Badge",
  arrival: "Harbourmaster Vale raises her lantern!",
  // Phase 2: the player picks the structure they want to prove (all seven are judged packages).
  exercises: ["adapter-payments", "bridge-renderer", "composite-fs", "decorator-stream", "facade-checkout", "flyweight-glyphs", "proxy-cache"],
  intro: [
    "Every structure on this quay joins two things that were never designed together. The skill is choosing the joint, and knowing what each layer costs you.",
    "Answer for the concepts, then build one of my seven structures until every test passes, then judge the habits I have collected. Some of them are layers nobody needed.",
  ],
  phaseLines: {
    workshop: "Pick a structure. Make it pass every test, and keep the ownership clear while you do.",
    smell: "Last trial. Some of these are bugs, one is fine as it stands. Name the smell, and name what the fix costs.",
  },
  win: ["You named the joint and the price of the joint. Interviewers listen for the second half.", "Take the Bridges Badge. Behaviour is next: who reacts, who decides, and how objects talk."],
  lose: "Not yet. Re-run the cards you missed and come back; the quay stays open.",
};

/** Phase 1 draws the level 2+ half of the deck, with smell cards left to phase 3's dedicated set. */
export function structuralBridgesMasterDeck(): MasterDeck {
  const cards = STRUCTURAL_BRIDGES_DECK.filter((c) => c.level >= 2 && c.kind !== "smell");
  return { cards, smells: STRUCTURAL_BRIDGES_MASTER_SMELLS };
}
