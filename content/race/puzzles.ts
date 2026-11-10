import { counterAtomic, counterLocked, counterRacy, transferDeadlock, transferOrdered } from "@/lib/concurrency";
import type { Program } from "@/lib/concurrency";

export interface RaceVariant {
  id: string;
  label: string;
  /** What this version changes, and its cost. */
  note: string;
  build: () => Program;
  /** Whether the explorer must prove it correct (tests pin this). */
  correct: boolean;
}

export interface RacePuzzle {
  id: string;
  title: string;
  brief: string;
  goal: string;
  variants: RaceVariant[];
}

export const RACE_PUZZLES: RacePuzzle[] = [
  {
    id: "lost-update",
    title: "The lost update",
    brief: "Two threads each run ++counter on a shared int. Every statement is split into load, add and store, because that is what the hardware does.",
    goal: "Interleave the threads so both read the same value (a lost update), or let the explorer find the shortest bad schedule.",
    variants: [
      { id: "racy", label: "Plain int", note: "No synchronisation: the read-modify-write can interleave.", build: counterRacy, correct: false },
      { id: "mutex", label: "std::mutex + lock_guard", note: "Correct and general, but every increment takes a lock; fine unless the counter is a hot path.", build: counterLocked, correct: true },
      { id: "atomic", label: "std::atomic<int>", note: "One indivisible add. Cheapest for a single counter, but it cannot protect an invariant across two variables.", build: counterAtomic, correct: true },
    ],
  },
  {
    id: "two-locks",
    title: "Opposite lock order",
    brief: "Two transfers lock account A then B, and B then A. Each holds one lock while waiting for the other.",
    goal: "Schedule the threads into a deadlock, then fix it with a global lock order.",
    variants: [
      { id: "abba", label: "Lock in argument order", note: "Each thread locks its source first: a cycle is possible.", build: transferDeadlock, correct: false },
      { id: "ordered", label: "Always lock A before B", note: "A fixed global order removes the cycle. In C++17 std::scoped_lock(a, b) does this for you.", build: transferOrdered, correct: true },
    ],
  },
];

export const RACE_PUZZLE_BY_ID: Record<string, RacePuzzle> = Object.fromEntries(RACE_PUZZLES.map((p) => [p.id, p]));
