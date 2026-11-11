import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "task-queue",
  title: "Worker queue with clean shutdown: run outside the lock, drain, wake everyone",
  concepts: ["thread pool", "condition variable", "graceful shutdown", "drain", "notify_all", "never call user code under a lock"],
  hints: [
    "Two flags decide when a worker may stop: the queue is empty AND shutdown was requested. A worker sleeps while the queue is empty and shutdown has not been requested.",
    "In `runWorker`: loop forever; inside a braced scope take `std::lock_guard<Lock>`, `while (tasks_.empty() && !stopping_) wakeup_.wait(lock_);`, return if `tasks_.empty()`, otherwise move the front task into a local and pop. After the closing brace the lock is released: call the task there.",
    "`submit`: lock, return false if `stopping_`, push, `wakeup_.notifyOne()`, return true. `shutdown`: lock, set `stopping_ = true`, then `wakeup_.notifyAll()` so every sleeping worker re-checks and exits.",
  ],
  wrong: [
    { dir: "runs_under_lock", failingTests: ["Locking.TasksRunWithoutTheLockHeld", "Locking.ATaskMayEnqueueFollowUpWork"], reason: "Calls the task while still holding the queue lock. A task that calls `submit` locks the same non-recursive lock twice (deadlock), and every other worker stalls for the task's whole duration." },
    { dir: "notify_one_on_shutdown", failingTests: ["Shutdown.WakesEveryWorker"], reason: "Wakes one sleeping worker on shutdown. With four workers, three sleep forever and the process never exits cleanly." },
    { dir: "drops_pending", failingTests: ["Shutdown.DrainsQueuedTasksBeforeExiting"], reason: "Exits as soon as the shutdown flag is set, abandoning tasks that were already accepted: silently lost work." },
    { dir: "accepts_after_shutdown", failingTests: ["Shutdown.SubmitAfterShutdownIsRejected"], reason: "Keeps queueing after shutdown. Nobody is left to run those tasks, so the caller is told `true` for work that never happens." },
  ],
};
