import { counterAtomic, counterLocked, counterRacy, handshake, transferDeadlock, transferOrdered } from "./samples";
import type { Program } from "./types";

/** A Race Hunter puzzle: break the buggy program by hand, then pick a fix that the explorer must prove. */
export interface Puzzle {
  id: string;
  title: string;
  brief: string;
  buggy: () => Program;
  fixes: { id: string; label: string; build: () => Program; why: string }[];
}

export const PUZZLES: Puzzle[] = [
  {
    id: "lost-update",
    title: "The lost update",
    brief: "Two threads each run `++counter`. Schedule them so the final value is 1, not 2.",
    buggy: counterRacy,
    fixes: [
      { id: "mutex", label: "Guard the read-modify-write with a std::mutex", build: counterLocked, why: "The critical section makes load, add and store indivisible with respect to the other thread." },
      { id: "atomic", label: "Make the counter a std::atomic<int>", build: counterAtomic, why: "fetch_add is one indivisible step, and it needs no lock for a single variable." },
      { id: "nothing", label: "Leave it: increments are tiny, collisions are rare", build: counterRacy, why: "Rare is not never. The explorer finds the interleaving in a handful of steps; it is also undefined behaviour in C++." },
    ],
  },
  {
    id: "abba",
    title: "Two accounts, two locks",
    brief: "One thread transfers A to B while another transfers B to A. Schedule them into a deadlock.",
    buggy: transferDeadlock,
    fixes: [
      { id: "ordered", label: "Always lock in the same global order (a before b)", build: transferOrdered, why: "With a total lock order there is no cycle in the wait-for graph, so no deadlock. std::scoped_lock does the same for you." },
      { id: "nothing", label: "Keep the locks as they are and add a retry on timeout", build: transferDeadlock, why: "A timeout hides the symptom but the cycle remains; under load it turns into livelock." },
    ],
  },
  {
    id: "lost-wakeup",
    title: "The missed signal",
    brief: "A consumer waits on a condition variable until the producer sets `ready`. Make the consumer sleep forever, or proceed too early.",
    buggy: () => handshake("unlocked-producer"),
    fixes: [
      { id: "while", label: "Producer sets the flag under the mutex; consumer waits in a `while (!ready)` loop", build: () => handshake("while-wait"), why: "The predicate loop survives spurious wake-ups and the mutex closes the gap between checking and sleeping." },
      { id: "if", label: "Producer locks too, but the consumer uses `if (!ready)`", build: () => handshake("if-wait"), why: "Better, yet a spurious wake-up lets the consumer run before ready is true. Always re-check the predicate in a loop." },
    ],
  },
];

export const PUZZLE_BY_ID: Record<string, Puzzle> = Object.fromEntries(PUZZLES.map((p) => [p.id, p]));
