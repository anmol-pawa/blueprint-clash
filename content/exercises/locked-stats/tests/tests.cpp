#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
// Records every call. A real lock would block; this one just counts and checks for misuse.
class SpyLock final : public Lock {
 public:
  void lock() override {
    if (held_) ++misuse;  // non-recursive: locking twice would deadlock for real
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
  int acquisitions = 0;
  int misuse = 0;

 private:
  bool held_ = false;
};
}  // namespace

TEST(Stats, RecordsCountSumAndMax) {
  SpyLock lock;
  SafeStats stats(lock);
  EXPECT_TRUE(stats.record(30));
  EXPECT_TRUE(stats.record(10));
  EXPECT_TRUE(stats.record(20));
  const Stats s = stats.snapshot();
  EXPECT_EQ(s.count, 3LL);
  EXPECT_EQ(s.sum, 60LL);
  EXPECT_EQ(s.max, 30);
}

TEST(Stats, NegativeValueIsRejectedAndChangesNothing) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.record(5);
  EXPECT_FALSE(stats.record(-1));
  const Stats s = stats.snapshot();
  EXPECT_EQ(s.count, 1LL);
  EXPECT_EQ(s.sum, 5LL);
}

TEST(Stats, ResetClearsEverything) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.recordAll({4, 9});
  stats.reset();
  const Stats s = stats.snapshot();
  EXPECT_EQ(s.count, 0LL);
  EXPECT_EQ(s.sum, 0LL);
  EXPECT_EQ(s.max, 0);
}

TEST(Stats, RecordAllCountsOnlyValidValues) {
  SpyLock lock;
  SafeStats stats(lock);
  EXPECT_EQ(stats.recordAll({7, -3, 2, -1, 9}), static_cast<std::size_t>(3));
  const Stats s = stats.snapshot();
  EXPECT_EQ(s.count, 3LL);
  EXPECT_EQ(s.sum, 18LL);
  EXPECT_EQ(s.max, 9);
}

TEST(Locking, RecordTakesTheLock) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.record(1);
  EXPECT_EQ(lock.acquisitions, 1);
}

TEST(Locking, SnapshotTakesTheLockToo) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.record(1);
  const int before = lock.acquisitions;
  (void)stats.snapshot();
  EXPECT_EQ(lock.acquisitions, before + 1);
}

TEST(Locking, ResetTakesTheLock) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.reset();
  EXPECT_EQ(lock.acquisitions, 1);
}

TEST(Locking, LockIsReleasedAfterEveryCall) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.record(3);
  EXPECT_FALSE(lock.held());
  (void)stats.snapshot();
  EXPECT_FALSE(lock.held());
  stats.recordAll({1, 2});
  EXPECT_FALSE(lock.held());
  stats.reset();
  EXPECT_FALSE(lock.held());
  EXPECT_EQ(lock.misuse, 0);
}

TEST(Locking, RejectedRecordStillReleasesTheLock) {
  SpyLock lock;
  SafeStats stats(lock);
  EXPECT_FALSE(stats.record(-5));
  EXPECT_FALSE(lock.held());
  EXPECT_TRUE(stats.record(5));  // would deadlock for real if the previous call leaked the lock
  EXPECT_EQ(lock.misuse, 0);
}

TEST(Locking, BatchIsOneCriticalSection) {
  SpyLock lock;
  SafeStats stats(lock);
  stats.recordAll({1, 2, 3, 4, 5, 6});
  EXPECT_EQ(lock.acquisitions, 1);
}

TEST(Locking, EmptyBatchIsHarmless) {
  SpyLock lock;
  SafeStats stats(lock);
  EXPECT_EQ(stats.recordAll({}), static_cast<std::size_t>(0));
  EXPECT_FALSE(lock.held());
  EXPECT_EQ(stats.snapshot().count, 0LL);
}
