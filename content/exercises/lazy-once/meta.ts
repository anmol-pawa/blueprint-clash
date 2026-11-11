import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "lazy-once",
  title: "Lazy initialisation under contention: double-checked locking",
  concepts: ["double-checked locking", "std::atomic", "acquire/release", "lazy initialisation", "retry on failure", "lock_guard"],
  hints: [
    "Two checks, one lock. First check an atomic flag with no lock (the fast path). Only if it is not set, take the lock and check again, because someone else may have finished while you waited.",
    "Inside the lock: if the flag is still false, call `loader_.load(loaded)`. If it returns false, return false and leave the flag alone (so the next caller retries). Otherwise store the value and *then* set the flag.",
    "The order of the last two steps is the point: `value_ = loaded;` and then `ready_.store(true, std::memory_order_release);`. A reader that sees `ready_` true with `memory_order_acquire` is then guaranteed to see `value_`. Use `std::lock_guard<Lock>` so the early `return false` unlocks.",
  ],
  wrong: [
    { dir: "no_recheck", failingTests: ["Once.TheLoserOfTheRaceDoesNotLoadAgain"], reason: "Checks the flag only before taking the lock. A thread that waited on the lock loads a second time (twice the cost, and two different values if the source changed)." },
    { dir: "always_locks", failingTests: ["Locking.WarmReadsDoNotTakeTheLock"], reason: "Correct but slow: every read, even after initialisation, serialises on the lock. Fine for rare calls, a bottleneck on a hot path." },
    { dir: "flag_before_load", failingTests: ["Once.AFailedLoadIsNotCached"], reason: "Publishes the flag before the load finishes. When the load fails, later callers see the flag set and get a default value instead of retrying." },
    { dir: "manual_unlock", failingTests: ["Locking.AFailedLoadReleasesTheLock"], reason: "Unlocks by hand at the end but returns early when the load fails, leaving the lock held: the next caller blocks forever." },
  ],
};
