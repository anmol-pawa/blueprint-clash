import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "blocking-queue",
  title: "Bounded blocking queue: wait in a loop, notify the right side",
  concepts: ["condition variable", "predicate loop", "spurious wake-up", "producer-consumer", "ring buffer", "lock_guard"],
  hints: [
    "The queue needs a lock for every method and two waiting rooms: producers wait for space, consumers wait for items. Which condition does `push` sleep on? Which one does it wake after storing?",
    "Take `std::lock_guard<Lock> guard(lock_);`, then `while (count_ == capacity) notFull_.wait(lock_);`. The loop matters: after a wake-up the queue may be full again, and a spurious wake-up changes nothing.",
    "Store in a ring buffer: `slots_[(head_ + count_) % size] = v; ++count_;` and read `slots_[head_]`, then `head_ = (head_ + 1) % size; --count_;`. End `push` with `notEmpty_.notifyOne()` and `pop` with `notFull_.notifyOne()`.",
  ],
  wrong: [
    { dir: "if_instead_of_while", failingTests: ["Blocking.PopWaitsUntilAnItemArrives", "Blocking.PushWaitsUntilSpaceAppears"], reason: "Waits once with `if`. After a spurious wake-up it reads from an empty queue (or overwrites a full one): the predicate must be re-checked in a loop." },
    { dir: "forgets_notify", failingTests: ["Signalling.PushWakesAConsumerAndPopWakesAProducer"], reason: "Never notifies after changing the queue, so a sleeping consumer or producer is never woken: in production a lost wake-up and a hang." },
    { dir: "swapped_conditions", failingTests: ["Blocking.PopWaitsUntilAnItemArrives", "Blocking.PushWaitsUntilSpaceAppears"], reason: "Producers wait on `notEmpty` and consumers on `notFull`, the reverse of what each is woken for. Works only while the other side happens to notify the same condition by accident." },
    { dir: "no_lock", failingTests: ["Locking.PushAndPopTakeTheLock", "Locking.WaitingHoldsTheLockAndReleasesItAfter"], reason: "Skips the lock, so the ring-buffer indices race with the other thread, and `wait` is called without owning the lock (undefined behaviour with a real condition variable)." },
  ],
};
