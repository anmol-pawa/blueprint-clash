import {
  abaStack,
  boundedQueue,
  claimSlot,
  counterAtomic,
  counterLocked,
  counterRacy,
  doubleCheckedLocking,
  flagPublication,
  handshake,
  lazyInit,
  pairReadWrite,
  politeLocking,
  transferDeadlock,
  transferOrdered,
  twoVariableInvariant,
} from "@/lib/concurrency";
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
  {
    id: "aba-stack",
    title: "The ABA problem",
    brief: "A lock-free stack holds A, B, C. The Popper reads top = A and A's next = B, then pauses. The Recycler pops A, pops B and frees it, then pushes A back. top is A again.",
    goal: "Make the Popper's compare-and-swap succeed against a stack that has changed underneath it, so top points at freed memory.",
    variants: [
      { id: "bare", label: "CAS on a bare pointer", note: "CAS only asks 'is top still A?'. It cannot tell that A left and came back. Result: B, already freed, becomes the new top.", build: () => abaStack(false), correct: false },
      { id: "tagged", label: "Pointer plus version counter", note: "Pack a counter into the head word (a 128-bit CAS or spare pointer bits). Re-pushing A bumps the counter, so the stale CAS fails. Other cures: hazard pointers or epoch reclamation (never free a node someone may still read), or a garbage-collected language.", build: () => abaStack(true), correct: true },
    ],
  },
  {
    id: "bounded-queue",
    title: "A bounded buffer",
    brief: "A buffer holds at most one item. One producer pushes two items; two consumers pop one each. All state is under one mutex, with while-loops around every wait.",
    goal: "Share one condition variable between 'not full' and 'not empty' and use notify_one: find the schedule where a wake-up goes to the wrong kind of waiter and everyone sleeps. (Spurious wake-ups are switched off here so the stuck state is visible; real code must still use while.)",
    variants: [
      { id: "one-cv-notify-one", label: "One cv, notify_one", note: "notify_one wakes whoever has waited longest, maybe another consumer who finds the buffer empty and sleeps again, while the producer who needed the signal sleeps on.", build: () => boundedQueue("one-cv-notify-one"), correct: false },
      { id: "one-cv-notify-all", label: "One cv, notify_all", note: "Correct: everyone wakes, re-checks, and the right thread proceeds. Cost: a thundering herd on every operation.", build: () => boundedQueue("one-cv-notify-all"), correct: true },
      { id: "two-cvs", label: "notFull and notEmpty", note: "One condition variable per predicate lets notify_one reach a thread that can actually use it. The standard design; the mutex is still shared.", build: () => boundedQueue("two-cvs"), correct: true },
    ],
  },
  {
    id: "reader-writer",
    title: "Readers need the lock too",
    brief: "A writer changes a pair (a, b) from (0, 0) to (1, 1). A reader copies both. The invariant is a == b.",
    goal: "Catch the reader between the two writes. First without any lock on the reader, then with locks that are too small.",
    variants: [
      { id: "reader-skips-lock", label: "Writer locks, reader does not", note: "'It only reads' is not an exemption: a read racing with a write is a data race (undefined behaviour), and can see a torn pair.", build: () => pairReadWrite("reader-skips-lock"), correct: false },
      { id: "split-sections", label: "Lock each assignment separately", note: "No data race, yet the pair is torn: the lock must cover the whole invariant, not each variable.", build: () => pairReadWrite("split-sections"), correct: false },
      { id: "one-section", label: "One critical section for the pair", note: "Correct. If reads dominate and are long, std::shared_mutex lets readers overlap (not modelled here; writers then wait for readers, so writer starvation is the cost to watch).", build: () => pairReadWrite("one-section"), correct: true },
    ],
  },
  {
    id: "double-checked-locking",
    title: "Double-checked locking",
    brief: "Two threads call getInstance(). The fast path checks the pointer without the lock; only a null pointer takes the lock, checks again and constructs.",
    goal: "Break it twice: first the plain pointer (a data race), then a relaxed atomic whose pointer store can become visible before the fields it points to.",
    variants: [
      { id: "plain-pointer", label: "Plain pointer", note: "The unlocked first read races with the write under the lock. In C++ that is undefined behaviour even if the machine seems to behave.", build: () => doubleCheckedLocking("plain-pointer"), correct: false },
      { id: "relaxed-reordered", label: "atomic pointer, relaxed", note: "The engine is sequentially consistent, so this version is written in the order a relaxed store is allowed to become visible: pointer first, fields second. A reader that sees the pointer then uses half-built state.", build: () => doubleCheckedLocking("relaxed-reordered"), correct: false },
      { id: "release-acquire", label: "release store, acquire load", note: "The release store publishes everything written before it; the acquire load sees all of it. Proved here for sequentially consistent runs. Prefer a function-local static or std::call_once and skip the pattern.", build: () => doubleCheckedLocking("release-acquire"), correct: true },
    ],
  },
  {
    id: "flag-publication",
    title: "Publishing data with a flag",
    brief: "A producer writes data = 42 and then raises ready. A consumer spins until ready, then reads data.",
    goal: "Make the consumer read data before it was written, or find the data race in the plain bool.",
    variants: [
      { id: "plain-flag", label: "Plain bool ready", note: "Two unsynchronised accesses to ready, one a write: a data race. The compiler may also hoist the load out of the spin loop and hang forever.", build: () => flagPublication("plain-flag"), correct: false },
      { id: "relaxed-reordered", label: "atomic<bool>, relaxed", note: "Atomicity alone gives no ordering. Shown in the order a relaxed store may become visible: flag first, data later.", build: () => flagPublication("relaxed-reordered"), correct: false },
      { id: "release-acquire", label: "release store, acquire load", note: "Everything the producer wrote before the release store is visible after the acquire load sees the flag. The default seq_cst also works and costs a little more on some CPUs.", build: () => flagPublication("release-acquire"), correct: true },
    ],
  },
  {
    id: "polite-livelock",
    title: "Too polite to finish",
    brief: "Two workers each need both locks. To avoid deadlock, each takes one lock, try_locks the other, and if that fails releases what it holds and retries immediately.",
    goal: "Find the cycle in which both keep running, never deadlock, and never finish. The explorer reports a livelock only when every unfinished thread takes steps in the cycle.",
    variants: [
      { id: "retry-immediately", label: "try_lock, back off, retry at once", note: "Symmetric politeness can repeat forever in lockstep. A random back-off makes the loop unlikely in practice but not impossible, so the explorer cannot prove it away.", build: () => politeLocking("retry-immediately"), correct: false },
      { id: "global-order", label: "Both lock a then b", note: "A global lock order removes the cycle and the need to retry; std::scoped_lock(a, b) does this for you.", build: () => politeLocking("global-order"), correct: true },
      { id: "one-side-insists", label: "One side blocks, one yields", note: "Breaking the symmetry also works: the insisting worker waits for the lock, the polite one backs off. Cost: the polite worker can be starved under constant contention.", build: () => politeLocking("one-side-insists"), correct: true },
    ],
  },
];

export const RACE_PUZZLE_BY_ID: Record<string, RacePuzzle> = Object.fromEntries(RACE_PUZZLES.map((p) => [p.id, p]));
