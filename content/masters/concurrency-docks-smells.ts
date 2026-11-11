import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for Dockmaster Halyard's last phase. Each shows a short C++ fragment and asks for the smell, the cost,
 * or the right call. Original wording; the wrong options are the tempting neighbours, and one card tests
 * restraint (a mutex that is already the right tool) rather than a violation.
 */
export const CONCURRENCY_DOCKS_MASTER_SMELLS: Card[] = [
  {
    id: "cdm-smell-manual-unlock",
    kind: "smell",
    topic: "L7.mutex",
    level: 1,
    prompt: "The service hangs after the first rejected request. What is wrong?",
    code: `bool Ledger::add(int cents) {
  mu_.lock();
  if (cents <= 0) return false;      // rejected
  total_ += cents;
  mu_.unlock();
  return true;
}`,
    options: [
      "The early return skips unlock(), so the mutex stays held and the next caller blocks forever. Use std::lock_guard so every exit path releases it",
      "total_ must be volatile so the other threads see the update",
      "Mutexes may only be locked once per process",
      "Return a value from unlock() so the caller can check it",
    ],
    answer: [0],
    explain:
      "Manual lock/unlock pairs break on any early return or exception. RAII ties release to scope exit. The cost of the fix is nil; the cost of the bug is a hang that only shows up on the error path, which is the path nobody tested.",
  },
  {
    id: "cdm-smell-lock-order",
    kind: "smell",
    topic: "L7.deadlock",
    level: 2,
    prompt: "Under load, two requests occasionally freeze forever. Name the smell and the move.",
    code: `void Bank::pay(Account& from, Account& to, int c) {
  std::lock_guard<std::mutex> a(from.mu);
  std::lock_guard<std::mutex> b(to.mu);
  from.balance -= c; to.balance += c;
}
// Thread 1: pay(x, y, 5)    Thread 2: pay(y, x, 7)`,
    options: [
      "Inconsistent lock order: each thread holds one lock and waits for the other. Take both together with std::scoped_lock (or always lock in a fixed global order such as by account id)",
      "The lock_guards should be released early to shorten the critical section",
      "Use a recursive_mutex for each account",
      "Make balance a plain int and drop the locks",
    ],
    answer: [0],
    explain:
      "Two threads acquiring the same pair in opposite order is the textbook cycle. scoped_lock uses a deadlock-avoidance algorithm; a fixed order removes the cycle by construction. A recursive mutex does not help (the locks are different objects), and the self-transfer case still needs its own guard.",
  },
  {
    id: "cdm-smell-wait-if",
    kind: "smell",
    topic: "L7.condvar",
    level: 2,
    prompt: "A consumer sometimes pops from an empty queue and crashes. What is the smell?",
    code: `T Queue::pop() {
  std::unique_lock<std::mutex> lk(mu_);
  if (items_.empty()) cv_.wait(lk);
  T v = items_.front(); items_.pop();
  return v;
}`,
    options: [
      "The wait is guarded by if, not a loop. A spurious wake-up, or another consumer that got there first, leaves the queue empty. Use a predicate: cv_.wait(lk, [&]{ return !items_.empty(); })",
      "wait() must be called without holding the lock",
      "notify_one should be replaced by sleeping for 1 ms",
      "items_ should be a std::atomic<std::queue<T>>",
    ],
    answer: [0],
    explain:
      "A condition variable wake-up only says 'something may have changed'. The condition must be rechecked under the lock, which is what the predicate overload does. The cost is nothing; the habit is a standard interview check.",
  },
  {
    id: "cdm-smell-atomic-check-then-act",
    kind: "smell",
    topic: "L7.atomics",
    level: 3,
    prompt: "Every field in this class is atomic, yet two threads sometimes both run the setup. Why?",
    code: `std::atomic<bool> ready_{false};
void Cache::ensure() {
  if (!ready_.load()) {      // check
    buildIndex();            // expensive
    ready_.store(true);      // act
  }
}`,
    options: [
      "Each operation is atomic but the check and the act are two steps, so both threads can see false. Make it one step: std::call_once, a mutex around both, or a compare_exchange to claim the job",
      "load() and store() are not allowed on std::atomic<bool>",
      "The flag must be volatile as well as atomic",
      "Use memory_order_relaxed to make the check faster",
    ],
    answer: [0],
    explain:
      "Atomics make single operations indivisible, not sequences. Claiming the work needs a read-modify-write (CAS) or a lock. Note that CAS alone would let a second thread read a half-built index, so the publication order (build, then release-store) matters as well.",
  },
  {
    id: "cdm-smell-detached-capture",
    kind: "smell",
    topic: "L7.threads",
    level: 2,
    prompt: "A request handler passes tests but corrupts memory in production. What is wrong?",
    code: `void handle(Request req) {
  Result r;
  std::thread([&] { r = compute(req); }).detach();
  return;                   // r and req are locals
}`,
    options: [
      "A detached thread captures locals by reference and outlives the function, so it writes through dangling references. Join before returning (std::jthread), or hand the thread owned copies and a way to report completion",
      "detach() is slow; use join() inside the lambda",
      "Lambdas cannot capture by reference in a thread",
      "compute() must be marked noexcept",
    ],
    answer: [0],
    explain:
      "Detach gives up the only moment where lifetime is checked. The fix is ownership: join it (jthread makes that automatic), or move/copy everything the thread needs into it and signal completion through a future. Detached threads also complicate clean shutdown.",
  },
  {
    id: "cdm-smell-pool-holds-lock",
    kind: "smell",
    topic: "L7.pool",
    level: 3,
    prompt: "Adding workers to this pool does not make it faster, and a task that submits another task freezes it. Name the smell.",
    code: `void Pool::workerLoop() {
  std::unique_lock<std::mutex> lk(mu_);
  while (!stop_) {
    cv_.wait(lk, [&]{ return stop_ || !tasks_.empty(); });
    if (tasks_.empty()) continue;
    auto t = std::move(tasks_.front()); tasks_.pop();
    t();                    // runs the task
  }
}`,
    options: [
      "The task runs while the queue lock is held: workers take turns (no parallelism) and a task that calls submit() tries to take the same lock. Pop under the lock, release it, then run the task",
      "tasks_ should be a std::vector so it can grow",
      "stop_ must be checked before every wait",
      "Use one std::thread per task and drop the queue",
    ],
    answer: [0],
    explain:
      "The critical section should cover the queue and nothing else. Running arbitrary user code under a lock removes concurrency and invites self-deadlock. The honest cost of the fix is a few more lines: unlock before the call and relock for the next wait.",
  },
  {
    id: "cdm-smell-restraint-counter",
    kind: "smell",
    topic: "L7.atomics",
    level: 3,
    prompt:
      "A reviewer asks you to replace this with a lock-free structure 'for performance'. It is updated about twenty times a second and read by a dashboard once a second. What is the right call?",
    code: `class Metrics {
  std::mutex mu_;
  std::map<std::string, long> counts_;
 public:
  void bump(const std::string& k) { std::lock_guard<std::mutex> g(mu_); ++counts_[k]; }
  std::map<std::string, long> snapshot() { std::lock_guard<std::mutex> g(mu_); return counts_; }
};`,
    options: [
      "Keep it. The mutex is correct, simple and nowhere near a bottleneck at this rate; a lock-free map would add subtle memory-ordering risk. Measure before changing, and note the threshold at which you would revisit",
      "Replace the map with std::atomic<std::map<...>>",
      "Remove the lock from snapshot() because reading is safe",
      "Switch to memory_order_relaxed on the mutex",
    ],
    answer: [0],
    explain:
      "This card tests restraint. Lock-free code is harder to prove and to review, and it only pays off under heavy contention. Twenty updates a second is nowhere near it. The senior signal is saying what you would measure, and what rate would change your answer. (std::atomic<std::map> does not exist, and an unlocked read races with writers.)",
  },
];
