#include <functional>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
class SpyLock final : public Lock {
 public:
  void lock() override {
    if (held_) ++misuse;  // non-recursive
    held_ = true;
  }
  void unlock() override {
    if (!held_) ++misuse;
    held_ = false;
  }
  bool try_lock() override {
    if (held_) return false;
    lock();
    return true;
  }
  bool held() const { return held_; }
  int misuse = 0;

 private:
  bool held_ = false;
};

class SpyCondition final : public Condition {
 public:
  explicit SpyCondition(SpyLock& lock) : lock_(lock) {}
  void wait(Lock& lock) override {
    ++waits;
    if (!lock_.held()) ++lock_.misuse;
    lock.unlock();
    if (onWake) onWake(waits);
    lock.lock();
  }
  void notifyOne() override { ++ones; }
  void notifyAll() override { ++alls; }
  int waits = 0;
  int ones = 0;
  int alls = 0;
  std::function<void(int)> onWake;

 private:
  SpyLock& lock_;
};

struct Bench {
  SpyLock lock;
  SpyCondition wakeup{lock};
  TaskQueue queue{lock, wakeup};
  std::string ran;
  Task note(char c) {
    return [this, c] { ran.push_back(c); };
  }
};
}  // namespace

TEST(Queue, RunsTasksInSubmissionOrder) {
  Bench b;
  EXPECT_TRUE(b.queue.submit(b.note('a')));
  EXPECT_TRUE(b.queue.submit(b.note('b')));
  EXPECT_TRUE(b.queue.submit(b.note('c')));
  b.queue.shutdown();
  b.queue.runWorker();
  EXPECT_EQ(b.ran, std::string("abc"));
}

TEST(Queue, SleepsUntilWorkArrivesIgnoringSpuriousWakeups) {
  Bench b;
  // Wake-up 1 is spurious, 2 delivers a task, 3 requests shutdown.
  b.wakeup.onWake = [&](int n) {
    if (n == 2) b.queue.submit(b.note('x'));
    if (n == 3) b.queue.shutdown();
  };
  b.queue.runWorker();
  EXPECT_EQ(b.ran, std::string("x"));
  EXPECT_EQ(b.wakeup.waits, 3);
}

TEST(Queue, DoesNotWaitWhenTasksAreAlreadyQueued) {
  Bench b;
  b.queue.submit(b.note('a'));
  b.queue.shutdown();
  b.queue.runWorker();
  EXPECT_EQ(b.wakeup.waits, 0);
}

TEST(Signalling, SubmitWakesAWorker) {
  Bench b;
  b.queue.submit(b.note('a'));
  EXPECT_TRUE(b.wakeup.ones + b.wakeup.alls >= 1);
}

TEST(Shutdown, WakesEveryWorker) {
  Bench b;
  b.queue.shutdown();
  EXPECT_TRUE(b.wakeup.alls >= 1);
}

TEST(Shutdown, DrainsQueuedTasksBeforeExiting) {
  Bench b;
  b.queue.submit(b.note('a'));
  b.queue.submit(b.note('b'));
  b.queue.shutdown();
  b.queue.runWorker();
  EXPECT_EQ(b.ran, std::string("ab"));
}

TEST(Shutdown, SubmitAfterShutdownIsRejected) {
  Bench b;
  b.queue.shutdown();
  EXPECT_FALSE(b.queue.submit(b.note('z')));
  b.queue.runWorker();
  EXPECT_EQ(b.ran, std::string(""));
}

TEST(Locking, TasksRunWithoutTheLockHeld) {
  Bench b;
  bool heldDuringTask = true;
  b.queue.submit([&] { heldDuringTask = b.lock.held(); });
  b.queue.shutdown();
  b.queue.runWorker();
  EXPECT_FALSE(heldDuringTask);
}

TEST(Locking, ATaskMayEnqueueFollowUpWork) {
  Bench b;
  b.queue.submit([&] {
    b.ran.push_back('A');
    b.queue.submit(b.note('B'));  // needs the lock: deadlocks if the task ran under it
    b.queue.shutdown();
  });
  b.queue.runWorker();
  EXPECT_EQ(b.lock.misuse, 0);
  EXPECT_EQ(b.ran, std::string("AB"));
}

TEST(Locking, EveryPathReleasesTheLock) {
  Bench b;
  b.queue.submit(b.note('a'));
  b.queue.shutdown();
  b.queue.submit(b.note('b'));
  b.queue.runWorker();
  EXPECT_FALSE(b.lock.held());
  EXPECT_EQ(b.lock.misuse, 0);
}
