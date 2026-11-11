import { claimSlot, counterAtomic, counterLocked, counterRacy, handshake, lazyInit, transferDeadlock, transferOrdered, twoVariableInvariant } from "@/lib/concurrency";
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
  {
    id: "lazy-init",
    title: "Check, then act",
    brief: "Two threads call getResource(). Each checks a flag, and if it is unset creates the resource and sets it. Creation is expensive and must happen exactly once.",
    goal: "Find the schedule in which both threads see the flag unset. The check and the action are separate steps, so nothing stops this.",
    variants: [
      { id: "racy", label: "if (!inited) create()", note: "The gap between the check and the set lets both threads in.", build: () => lazyInit(false), correct: false },
      { id: "mutex", label: "Hold a mutex over check and act", note: "Correct. In real C++ prefer std::call_once or a function-local static (thread-safe since C++11); they say the intent and cannot be misused.", build: () => lazyInit(true), correct: true },
    ],
  },
  {
    id: "two-variables",
    title: "An invariant across two variables",
    brief: "A mover shifts 10 from account a to account b (total 100). An auditor reads both. Each balance is std::atomic<int>.",
    goal: "Make the auditor see a total other than 100, although every single access is atomic.",
    variants: [
      { id: "atomics", label: "Two atomics", note: "Each access is safe, the pair is not. Atomics protect one variable, not a relationship between variables.", build: () => twoVariableInvariant("atomics"), correct: false },
      { id: "mutex", label: "One mutex guards both", note: "The invariant lives under one lock, so the auditor never sees the middle. Cost: readers now contend with writers.", build: () => twoVariableInvariant("mutex"), correct: true },
    ],
  },
  {
    id: "claim-slot",
    title: "Claiming a slot",
    brief: "Two threads try to become the owner of a free slot. Only one may win. The owner field is atomic.",
    goal: "Get both threads to believe they won, even though load and store are each atomic.",
    variants: [
      { id: "check-then-set", label: "load, then store", note: "Two atomic operations are not one atomic operation: both can load 0.", build: () => claimSlot("check-then-set"), correct: false },
      { id: "cas", label: "compare_exchange_strong(0, id)", note: "Check and set are one indivisible step; exactly one thread sees it succeed. Beware ABA when the value can return to a previous state.", build: () => claimSlot("cas"), correct: true },
    ],
  },
  {
    id: "wait-handshake",
    title: "Waiting for a signal",
    brief: "A consumer waits on a condition variable until a producer sets ready. Spurious wake-ups are allowed by the standard.",
    goal: "Break each version: publish without the lock (lost wake-up), wake spuriously past an if, and then see why while (!ready) is the only safe form.",
    variants: [
      { id: "unlocked", label: "Producer sets ready without the mutex", note: "The consumer can check, then the producer sets and notifies before the consumer sleeps: the notify is lost for good.", build: () => handshake("unlocked-producer"), correct: false },
      { id: "if", label: "if (!ready) cv.wait(lk)", note: "A spurious wake-up passes the if with ready still false.", build: () => handshake("if-wait"), correct: false },
      { id: "while", label: "while (!ready) cv.wait(lk)", note: "Re-check after every wake-up; or use the predicate overload cv.wait(lk, pred).", build: () => handshake("while-wait"), correct: true },
    ],
  },
];

export const RACE_PUZZLE_BY_ID: Record<string, RacePuzzle> = Object.fromEntries(RACE_PUZZLES.map((p) => [p.id, p]));
