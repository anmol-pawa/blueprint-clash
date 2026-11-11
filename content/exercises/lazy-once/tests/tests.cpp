#include <functional>
#include "bp_test.h"
#include "solution.h"

namespace {
class SpyLock final : public Lock {
 public:
  void lock() override {
    if (beforeAcquire) {  // "another thread got in first": runs once, before this caller owns the lock
      std::function<void()> hook = beforeAcquire;
      beforeAcquire = nullptr;
      hook();
    }
    if (held_) ++misuse;
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
  std::function<void()> beforeAcquire;

 private:
  bool held_ = false;
};

class FakeLoader final : public Loader {
 public:
  bool load(int& out) override {
    ++calls;
    if (failuresLeft > 0) {
      --failuresLeft;
      return false;
    }
    out = 42;
    return true;
  }
  int calls = 0;
  int failuresLeft = 0;
};

struct Bench {
  SpyLock lock;
  FakeLoader loader;
  LazyValue lazy{lock, loader};
};
}  // namespace

TEST(Once, FirstGetLoadsTheValue) {
  Bench b;
  int v = 0;
  EXPECT_TRUE(b.lazy.get(v));
  EXPECT_EQ(v, 42);
  EXPECT_EQ(b.loader.calls, 1);
  EXPECT_EQ(b.lock.acquisitions, 1);
}

TEST(Once, LoadsOnlyOnceAcrossManyCalls) {
  Bench b;
  int v = 0;
  for (int i = 0; i < 5; ++i) {
    v = 0;
    EXPECT_TRUE(b.lazy.get(v));
    EXPECT_EQ(v, 42);
  }
  EXPECT_EQ(b.loader.calls, 1);
}

TEST(Once, TheLoserOfTheRaceDoesNotLoadAgain) {
  Bench b;
  // While this caller waits for the lock, another caller runs get() to completion.
  b.lock.beforeAcquire = [&] {
    int other = 0;
    b.lazy.get(other);
  };
  int v = 0;
  EXPECT_TRUE(b.lazy.get(v));
  EXPECT_EQ(v, 42);
  EXPECT_EQ(b.loader.calls, 1);
  EXPECT_FALSE(b.lock.held());
  EXPECT_EQ(b.lock.misuse, 0);
}

TEST(Once, AFailedLoadIsNotCached) {
  Bench b;
  b.loader.failuresLeft = 1;
  int v = -1;
  EXPECT_FALSE(b.lazy.get(v));
  EXPECT_EQ(v, -1);  // nothing handed out for a failed load
  EXPECT_TRUE(b.lazy.get(v));
  EXPECT_EQ(v, 42);
  EXPECT_EQ(b.loader.calls, 2);
}

TEST(Locking, WarmReadsDoNotTakeTheLock) {
  Bench b;
  int v = 0;
  b.lazy.get(v);
  const int afterFirst = b.lock.acquisitions;
  for (int i = 0; i < 100; ++i) b.lazy.get(v);
  EXPECT_EQ(b.lock.acquisitions, afterFirst);
}

TEST(Locking, AFailedLoadReleasesTheLock) {
  Bench b;
  b.loader.failuresLeft = 1;
  int v = 0;
  b.lazy.get(v);
  EXPECT_FALSE(b.lock.held());
  EXPECT_EQ(b.lock.misuse, 0);
}

TEST(Locking, ASuccessfulLoadReleasesTheLock) {
  Bench b;
  int v = 0;
  b.lazy.get(v);
  EXPECT_FALSE(b.lock.held());
  EXPECT_EQ(b.lock.misuse, 0);
}
