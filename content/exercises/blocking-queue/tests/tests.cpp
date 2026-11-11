#include <cstddef>
#include <functional>
#include "bp_test.h"
#include "solution.h"

namespace {
class SpyLock final : public Lock {
 public:
  void lock() override {
    if (held_) ++misuse;  // non-recursive
    held_ = true;
    ++acquisitions;
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
  int acquisitions = 0;

 private:
  bool held_ = false;
};

// wait() checks the caller owns the lock, releases it, lets "another thread" run a script step, and re-takes it.
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
  void notifyOne() override { ++notifies; }
  void notifyAll() override { ++notifies; }
  int waits = 0;
  int notifies = 0;
  std::function<void(int)> onWake;

 private:
  SpyLock& lock_;
};

struct Bench {
  explicit Bench(std::size_t capacity) : queue(capacity, lock, notFull, notEmpty) {}
  // Both conditions get the same script, so waiting on the wrong one is caught by the wait counts, not by a hang.
  void script(const std::function<void(int)>& step) {
    notFull.onWake = step;
    notEmpty.onWake = step;
  }
  SpyLock lock;
  SpyCondition notFull{lock};
  SpyCondition notEmpty{lock};
  BoundedQueue queue;
};
}  // namespace

TEST(Queue, KeepsFirstInFirstOut) {
  Bench b(3);
  b.queue.push(1);
  b.queue.push(2);
  b.queue.push(3);
  EXPECT_EQ(b.queue.size(), static_cast<std::size_t>(3));
  EXPECT_EQ(b.queue.pop(), 1);
  EXPECT_EQ(b.queue.pop(), 2);
  EXPECT_EQ(b.queue.pop(), 3);
  EXPECT_EQ(b.queue.size(), static_cast<std::size_t>(0));
}

TEST(Queue, ReusesSlotsAfterWrappingAround) {
  Bench b(2);
  b.queue.push(1);
  b.queue.push(2);
  EXPECT_EQ(b.queue.pop(), 1);
  b.queue.push(3);
  EXPECT_EQ(b.queue.pop(), 2);
  EXPECT_EQ(b.queue.pop(), 3);
}

TEST(Queue, DoesNotWaitWhenThereIsRoomOrAnItem) {
  Bench b(2);
  b.queue.push(1);
  b.queue.pop();
  EXPECT_EQ(b.notFull.waits, 0);
  EXPECT_EQ(b.notEmpty.waits, 0);
}

TEST(Blocking, PopWaitsUntilAnItemArrives) {
  Bench b(2);
  // Wake-up 1 is spurious (nothing changed); wake-up 2 is a producer delivering 7.
  b.script([&](int n) {
    if (n == 2) b.queue.push(7);
  });
  EXPECT_EQ(b.queue.pop(), 7);
  EXPECT_EQ(b.notEmpty.waits, 2);
  EXPECT_EQ(b.notFull.waits, 0);
  EXPECT_EQ(b.queue.size(), static_cast<std::size_t>(0));
}

TEST(Blocking, PushWaitsUntilSpaceAppears) {
  Bench b(1);
  b.queue.push(1);
  // Wake-up 1 is spurious; wake-up 2 is a consumer taking the only item.
  b.script([&](int n) {
    if (n == 2) b.queue.pop();
  });
  b.queue.push(2);
  EXPECT_EQ(b.notFull.waits, 2);
  EXPECT_EQ(b.notEmpty.waits, 0);
  EXPECT_EQ(b.queue.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(b.queue.pop(), 2);
}

TEST(Signalling, PushWakesAConsumerAndPopWakesAProducer) {
  Bench b(2);
  b.queue.push(1);
  EXPECT_TRUE(b.notEmpty.notifies >= 1);
  EXPECT_EQ(b.notFull.notifies, 0);
  b.queue.pop();
  EXPECT_TRUE(b.notFull.notifies >= 1);
}

TEST(Locking, PushAndPopTakeTheLock) {
  Bench b(2);
  b.queue.push(1);
  EXPECT_TRUE(b.lock.acquisitions >= 1);
  const int afterPush = b.lock.acquisitions;
  b.queue.pop();
  EXPECT_TRUE(b.lock.acquisitions > afterPush);
}

TEST(Locking, WaitingHoldsTheLockAndReleasesItAfter) {
  Bench b(1);
  b.script([&](int n) {
    if (n == 1) b.queue.push(5);
  });
  EXPECT_EQ(b.queue.pop(), 5);  // wait() flags a call made without owning the lock
  EXPECT_EQ(b.lock.misuse, 0);
  EXPECT_FALSE(b.lock.held());
  b.queue.push(6);
  EXPECT_FALSE(b.lock.held());
  EXPECT_EQ(b.lock.misuse, 0);
}
