import type { MasterDeck } from "@/lib/battle/master";
import { BEHAVIOURAL_THEATRE_DECK } from "@/content/cards/behavioural-theatre";
import type { MasterProfile } from "./old-town";
import { BEHAVIOURAL_THEATRE_MASTER_SMELLS } from "./behavioural-theatre-smells";

export const BEHAVIOURAL_THEATRE_MASTER: MasterProfile = {
  id: "behavioural-theatre-master",
  name: "Director Voss",
  title: "Director of the Behavioural Theatre",
  district: "behavioural-theatre",
  badge: "behavioural-theatre",
  badgeName: "Theatre Badge",
  arrival: "Director Voss raises the baton!",
  // Phase 2: the player picks the pattern they want to prove (all eleven are judged packages).
  exercises: [
    "strategy-ranker",
    "observer-topic",
    "command-undo",
    "state-document",
    "template-report",
    "iterator-roster",
    "chain-approval",
    "mediator-lobby",
    "memento-editor",
    "visitor-basket",
    "interpreter-calc",
  ],
  intro: [
    "A play runs because nobody on stage needs to know who else is on stage. Behaviour patterns decide who reacts, who decides and how objects talk without knowing each other.",
    "Answer for the concepts, then rehearse one of my eleven patterns until every test passes, then judge the habits I have collected. Some of them are patterns nobody needed.",
  ],
  phaseLines: {
    workshop: "Pick a pattern. Make it pass every test, and keep the cue and the performer apart while you do.",
    smell: "Last trial. Some of these are bugs, one is a tool used in the wrong place. Name the smell, and name what the fix costs.",
  },
  win: ["You named the pattern and what it costs. Interviewers listen for the second half.", "Take the Theatre Badge. Next come the modelling boards: draw it before you build it."],
  lose: "Not yet. Re-run the cards you missed and come back; the house lights stay on.",
};

/** Phase 1 draws the level 2+ half of the deck, with smell cards left to phase 3's dedicated set. */
export function behaviouralTheatreMasterDeck(): MasterDeck {
  const cards = BEHAVIOURAL_THEATRE_DECK.filter((c) => c.level >= 2 && c.kind !== "smell");
  return { cards, smells: BEHAVIOURAL_THEATRE_MASTER_SMELLS };
}
