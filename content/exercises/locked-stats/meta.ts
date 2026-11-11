import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "locked-stats",
  title: "Guarded statistics: RAII locking you can test without threads",
  concepts: ["mutex", "lock_guard", "RAII", "critical section", "atomic batch", "testing concurrency via a seam"],
  hints: [
    "Three numbers must change together, so the lock must cover all three. Which methods read them? Which write them? All of them need the lock.",
    "Declare a `std::lock_guard<Lock> guard(lock_);` at the top of the critical section. Its destructor unlocks on every path, including an early `return`, so you never write `unlock()` yourself.",
    "`recordAll` takes the lock once, then loops calling a private helper that assumes the lock is already held (calling the public `record` would try to lock again). Reject negatives in `record` before locking, or inside the guarded scope, but never between a manual `lock()` and `unlock()`.",
  ],
  wrong: [
    { dir: "unlocked_read", failingTests: ["Locking.SnapshotTakesTheLockToo"], reason: "Locks writers but reads without the lock, so a reader can see a new count with an old sum (a torn read). Reads need the same lock as writes." },
    { dir: "manual_unlock_leak", failingTests: ["Locking.RejectedRecordStillReleasesTheLock"], reason: "Calls lock() and unlock() by hand and returns early between them: the first invalid value leaves the lock held forever and the next caller deadlocks. RAII exists to make this impossible." },
    { dir: "lock_per_element", failingTests: ["Locking.BatchIsOneCriticalSection"], reason: "Locks once per element, so another thread can observe half the batch (and the loop pays N lock round-trips). A batch that must be atomic needs one critical section around all of it." },
    { dir: "unlocked_reset", failingTests: ["Locking.ResetTakesTheLock"], reason: "reset() forgets the lock; a concurrent record() can interleave with the reset and leave count, sum and max inconsistent." },
  ],
};
