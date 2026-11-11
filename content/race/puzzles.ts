import { counterAtomic, counterLocked, counterRacy, transferDeadlock, transferOrdered } from "@/lib/concurrency";
import type { Program } from "@/lib/concurrency";
import { handshake } from "@/lib/concurrency";
import { claimLockGuard, claimManualUnlock, lazyAtomicFlag, lazyPlainFlag, withdrawAtomicSteps, withdrawCas, withdrawLocked } from "./programs";

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
    id: "check-then-act",
    title: "Check, then act",
    brief: "Two ATMs each withdraw 80 from a balance of 100. Every single read and write of the balance is atomic, so there is no data race, and the account can still go negative.",
    goal: "Find the schedule where both ATMs pass the balance check. This is a race condition, not a data race: the bug is the gap between the check and the update.",
    variants: [
      { id: "atomic-steps", label: "Atomic load, then atomic subtract", note: "Each access is safe; the pair is not. Atomics protect one variable access, never a decision built on it.", build: withdrawAtomicSteps, correct: false },
      { id: "mutex", label: "One critical section for check and update", note: "The simplest correct design: hold the lock across the whole decision. The cost is that every withdrawal serialises on one mutex.", build: withdrawLocked, correct: true },
      { id: "cas", label: "Compare-and-swap retry loop", note: "Lock-free and correct for one word; a failed swap re-reads and retries. It does not scale to invariants that span two accounts.", build: withdrawCas, correct: true },
    ],
  },
  {
    id: "forgotten-unlock",
    title: "The early return",
    brief: "claim() takes a job under a mutex and returns false early if somebody already claimed it. The unlock is written by hand at the end.",
    goal: "Run both workers and watch the second one leave the function still holding the mutex, then replace the hand-written unlock with RAII.",
    variants: [
      { id: "manual", label: "m.lock() / m.unlock()", note: "Every new return, break or exception is a new chance to forget the unlock.", build: claimManualUnlock, correct: false },
      { id: "guard", label: "std::lock_guard", note: "The destructor unlocks on every path, including exceptions. Prefer it unless you need to unlock early, then use unique_lock.", build: claimLockGuard, correct: true },
    ],
  },
  {
    id: "missed-wakeup",
    title: "The missed wake-up",
    brief: "A consumer waits on a condition variable until a producer sets ready. The producer and the consumer disagree about who holds the mutex, and whether the wait re-checks.",
    goal: "Find the schedule where the notify fires before the consumer waits, and the one where a spurious wake-up lets an if-wait through.",
    variants: [
      { id: "unlocked-producer", label: "Producer sets ready without the lock", note: "The flag can change between the consumer's check and its wait, so the notify is lost and the consumer sleeps forever.", build: () => handshake("unlocked-producer"), correct: false },
      { id: "if-wait", label: "wait inside an if", note: "A spurious wake-up, or a different consumer winning the item, returns from wait with the predicate still false.", build: () => handshake("if-wait"), correct: false },
      { id: "while-wait", label: "wait inside a while (or wait with a predicate)", note: "Re-checking the predicate under the lock handles lost notifies and spurious wake-ups. This is the default shape.", build: () => handshake("while-wait"), correct: true },
    ],
  },
  {
    id: "double-checked",
    title: "Double-checked locking",
    brief: "Two requests lazily load a config once. The first check skips the lock when it is already loaded, to keep the hot path cheap.",
    goal: "Find the unsynchronised read of the flag, then publish it with an atomic. The explorer models sequentially consistent steps only; real hardware can also reorder.",
    variants: [
      { id: "plain-flag", label: "Plain bool for the first check", note: "A plain read racing with the initialiser's write is undefined behaviour, even if it usually works on x86.", build: lazyPlainFlag, correct: false },
      { id: "atomic-flag", label: "std::atomic<bool> published after the write", note: "Correct. In C++11 and later, a function-local static (the Meyers singleton) gives the same guarantee with less code.", build: lazyAtomicFlag, correct: true },
    ],
  },
];

export const RACE_PUZZLE_BY_ID: Record<string, RacePuzzle> = Object.fromEntries(RACE_PUZZLES.map((p) => [p.id, p]));
