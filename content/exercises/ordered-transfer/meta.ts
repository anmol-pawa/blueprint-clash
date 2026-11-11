import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "ordered-transfer",
  title: "Transfer between accounts without deadlock: lock ordering",
  concepts: ["deadlock", "lock ordering", "lock_guard", "scoped_lock", "non-recursive mutex", "critical section"],
  hints: [
    "Deadlock needs a cycle: A waits for B while B waits for A. If every thread takes the locks in the same order, no cycle can form. Pick an order that does not depend on which way the money flows.",
    "Compare the two ids. Name the account with the smaller id `first` and the other `second`, then lock `first` before `second`, whichever is `from` and whichever is `to`. Do the amount check *after* locking.",
    "Handle `amount <= 0` and `&from == &to` before locking anything (a non-recursive lock taken twice by the same thread deadlocks against itself). Use two `std::lock_guard<Lock>` so every return path unlocks both.",
  ],
  wrong: [
    { dir: "source_first", failingTests: ["Locking.LowerIdIsAlwaysLockedFirstWhenMovingDown", "Locking.OrderHoldsEvenWhenTheTransferFails"], reason: "Locks the source, then the destination. Works in single-threaded tests, but a concurrent opposite transfer locks them in the opposite order: the classic AB-BA deadlock." },
    { dir: "self_deadlock", failingTests: ["Transfer.SelfTransferIsRejectedWithoutLockingTwice"], reason: "Does not special-case from == to, so it locks the same non-recursive lock twice and blocks on itself forever." },
    { dir: "leaks_on_failure", failingTests: ["Locking.EveryPathReleasesBothLocks"], reason: "Unlocks by hand at the end, but the insufficient-funds path returns first and leaves both accounts locked: the next transfer hangs." },
    { dir: "locks_only_one", failingTests: ["Locking.BothLocksAreTakenOncePerTransfer"], reason: "Locks only the first account, so the destination's balance is updated without its lock: a data race with every other transfer touching that account (and no deadlock, which hides the bug)." },
  ],
};
