import type { MasterDeck } from "@/lib/battle/master";
import type { Card } from "@/lib/battle/cards";
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
  arrival: "Dockmaster Halyard shoulders the padlock!",
  // Phase 2: the player picks the concurrency build they want to prove (all five are judged packages).
  exercises: ["locked-stats", "ordered-transfer", "blocking-queue", "lazy-once", "task-queue"],
  intro: [
    "Every crate on this quay is safe if one person touches it at a time. The craft is knowing what a lock protects, how long to hold it, and who waits on whom.",
    "Answer for the concepts, then build one of my five drills until every test passes, then judge the habits I have collected. One of them is a tool already in the right place.",
  ],
  phaseLines: {
    workshop: "Pick a drill. Make it pass every test, and release every lock on every path while you do.",
    smell: "Last trial. Most of these will hang or corrupt under load; one is fine as it stands. Name the smell, and what the fix costs.",
  },
  win: ["You named the hazard and what the fix costs. Interviewers listen for the second half.", "Take the Docks Badge. Next come the Workshop Row problems: whole systems in ninety minutes."],
  lose: "Not yet. Re-run the cards you missed and come back; the tide waits for no one, but it does return.",
};

/**
 * Extra phase-1 questions, so the pool reaches fifteen without repeating the deck. Original wording; every
 * question has one defensible answer under the C++ memory model and the standard library contracts.
 */
const EXTRA: Card[] = [
  {
    id: "cdm-mcq-lock-scope", kind: "mcq", topic: "L7.mutex", level: 2,
    prompt: "A method locks a mutex, copies a shared vector, then sorts and formats the copy for 200 ms. What is the best change?",
    options: ["Copy under the lock, release it, then sort and format the copy", "Hold the lock for the whole method so the data cannot change", "Make the mutex recursive", "Sort the shared vector in place under the lock"],
    answer: [0],
    explain: "Keep critical sections to the shared-state access only. Slow work on a private copy runs in parallel with other threads. The trade-off is that the result is a snapshot, which is usually exactly what a report needs.",
  },
  {
    id: "cdm-mcq-lock-granularity", kind: "mcq", topic: "L7.mutex", level: 2,
    prompt: "A cache uses one mutex for all keys and shows heavy contention in a profile. Which change is the usual first step?",
    options: ["Shard the keys across several mutexes (for example by hash), after measuring that contention is real", "Replace the mutex with a spin loop on a plain bool", "Remove locking from reads", "Add more threads"],
    answer: [0],
    explain: "Lock striping reduces contention while keeping each critical section simple. The cost is that operations touching several keys (snapshots, rehash) must take several locks in a fixed order.",
  },
  {
    id: "cdm-mcq-notify-lost", kind: "mcq", topic: "L7.condvar", level: 2,
    prompt: "A producer sets a flag and calls notify_one() without taking the mutex, and the consumer sometimes sleeps forever. What is the likely cause?",
    options: ["The flag was changed outside the lock, so the consumer can check it, then the producer sets and notifies, and then the consumer waits and misses it (a lost wake-up)", "notify_one() only works on the main thread", "Condition variables expire after one second", "The consumer must use notify_all"],
    answer: [0],
    explain: "The state the predicate reads must be modified under the same mutex the waiter uses, otherwise the check and the wait are not atomic with respect to the change. The notify itself may be inside or outside the lock.",
  },
  {
    id: "cdm-mcq-notify-all", kind: "mcq", topic: "L7.condvar", level: 3,
    prompt: "A bounded queue uses one condition variable for both 'not full' and 'not empty' and calls notify_one. Which failure can occur?",
    options: ["A producer's notify may wake another producer, so the consumer that needed waking sleeps on (a lost wake-up). Use two condition variables or notify_all", "The queue deadlocks at compile time", "Wake-ups arrive in an undefined type", "No failure is possible with notify_one"],
    answer: [0],
    explain: "With mixed waiters, notify_one may pick one that cannot proceed and the wake-up is spent. Two condition variables (one per condition) is precise; notify_all is simple but wakes everyone to recheck.",
  },
  {
    id: "cdm-mcq-memory-order", kind: "mcq", topic: "L7.atomics", level: 3,
    prompt: "A writer fills a struct and then does ready.store(true, memory_order_release). A reader does ready.load(memory_order_acquire) and, on true, reads the struct. What is guaranteed?",
    options: ["The reader sees every write the writer made to the struct before the store", "Nothing; the reader may see stale struct fields", "Only that ready is true, with no ordering of other data", "The reader sees the writes only if both use memory_order_seq_cst"],
    answer: [0],
    explain: "A release store paired with an acquire load that reads it creates a happens-before edge. Writes before the store are visible after the load. seq_cst adds a single global order but is not needed for this one-way hand-off.",
  },
  {
    id: "cdm-mcq-deadlock-conditions", kind: "mcq", topic: "L7.deadlock", level: 2,
    prompt: "Which change removes the possibility of a deadlock between two threads that each need locks A and B?",
    options: ["Both threads acquire the locks in the same fixed order (or take both at once with scoped_lock)", "Give each thread a higher priority", "Use try_lock once and give up silently", "Add a sleep between the two lock calls"],
    answer: [0],
    explain: "A deadlock needs a cycle of waiting. A global order or an all-at-once acquisition breaks the cycle. Sleeping only changes the odds, and a silent give-up trades a deadlock for a lost update.",
  },
  {
    id: "cdm-mcq-pool-shutdown", kind: "mcq", topic: "L7.pool", level: 2,
    prompt: "What should a thread pool's destructor do so no task is lost and no worker leaks?",
    options: ["Set a stop flag under the lock, notify all workers, let them drain the queue, then join them", "Call detach on every worker", "Clear the task queue and exit immediately", "Let the operating system reclaim threads at process exit"],
    answer: [0],
    explain: "Clean shutdown is a protocol: signal under the lock, wake everyone, drain or discard by an explicit policy (state which), then join. Detached workers may touch destroyed members.",
  },
  {
    id: "cdm-mcq-future-exception", kind: "mcq", topic: "L7.pool", level: 3,
    prompt: "A pool task throws, and the caller holds the future returned by submit(). What should happen?",
    options: ["The exception is captured in the shared state (for example by std::packaged_task) and rethrown by future.get() on the caller's thread", "The worker thread terminates the program silently and the future waits forever", "The exception is ignored and get() returns a default value", "The pool must catch and log it, never reporting to the caller"],
    answer: [0],
    explain: "packaged_task and promise carry exceptions to the future. A worker that lets an exception escape would call terminate, and a swallowed error leaves the caller with a wrong result. Reporting the failure to the caller is the point of returning a future.",
  },
];

/** Phase 1 draws the level 2+ half of the deck plus the extra questions, leaving smell cards to phase 3's dedicated set. */
export function concurrencyDocksMasterDeck(): MasterDeck {
  const cards = [...CONCURRENCY_DOCKS_DECK.filter((c) => c.level >= 2 && c.kind !== "smell"), ...EXTRA];
  return { cards, smells: CONCURRENCY_DOCKS_MASTER_SMELLS };
}
