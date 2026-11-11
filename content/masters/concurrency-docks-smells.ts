import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for Dockmaster Halyard's last phase. Each shows a short C++ fragment and asks for the smell, the cost,
 * or the right call. Original wording; the wrong options are the tempting neighbours, and one card tests
 * restraint (a lock or an atomic that is not earned) rather than a violation.
 */
export const CONCURRENCY_DOCKS_MASTER_SMELLS: Card[] = [
  {
    id: "cdm-smell-manual-unlock",
    kind: "smell",
    topic: "L7.mutex",
    level: 2,
    prompt: "Under load the service sometimes stops answering and never recovers. What is the smell?",
    code: `bool Stock::take(int n) {
  m_.lock();
  if (n > count_) return false;   // early exit
  count_ -= n;
  m_.unlock();
  return true;
}`,
    options: [
      "The early return leaves the mutex locked. Use std::lock_guard so every exit path releases it",
      "count_ should be volatile so other threads see the update",
      "The mutex must be locked twice for safety",
      "Replace the mutex with a sleep(1) before each call",
    ],
    answer: [0],
    explain:
      "A manual lock/unlock pair is only correct if every path reaches the unlock, and exceptions and early returns break that quietly. RAII ties release to scope. The cost is almost nothing, which is why raw lock() calls in application code are a smell on sight.",
  },
  {
    id: "cdm-smell-lock-order",
    kind: "smell",
    topic: "L7.deadlock",
    level: 3,
    prompt: "Two transfers run at once, A to B and B to A, and both hang. What is the structural cause?",
    code: `void move(Account& from, Account& to, int amt) {
  std::lock_guard<std::mutex> a(from.m);
  std::lock_guard<std::mutex> b(to.m);
  from.bal -= amt;  to.bal += amt;
}`,
    options: [
      "Each thread takes the two locks in a different order, so they can wait on each other. Acquire both together with std::scoped_lock, or impose one global order such as by id",
      "lock_guard is not allowed on two mutexes in a function",
      "The balances need to be atomic so no mutex is needed",
      "Add a timeout on the first lock only and ignore the second",
    ],
    answer: [0],
    explain:
      "Hold-and-wait with inconsistent ordering is the classic deadlock recipe. Breaking any one condition fixes it: a single acquire step (scoped_lock avoids the order problem by deadlock-avoidance), or a strict total order. The cost is that you must remember the rule for every new multi-lock path; and a self-transfer needs a guard so one mutex is not locked twice.",
  },
  {
    id: "cdm-smell-wait-if",
    kind: "smell",
    topic: "L7.condvar",
    level: 3,
    prompt: "A consumer occasionally pops from an empty queue. What is wrong?",
    code: `std::unique_lock<std::mutex> lk(m_);
if (q_.empty()) cv_.wait(lk);     // wait once
int v = q_.front();  q_.pop();`,
    options: [
      "A wake-up does not guarantee the condition. Wait with a predicate in a loop: cv_.wait(lk, [&]{ return !q_.empty(); })",
      "wait needs a lock_guard, not a unique_lock",
      "notify_one must be replaced by sleep",
      "The queue should be a global variable",
    ],
    answer: [0],
    explain:
      "Spurious wake-ups and a second consumer stealing the item mean the condition may be false when wait returns. The predicate overload re-checks under the lock every time. The fix costs one lambda; leaving it out produces a bug that appears once a week in production.",
  },
  {
    id: "cdm-smell-dcl-plain",
    kind: "smell",
    topic: "L7.atomics",
    level: 3,
    prompt: "A lazy singleton is checked outside the lock to save time. Why is this still a bug?",
    code: `Config* get() {
  if (!inst_) {                    // plain pointer, no lock
    std::lock_guard<std::mutex> g(m_);
    if (!inst_) inst_ = new Config();
  }
  return inst_;
}`,
    options: [
      "The unlocked read races with the write: it is a data race, and a thread can see the pointer before the object is fully built. Use std::call_once, a function-local static, or an atomic with acquire/release",
      "The second if makes the code slower, so remove both checks",
      "new is never thread-safe",
      "The mutex should be released before the second check",
    ],
    answer: [0],
    explain:
      "Double-checked locking is only correct if the fast-path read is atomic with acquire semantics and the publish is a release store. A plain pointer is a data race, which is undefined behaviour in C++ regardless of how rarely it fires. A function-local static is the simplest fix and is thread-safe since C++11.",
  },
  {
    id: "cdm-smell-detach",
    kind: "smell",
    topic: "L7.threads",
    level: 2,
    prompt: "A worker thread reads a local counter after the function that started it has returned. What is the smell and the fix?",
    code: `void start() {
  int count = 0;
  std::thread t([&]{ for (int i = 0; i < 1000; ++i) ++count; });
  t.detach();
}`,
    options: [
      "A detached thread captures a local by reference, so it outlives the data (and the increments also race). Join, or give the thread ownership of what it uses, e.g. std::jthread plus a shared atomic or shared_ptr state",
      "detach is required for every thread in C++",
      "Capture by reference is always safe if the lambda is short",
      "Increase the loop count so the thread finishes sooner",
    ],
    answer: [0],
    explain:
      "A thread's lifetime has to be owned by something. Detaching a thread that borrows stack data is a dangling reference waiting for a scheduler to expose it. std::jthread joins on destruction (RAII); the cost is that the owner must outlive the work, which is the point.",
  },
  {
    id: "cdm-smell-poll-sleep",
    kind: "smell",
    topic: "L7.pool",
    level: 3,
    prompt: "A pool worker polls for tasks. Under load it is slow and when idle it burns CPU. Name the smell and the fix.",
    code: `void worker() {
  while (running_) {
    if (auto t = tryPop()) { (*t)(); }
    else std::this_thread::sleep_for(std::chrono::milliseconds(1));
  }
}`,
    options: [
      "Busy polling with a sleep trades latency for CPU in both directions. Block on a condition variable that producers signal, and signal on shutdown too",
      "Make the sleep zero so the loop is faster",
      "Spawn one thread per task so no queue is needed, with no limit",
      "Mark running_ as a plain bool so the compiler keeps it in a register",
    ],
    answer: [0],
    explain:
      "A sleep loop has to guess how long to wait: too short wastes CPU, too long adds latency to every task. A condition variable wakes exactly when work arrives. The cost is a little more code and the obligation to wake all workers on shutdown so none sleeps forever. Thread-per-task is a separate trap: it removes the queue but also any bound on resources.",
  },
  {
    id: "cdm-smell-lock-everything",
    kind: "smell",
    topic: "L7.mutex",
    level: 3,
    prompt: "A code reviewer wants a mutex around every read in this class. What is the right call?",
    code: `class Settings {            // built once, then only read
  const std::string name_;
  const int retries_;
 public:
  Settings(std::string n, int r) : name_(std::move(n)), retries_(r) {}
  const std::string& name() const { return name_; }
  int retries() const { return retries_; }
};`,
    options: [
      "No lock is needed: the object is immutable after construction, so concurrent reads are safe. Publish it safely (e.g. build it before starting threads or share it via shared_ptr<const Settings>)",
      "Add a mutex to every getter anyway, since locks are free",
      "Make name_ and retries_ atomic",
      "Add a second mutex in case the first fails",
    ],
    answer: [0],
    explain:
      "This card tests restraint. Immutable data needs no synchronisation once it is published safely, and the cheapest correct design is often to remove shared mutable state rather than guard it. Locks around immutable reads add contention and make the class look like it has an invariant to protect when it does not. The real work is the publication step.",
  },
];
