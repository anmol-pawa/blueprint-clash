import type { MasterDeck } from "@/lib/battle/master";
import { CONCURRENCY_DOCKS_DECK } from "@/content/cards/concurrency-docks";
import type { MasterProfile } from "./old-town";
import { CONCURRENCY_DOCKS_MASTER_SMELLS } from "./concurrency-docks-smells";

export const CONCURRENCY_DOCKS_MASTER: MasterProfile = {
  id: "concurrency-docks-master",
  name: "Dockmaster Halyard",
  title: "Dockmaster of the Concurrency Docks",
  district: "concurrency-docks",
  badge: "concurrency-docks",
  badgeName: "Docks Badge",
  arrival: "Dockmaster Halyard snaps the padlock!",
  // Phase 2: the player picks the concurrency problem they want to prove (all five are judged packages).
  exercises: ["locked-stats", "ordered-transfer", "blocking-queue", "lazy-once", "task-queue"],
  intro: [
    "Every crate on this quay is safe if only one hand touches it at a time. The craft is knowing which crate, which hand and for how long.",
    "Answer for the concepts, then secure one of my five berths until every test passes, then judge the habits I have seen on the dock. Not every lock is a good lock.",
  ],
  phaseLines: {
    workshop: "Pick a berth. Make it pass every test: lock what the invariant needs, release on every path and never wait on a guess.",
    smell: "Last trial. Some of these are bugs, one is a lock nobody needs. Name the smell, and name what the fix costs.",
  },
  win: ["You named the hazard and what the guard costs. Interviewers listen for the second half.", "Take the Docks Badge. Next the Senior Review gets stricter, and then the Workshop Row opens."],
  lose: "Not yet. Re-run the cards you missed and come back; the tide waits for no one, but the quay does.",
};

/** Phase 1 draws the whole 12-card deck (too small to split by level), leaving smell cards to phase 3. */
export function concurrencyDocksMasterDeck(): MasterDeck {
  const cards = CONCURRENCY_DOCKS_DECK.filter((c) => c.kind !== "smell");
  return { cards, smells: CONCURRENCY_DOCKS_MASTER_SMELLS };
}
