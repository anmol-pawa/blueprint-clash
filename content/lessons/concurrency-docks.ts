import type { Lesson } from "@/lib/lessons/model";

/**
 * Concurrency Docks lessons (CURRICULUM L7). Original wording. Every `before`/`after` program is compiled with g++ -pthread and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major. Each program is deterministic:
 * where a real race would make the output vary, a small test seam (a latch or a pause callback) forces the bad interleaving, the
 * same way a Race Hunter puzzle pins one schedule. In production code that seam does not exist; the bug is the same.
 */
export const CONCURRENCY_DOCKS_LESSONS: Lesson[] = [
  {
    id: "threads-share-less",
    level: "L7",
    title: "Threads: share less, join, then combine",
    oneLiner: "The cheapest way to make threaded code correct is to give each thread its own data and combine the results after join.",
    cardTopic: "L7.threads",
    intro: `A **data race** is two threads touching the same memory with at least one write and no ordering between them; it is undefined behaviour. A **race condition** is the wider bug where the result depends on timing, even if every single access is synchronised. You can have either without the other, and interviewers like candidates who can say which one they are looking at.

Locks fix races by making threads take turns. The better first question is: **does this data need to be shared at all?** If each worker computes a partial result into its own slot, nobody takes a turn, there is nothing to contend on, and the only synchronisation is the \`join\` that waits for the worker to finish (join also makes the worker's writes visible to you).

Prefer \`std::jthread\` (C++20): it joins in its destructor, so an early return or exception cannot leave a joinable thread behind (destroying a joinable \`std::thread\` calls \`std::terminate\`). Threads are not free: a pool, or a thread per core, beats a thread per item.`,
    smell: `- Every worker updates one shared total, so each iteration takes the same lock.
- Speed-up vanishes or reverses as you add threads (the lock is the bottleneck).
- A raw \`std::thread\` with a hand-written \`join\` on only some paths.
- Threads capture locals by reference and the function can return before they finish.`,
    before: `#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

// Correct, but every single addition fights for one lock, so more threads buy almost nothing.
int main() {
    long long total = 0;
    std::mutex totalMutex;
    std::vector<std::thread> workers;
    for (int w = 0; w < 4; ++w) {
        workers.emplace_back([&total, &totalMutex, w] {
            for (int i = w * 250 + 1; i <= (w + 1) * 250; ++i) {
                std::lock_guard<std::mutex> guard(totalMutex);
                total += i;
            }
        });
    }
    for (auto& t : workers) t.join();
    std::cout << "sum: " << total << "\\n";
}
`,
    after: `#include <iostream>
#include <thread>
#include <vector>

// Each worker owns one slot of 'partial', so the hot loop needs no lock. join (inside jthread's destructor) orders the writes.
long long sumRange(int first, int last) {
    long long sum = 0;
    for (int i = first; i <= last; ++i) sum += i;
    return sum;
}

int main() {
    constexpr int kWorkers = 4;
    constexpr int kPerWorker = 250;
    std::vector<long long> partial(kWorkers, 0);
    {
        std::vector<std::jthread> workers;
        for (int w = 0; w < kWorkers; ++w) {
            workers.emplace_back([&partial, w] { partial[w] = sumRange(w * kPerWorker + 1, (w + 1) * kPerWorker); });
        }
    }  // jthread destructors join here; after this brace every partial[w] is safe to read.
    long long total = 0;
    for (const long long p : partial) total += p;
    std::cout << "sum: " << total << "\\n";
}
`,
    beforeOutput: "sum: 500500",
    afterOutput: "sum: 500500",
    refactorNotes: `The hot loop is now lock-free because no two threads write the same element; the only shared step is the final reduction, done by one thread after every worker has joined.

**Trade-offs:** adjacent \`long long\` slots can share a cache line, so under heavy writes the workers still slow each other (**false sharing**); for long loops accumulate in a local variable and store once, or pad the slots. Partitioning only works when work splits cleanly; shared mutable structures (a cache, a queue) still need the tools in the next lessons. And \`std::thread\` per item does not scale: for many small tasks use a pool (last lesson).`,
    interviewSignal: `Say the two terms precisely (data race versus race condition) and then ask "can we avoid sharing?" before reaching for a mutex. Senior signal: you mention false sharing and that join gives a happens-before edge. Staff signal: you size the thread count to cores or to the blocking ratio, and say how you would measure it.`,
    overApplication: `Do not split work across threads when the whole job takes microseconds: creating a thread costs far more than the loop. Partitioning also complicates code (index arithmetic, remainder handling), so keep a single-threaded version as the oracle in tests and only parallelise what a profile shows is worth it.`,
  },
  {
    id: "mutex-raii",
    level: "L7",
    title: "Mutex: lock with RAII, never by hand",
    oneLiner: "Own the lock with a guard object so every exit path (early return, exception) releases it.",
    cardTopic: "L7.mutex",
    intro: `A mutex protects an **invariant**, not a variable: "stock is never negative", "the map and its size agree". Every access to the data that invariant covers happens while holding the same mutex, and the lock is held for as short a **critical section** as the invariant allows.

Calling \`lock()\` and \`unlock()\` yourself is the C++ equivalent of \`malloc\`/\`free\`: correct only if every path remembers. RAII fixes it. Use \`std::lock_guard\` for plain scoped locking, \`std::unique_lock\` when you need to unlock early or hand the lock to a condition variable, and \`std::scoped_lock\` for several mutexes at once (next lessons).

Keep the mutex **private, next to the data it guards**, and expose operations ("take n") instead of "lock, then touch fields". Never call unknown code (a callback, a virtual function) while holding a lock: you cannot know what locks it takes.`,
    smell: `- \`mutex.lock()\` and \`mutex.unlock()\` written out by hand.
- An early \`return\`, \`continue\` or \`throw\` between lock and unlock.
- Public data members plus a public mutex: callers are trusted to lock.
- Locking inside a loop body just to read a flag that never changes.`,
    before: `#include <iostream>
#include <mutex>
#include <thread>

// Inventory with hand-written locking. The early return forgets to unlock, so the lock leaks.
class Inventory {
public:
    explicit Inventory(int stock) : stock_(stock) {}

    bool take(int n) {
        mutex_.lock();
        if (n > stock_) return false;  // BUG: still locked
        stock_ -= n;
        mutex_.unlock();
        return true;
    }

    // Asks "could another thread get the lock right now?" from a probe thread.
    bool lockIsFree() {
        bool free = false;
        std::thread probe([this, &free] {
            free = mutex_.try_lock();
            if (free) mutex_.unlock();
        });
        probe.join();
        return free;
    }

    void rescueForTest() { mutex_.unlock(); }

private:
    std::mutex mutex_;
    int stock_;
};

int main() {
    Inventory inventory(3);
    std::cout << "take 5: " << (inventory.take(5) ? "ok" : "refused") << "\\n";
    std::cout << "lock free after refusal? " << (inventory.lockIsFree() ? "yes" : "no") << "\\n";
    inventory.rescueForTest();
}
`,
    after: `#include <iostream>
#include <mutex>
#include <thread>

// Same behaviour, but the guard releases the lock on every path.
class Inventory {
public:
    explicit Inventory(int stock) : stock_(stock) {}

    bool take(int n) {
        std::lock_guard<std::mutex> guard(mutex_);
        if (n > stock_) return false;
        stock_ -= n;
        return true;
    }

    int stock() const {
        std::lock_guard<std::mutex> guard(mutex_);
        return stock_;
    }

    // Asks "could another thread get the lock right now?" from a probe thread.
    bool lockIsFree() {
        bool free = false;
        std::thread probe([this, &free] {
            free = mutex_.try_lock();
            if (free) mutex_.unlock();
        });
        probe.join();
        return free;
    }

private:
    mutable std::mutex mutex_;
    int stock_;
};

int main() {
    Inventory inventory(3);
    std::cout << "take 5: " << (inventory.take(5) ? "ok" : "refused") << "\\n";
    std::cout << "lock free after refusal? " << (inventory.lockIsFree() ? "yes" : "no") << "\\n";
    std::cout << "take 2: " << (inventory.take(2) ? "ok" : "refused") << "\\n";
    std::cout << "stock left: " << inventory.stock() << "\\n";
}
`,
    beforeOutput: "take 5: refused\nlock free after refusal? no",
    afterOutput: "take 5: refused\nlock free after refusal? yes\ntake 2: ok\nstock left: 1",
    refactorNotes: `\`lock_guard\` ties the lock to the scope: the refusal path, the success path and any exception all release it. The mutex is \`mutable\` so a \`const\` reader such as \`stock()\` can lock it, which keeps const-correctness honest (a const method that is safe to call from many threads).

**Trade-off:** a guard held for a whole function can be too coarse. When the slow part (I/O, a callback) does not touch the invariant, narrow the scope with a block or switch to \`unique_lock\` and unlock early. Coarse locks are simple and usually right first; fine-grained locks buy throughput at the price of reasoning about more invariants.`,
    interviewSignal: `Name the invariant the mutex guards, state that the guard is private, and show \`lock_guard\` unprompted. Senior signal: const methods lock a \`mutable\` mutex, no callbacks run under the lock, and you can say why a global lock is a fine v1. Staff signal: you discuss contention, lock scope versus invariant scope, and when to shard the lock.`,
    overApplication: `Locking everything "to be safe" serialises the program and invites deadlock. A lock around data only one thread ever touches is pure cost, and a lock around a single independent counter is often better as an atomic. Guards also do not make a multi-step operation atomic if you drop and retake the lock between the steps.`,
  },
  {
    id: "condvar-predicate",
    level: "L7",
    title: "Condition variables: wait on a predicate, not a notification",
    oneLiner: "A notification is a hint to re-check the state; the state, under the mutex, is the truth.",
    cardTopic: "L7.condvar",
    intro: `A condition variable lets a thread sleep until some **condition over shared state** may have changed. The shared state lives under a mutex; \`wait\` atomically releases the mutex and sleeps, then reacquires it before returning.

Two facts shape every correct use:

- **A notification is not remembered.** If the producer notifies before the consumer starts waiting, that notification is gone. A consumer that waits for "a notify" instead of "the item exists" sleeps forever (a **lost wake-up**).
- **Wake-ups can be spurious**, and another consumer may take the item first. So you always re-check the condition: wait with a predicate (\`cv.wait(lock, pred)\`), which is exactly a \`while (!pred) wait(lock)\` loop.

The producer changes the state **under the mutex**, then notifies (before or after unlocking is fine; after is slightly cheaper). Use \`notify_all\` when waiters wait for different conditions on the same variable; \`notify_one\` is only safe when any one waiter can make progress.`,
    smell: `- \`cv.wait(lock)\` with no predicate, or \`if (!ready) cv.wait(lock)\` instead of a loop.
- The wake-up is treated as proof that the data exists.
- A flag read outside the mutex that guards it.
- \`notify_one\` with different kinds of waiters on one condition variable.`,
    before: `#include <chrono>
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <optional>
#include <thread>

// The consumer treats "I was notified" as "there is an item". The producer notified earlier, so the item is missed.
class Mailbox {
public:
    void post(int value) {
        {
            std::lock_guard<std::mutex> guard(mutex_);
            value_ = value;
            has_ = true;
        }
        cv_.notify_one();
    }

    std::optional<int> waitFor(std::chrono::milliseconds timeout) {
        std::unique_lock<std::mutex> lock(mutex_);
        const std::cv_status status = cv_.wait_for(lock, timeout);  // BUG: no predicate
        if (status == std::cv_status::no_timeout) return value_;
        return std::nullopt;
    }

private:
    std::mutex mutex_;
    std::condition_variable cv_;
    int value_ = 0;
    bool has_ = false;
};

int main() {
    Mailbox box;
    std::thread producer([&box] { box.post(42); });
    producer.join();  // the post (and its notify) is over before anyone waits
    std::optional<int> got;
    std::thread consumer([&box, &got] { got = box.waitFor(std::chrono::milliseconds(50)); });
    consumer.join();
    std::cout << "consumer saw: " << (got ? std::to_string(*got) : std::string("nothing (item was already posted)")) << "\\n";
}
`,
    after: `#include <chrono>
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <optional>
#include <string>
#include <thread>

// The consumer waits for the state (has_), so a notification that came early cannot be lost.
class Mailbox {
public:
    void post(int value) {
        {
            std::lock_guard<std::mutex> guard(mutex_);
            value_ = value;
            has_ = true;
        }
        cv_.notify_one();
    }

    std::optional<int> waitFor(std::chrono::milliseconds timeout) {
        std::unique_lock<std::mutex> lock(mutex_);
        if (!cv_.wait_for(lock, timeout, [this] { return has_; })) return std::nullopt;
        has_ = false;
        return value_;
    }

private:
    std::mutex mutex_;
    std::condition_variable cv_;
    int value_ = 0;
    bool has_ = false;
};

int main() {
    Mailbox box;
    std::thread producer([&box] { box.post(42); });
    producer.join();
    std::optional<int> got;
    std::thread consumer([&box, &got] { got = box.waitFor(std::chrono::milliseconds(50)); });
    consumer.join();
    std::cout << "consumer saw: " << (got ? std::to_string(*got) : std::string("nothing")) << "\\n";
}
`,
    beforeOutput: "consumer saw: nothing (item was already posted)",
    afterOutput: "consumer saw: 42",
    refactorNotes: `The predicate overload re-checks \`has_\` under the mutex before sleeping and after every wake-up, which covers the early notification, spurious wake-ups and a rival consumer stealing the item. The consumer also clears \`has_\` while still holding the lock, so the take is atomic with the check.

**Trade-offs:** a timeout returns an empty \`optional\`, which pushes a decision to the caller (retry, give up, alert). A one-slot mailbox is the simplest shape; for many items you want a bounded queue, where you need two conditions (not full, not empty): either two condition variables or \`notify_all\`, because a single \`notify_one\` can wake the wrong kind of waiter. The Race Hunter "bounded queue" puzzle explores exactly that.`,
    interviewSignal: `Say "the condition variable carries no data; the predicate under the mutex is the truth", and write the predicate overload without being asked. Senior signal: you name lost wake-up and spurious wake-up separately, explain why the flag is set under the mutex, and choose \`notify_all\` or two variables for a bounded buffer. Staff signal: you offer a design that avoids the primitive (a blocking queue abstraction) and say what to test with a stress run plus a model checker.`,
    overApplication: `A condition variable is the wrong tool for a one-shot result (use \`std::promise\`/\`std::future\`) or a simple "stop" request (use \`std::stop_token\` or an atomic flag). Hand-rolled wait loops all over a codebase are a smell; wrap the pattern in one small blocking-queue class and reuse it.`,
  },
  {
    id: "atomics-check-then-act",
    level: "L7",
    title: "Atomics: one atomic op is not an atomic decision",
    oneLiner: "Reading an atomic and then writing it is two steps; use one read-modify-write (compare-exchange or fetch_op) so the decision and the update cannot be split.",
    cardTopic: "L7.atomics",
    intro: `\`std::atomic<T>\` makes **a single operation** indivisible: a load, a store, \`fetch_add\`, or a \`compare_exchange\`. It does not make two operations in a row indivisible. "If stock is positive, subtract one" written as a \`load\` followed by a \`fetch_sub\` is a **check-then-act** race: two threads can both see stock = 1 and both subtract.

The fix is to make the check and the update one atomic step. A **compare-and-swap (CAS) loop** reads the current value, computes the new value, and installs it only if the value is still what you read; if another thread got there first, CAS fails, hands you the fresh value, and you decide again. That is the foundation of lock-free counters, stacks and slot claims.

Two cautions. **Memory ordering:** the default \`seq_cst\` is the safe choice; \`acquire\`/\`release\` is enough to publish data through a flag, and \`relaxed\` is only for independent counters. **ABA:** CAS only checks that the value matches, not that nothing happened in between; lock-free structures that recycle pointers pair the value with a version tag.`,
    smell: `- \`if (counter.load() > 0) counter.fetch_sub(1);\`
- Two atomics that must change together (an invariant across variables) with no lock.
- \`volatile\` used as if it meant atomic (it does not in C++).
- Relaxed ordering used to publish a non-atomic object.`,
    before: `#include <array>
#include <atomic>
#include <functional>
#include <iostream>
#include <latch>
#include <thread>

// Check-then-act on an atomic: both threads pass the check before either subtracts.
class Stock {
public:
    explicit Stock(int units) : units_(units) {}

    // 'pause' is a test seam that forces both threads into the window between check and update.
    bool reserve(const std::function<void()>& pause) {
        if (units_.load() > 0) {
            pause();
            units_.fetch_sub(1);
            return true;
        }
        return false;
    }

    int units() const { return units_.load(); }

private:
    std::atomic<int> units_;
};

int main() {
    Stock stock(1);
    std::latch bothChecked(2);
    const auto pause = [&bothChecked] { bothChecked.arrive_and_wait(); };
    std::array<bool, 2> sold{false, false};
    std::thread a([&] { sold[0] = stock.reserve(pause); });
    std::thread b([&] { sold[1] = stock.reserve(pause); });
    a.join();
    b.join();
    const int count = (sold[0] ? 1 : 0) + (sold[1] ? 1 : 0);
    std::cout << "sold: " << count << " of 2 requests (stock=" << stock.units() << ")\\n";
}
`,
    after: `#include <array>
#include <atomic>
#include <functional>
#include <iostream>
#include <latch>
#include <thread>

// The decision and the update are one compare-exchange, so only one of the two requests can win the last unit.
class Stock {
public:
    explicit Stock(int units) : units_(units) {}

    // 'pause' is the same test seam; it runs after the first read and before the commit.
    bool reserve(const std::function<void()>& pause) {
        int seen = units_.load();
        pause();
        while (seen > 0) {
            if (units_.compare_exchange_weak(seen, seen - 1)) return true;  // on failure 'seen' is refreshed
        }
        return false;
    }

    int units() const { return units_.load(); }

private:
    std::atomic<int> units_;
};

int main() {
    Stock stock(1);
    std::latch bothRead(2);
    const auto pause = [&bothRead] { bothRead.arrive_and_wait(); };
    std::array<bool, 2> sold{false, false};
    std::thread a([&] { sold[0] = stock.reserve(pause); });
    std::thread b([&] { sold[1] = stock.reserve(pause); });
    a.join();
    b.join();
    const int count = (sold[0] ? 1 : 0) + (sold[1] ? 1 : 0);
    std::cout << "sold: " << count << " of 2 requests (stock=" << stock.units() << ")\\n";
}
`,
    beforeOutput: "sold: 2 of 2 requests (stock=-1)",
    afterOutput: "sold: 1 of 2 requests (stock=0)",
    refactorNotes: `Both threads read 1, but only one compare-exchange can change 1 to 0; the loser gets the fresh value 0 back in \`seen\`, the loop condition fails, and it reports "sold out". \`compare_exchange_weak\` may fail spuriously, which the loop absorbs (it is the right choice inside a loop; use \`_strong\` for a one-shot attempt). The default sequentially consistent ordering is kept on purpose.

**Trade-offs:** a CAS loop is lock-free but can retry under heavy contention, and it only works while the whole state fits in one atomic word. When the invariant spans several fields (stock plus a reservations list) a mutex is simpler and just as correct. Reach for lock-free code when profiling shows lock contention, not before.`,
    interviewSignal: `Spot "load then store" as check-then-act in one sentence and fix it with a CAS loop or a mutex, explaining the choice. Senior signal: you know \`compare_exchange\` rewrites the expected value on failure, you can say why \`volatile\` is not atomic, and you mention ABA when pointers are recycled. Staff signal: you tie memory ordering to what is being published, and prefer seq_cst until measurements say otherwise.`,
    overApplication: `Atomics everywhere give a false sense of safety: several atomics do not form a consistent snapshot, and clever memory orders are hard to review and test. For anything beyond a counter, a flag or a single-word claim, a mutex is easier to get right, and "simple and correct" beats "lock-free and subtly wrong" in an interview and in production.`,
  },
  {
    id: "deadlock-lock-order",
    level: "L7",
    title: "Deadlock: one global lock order, or lock them together",
    oneLiner: "Deadlock needs four things at once; remove circular wait by taking multiple locks in one agreed order, or all at once with std::scoped_lock.",
    cardTopic: "L7.deadlock",
    intro: `Deadlock needs all four **Coffman conditions**: mutual exclusion (a lock is exclusive), hold-and-wait (a thread holds one lock while asking for another), no pre-emption (you cannot take a lock away), and **circular wait** (A waits for B while B waits for A). Break any one and it cannot happen. In practice you break circular wait.

The classic case is a transfer between two accounts: one thread moves A to B and another moves B to A, each locking "its own" account first. Each then waits for the lock the other holds. The fix is one rule everyone follows: lock in a **global order** (by address or id), or acquire both locks as a single operation. C++17's \`std::scoped_lock(a, b)\` does the second using a deadlock-avoidance algorithm, so you cannot get the order wrong.

Other defences: hold fewer locks (copy data out, release, then act), never call foreign code while locked, and use timeouts (\`try_lock_for\`) to turn a hang into a reportable error. A timeout detects; it does not fix.`,
    smell: `- Two code paths that take the same two locks in different orders.
- A function that locks A and then calls something that locks B.
- "Works in tests" but hangs a few times a day under load.
- Lock order documented only in a comment (or nowhere).`,
    before: `#include <array>
#include <barrier>
#include <chrono>
#include <functional>
#include <iostream>
#include <mutex>
#include <thread>

struct Account {
    std::timed_mutex mutex;
    int balance;
};

// Locks 'from' first, then 'to'. Two opposite transfers hold one lock each and wait for the other (circular wait).
// The timeout only exists so this demo ends; the production version of this line would hang.
bool transfer(Account& from, Account& to, int amount, const std::function<void()>& pause) {
    std::lock_guard<std::timed_mutex> first(from.mutex);
    pause();  // test seam: both threads now hold their first lock
    const bool gotSecond = to.mutex.try_lock_for(std::chrono::milliseconds(100));
    pause();  // test seam: neither thread lets go of its first lock until both have tried
    if (!gotSecond) return false;
    std::lock_guard<std::timed_mutex> second(to.mutex, std::adopt_lock);
    from.balance -= amount;
    to.balance += amount;
    return true;
}

int main() {
    Account a{{}, 100};
    Account b{{}, 100};
    std::barrier<> bothHold(2);
    const auto pause = [&bothHold] { bothHold.arrive_and_wait(); };
    std::array<bool, 2> done{false, false};
    std::thread t1([&] { done[0] = transfer(a, b, 30, pause); });
    std::thread t2([&] { done[1] = transfer(b, a, 10, pause); });
    t1.join();
    t2.join();
    const int completed = (done[0] ? 1 : 0) + (done[1] ? 1 : 0);
    std::cout << "transfers completed: " << completed << " of 2 (a=" << a.balance << " b=" << b.balance << ")\\n";
}
`,
    after: `#include <array>
#include <functional>
#include <iostream>
#include <mutex>
#include <thread>

struct Account {
    std::mutex mutex;
    int balance;
};

// scoped_lock acquires both mutexes with a deadlock-avoidance algorithm, so the argument order cannot matter.
bool transfer(Account& from, Account& to, int amount, const std::function<void()>& pause) {
    std::scoped_lock both(from.mutex, to.mutex);
    pause();  // same seam as before; harmless here because we already hold both locks
    if (from.balance < amount) return false;
    from.balance -= amount;
    to.balance += amount;
    return true;
}

int main() {
    Account a{{}, 100};
    Account b{{}, 100};
    const auto noPause = [] {};
    std::array<bool, 2> done{false, false};
    std::thread t1([&] { done[0] = transfer(a, b, 30, noPause); });
    std::thread t2([&] { done[1] = transfer(b, a, 10, noPause); });
    t1.join();
    t2.join();
    const int completed = (done[0] ? 1 : 0) + (done[1] ? 1 : 0);
    std::cout << "transfers completed: " << completed << " of 2 (a=" << a.balance << " b=" << b.balance << ")\\n";
}
`,
    beforeOutput: "transfers completed: 0 of 2 (a=100 b=100)",
    afterOutput: "transfers completed: 2 of 2 (a=80 b=120)",
    refactorNotes: `One call acquires both locks together, so there is no moment where a thread holds one and waits for the other: hold-and-wait with a fixed order is gone. The result no longer depends on which thread runs first (a=80, b=120 either way) and an insufficient balance now refuses instead of going negative.

**Trade-offs:** \`scoped_lock\` handles locks you can name at one site. When locks are taken across many functions, adopt an explicit **lock hierarchy** (acquire in increasing level or id) and assert it in debug builds. Where two accounts can be the same object, lock once (locking the same non-recursive mutex twice is undefined behaviour). Holding two locks serialises both accounts for the duration, so for very hot accounts consider an event-sourced or single-writer design instead.`,
    interviewSignal: `Recite the four conditions and say which one you break. Senior signal: you offer both fixes (global order and \`scoped_lock\`), notice the self-transfer case, and treat timeouts as detection, not a cure. Staff signal: you move from locks to a single-writer-per-account design when throughput matters, and describe how you would find a deadlock in production (thread dumps, lock-order checkers).`,
    overApplication: `A global lock order across the whole codebase is a heavy rule; apply it where locks genuinely nest. Wrapping everything in one big mutex also removes deadlock, but at the cost of parallelism, which is a fine answer for a first version and a poor one at scale. Do not paper over a design that needs two locks everywhere: if every operation touches both, the data probably belongs behind one lock.`,
  },
  {
    id: "thread-pool",
    level: "L7",
    title: "Thread pool: fixed workers, a queue, and a clean shutdown",
    oneLiner: "Create a few workers once and feed them tasks through a mutex-guarded queue, instead of paying for a thread per task.",
    cardTopic: "L7.pool",
    intro: `A thread per task costs a stack, a kernel object and scheduling work each time, and an unbounded number of threads can exhaust memory or thrash the scheduler. A **thread pool** keeps a fixed set of workers alive and hands them tasks through a **queue**. It is the standard "build me X" in a machine-coding round because it combines everything in this district: a mutex, a condition variable with a predicate, ownership of threads, and a shutdown protocol.

The moving parts: a \`std::queue<std::function<void()>>\` guarded by a mutex; workers that \`wait\` on a condition variable with the predicate "stopping or queue not empty"; \`submit\` that pushes a task and returns a \`std::future\` (via \`std::packaged_task\`) so callers get the result or the exception; and a destructor that sets \`stopping\`, wakes everyone and joins. Workers **drain the queue before exiting**, so accepted work is never silently dropped.

Decide and state the policy: bounded or unbounded queue, what \`submit\` does when full (block, reject, run in the caller), and what happens to tasks queued at shutdown.`,
    smell: `- \`std::thread\` created inside a loop, one per request.
- Tasks that never report completion or failure.
- A detached thread that outlives the objects it captured.
- A destructor that does not join, or a stop flag read without the mutex.`,
    before: `#include <iostream>
#include <thread>
#include <vector>

// One thread per task: eight tasks, eight threads. Ten thousand tasks would mean ten thousand threads.
int main() {
    constexpr int kTasks = 8;
    std::vector<long long> results(kTasks, 0);
    {
        std::vector<std::jthread> threads;
        for (int i = 0; i < kTasks; ++i) {
            threads.emplace_back([&results, i] { results[i] = static_cast<long long>(i + 1) * (i + 1); });
        }
        std::cout << "threads created: " << threads.size() << "\\n";
    }
    long long sum = 0;
    for (const long long r : results) sum += r;
    std::cout << "sum of squares: " << sum << "\\n";
}
`,
    after: `#include <condition_variable>
#include <cstddef>
#include <functional>
#include <future>
#include <iostream>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <type_traits>
#include <utility>
#include <vector>

// A small fixed-size pool. Not copyable or movable: workers hold 'this'.
class ThreadPool {
public:
    explicit ThreadPool(std::size_t workers) {
        for (std::size_t i = 0; i < workers; ++i) workers_.emplace_back([this] { workLoop(); });
    }

    ~ThreadPool() {
        {
            std::lock_guard<std::mutex> guard(mutex_);
            stopping_ = true;
        }
        wake_.notify_all();
        // workers_ is declared last, so the jthreads join before the queue, mutex and condition variable are destroyed.
    }

    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator=(const ThreadPool&) = delete;

    std::size_t size() const { return workers_.size(); }

    template <typename Task>
    std::future<std::invoke_result_t<Task>> submit(Task task) {
        using Result = std::invoke_result_t<Task>;
        auto packaged = std::make_shared<std::packaged_task<Result()>>(std::move(task));
        std::future<Result> future = packaged->get_future();
        {
            std::lock_guard<std::mutex> guard(mutex_);
            queue_.push([packaged] { (*packaged)(); });
        }
        wake_.notify_one();
        return future;
    }

private:
    void workLoop() {
        for (;;) {
            std::function<void()> job;
            {
                std::unique_lock<std::mutex> lock(mutex_);
                wake_.wait(lock, [this] { return stopping_ || !queue_.empty(); });
                if (queue_.empty()) return;  // stopping and drained
                job = std::move(queue_.front());
                queue_.pop();
            }
            job();  // run outside the lock
        }
    }

    std::mutex mutex_;
    std::condition_variable wake_;
    std::queue<std::function<void()>> queue_;
    bool stopping_ = false;
    std::vector<std::jthread> workers_;
};

int main() {
    constexpr int kTasks = 8;
    ThreadPool pool(3);
    std::vector<std::future<long long>> futures;
    for (int i = 1; i <= kTasks; ++i) {
        futures.push_back(pool.submit([i] { return static_cast<long long>(i) * i; }));
    }
    std::cout << "threads created: " << pool.size() << "\\n";
    long long sum = 0;
    for (auto& f : futures) sum += f.get();
    std::cout << "sum of squares: " << sum << "\\n";
}
`,
    beforeOutput: "threads created: 8\nsum of squares: 204",
    afterOutput: "threads created: 3\nsum of squares: 204",
    refactorNotes: `Three workers serve eight tasks (or eight thousand) with a constant thread count. \`submit\` returns a \`std::future\`, so the caller can wait for the value and any exception thrown by the task is rethrown at \`get()\`. The predicate-based wait covers spurious and lost wake-ups, jobs run outside the lock so a slow task never blocks \`submit\`, and shutdown is RAII: set the flag under the mutex, wake all workers, let them drain the queue, join.

**Trade-offs:** this queue is unbounded, so a fast producer can exhaust memory; a bounded queue adds a second condition ("not full") and a policy (block, reject or caller-runs). One shared queue is a contention point at high task rates (work-stealing queues per worker fix that, with more complexity). Tasks that block on other tasks in the same pool can starve it. \`submit\` after destruction began is a caller bug here; a production pool would reject it.`,
    interviewSignal: `Draw the four parts (queue, mutex plus condition variable, workers, future) before coding, and state the shutdown policy. Senior signal: predicate wait, run-outside-the-lock, member declaration order for safe destruction, exceptions delivered through the future. Staff signal: bounded queues with back-pressure, work stealing, task priorities, and why you would normally use an existing executor rather than write one.`,
    overApplication: `A pool is not free either: sizing it wrongly (too few for blocking I/O, too many for CPU work) hurts, and one global pool shared by unrelated work lets a slow subsystem starve everyone. For one-off background work, \`std::async\` or a single dedicated thread is simpler. In real systems prefer a vetted executor library to a hand-rolled one.`,
  },
];
