#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
class FakeClock : public rl::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 9000;
};

// Capacity 3. After ONE request, both algorithms are idle exactly 10 ticks later.
struct Both {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::vector<std::unique_ptr<rl::SweepableLimiter>> all;
  Both() {
    all.push_back(rl::makeSweepableTokenBucket(clock, 3, 10));
    all.push_back(rl::makeSweepableSlidingWindow(clock, 3, 10));
  }
};
}  // namespace

TEST(Tracking, KeysWithStateAreCounted) {
  Both b;
  for (auto& l : b.all) {
    EXPECT_EQ(l->trackedKeys(), 0);
    EXPECT_TRUE(l->tryAcquire("a").allowed);
    EXPECT_TRUE(l->tryAcquire("b").allowed);
    EXPECT_TRUE(l->tryAcquire("a").allowed);
    EXPECT_EQ(l->trackedKeys(), 2);
  }
}

TEST(Tracking, RequestsThatCanNeverSucceedCreateNoState) {
  Both b;
  for (auto& l : b.all) {
    EXPECT_FALSE(l->tryAcquire("a", 0).allowed);
    EXPECT_FALSE(l->tryAcquire("b", 4).allowed);
    EXPECT_EQ(l->trackedKeys(), 0);
  }
}

TEST(Sweep, IdleKeysAreForgottenAndCounted) {
  Both b;
  for (auto& l : b.all) {
    l->tryAcquire("a");
    l->tryAcquire("b");
    l->tryAcquire("c");
  }
  b.clock->advance(10);
  for (auto& l : b.all) {
    EXPECT_EQ(l->sweep(), 3);
    EXPECT_EQ(l->trackedKeys(), 0);
  }
}

TEST(Sweep, AKeyBecomesIdleAtTheExactTickNotBefore) {
  Both b;
  for (auto& l : b.all) l->tryAcquire("a");
  b.clock->advance(9);
  for (auto& l : b.all) {
    EXPECT_EQ(l->sweep(), 0);
    EXPECT_EQ(l->trackedKeys(), 1);
  }
  b.clock->advance(1);
  for (auto& l : b.all) EXPECT_EQ(l->sweep(), 1);
}

TEST(Sweep, OnlyIdleKeysAreForgotten) {
  Both b;
  for (auto& l : b.all) l->tryAcquire("old");
  b.clock->advance(6);
  for (auto& l : b.all) l->tryAcquire("recent");
  b.clock->advance(4);  // "old" is idle, "recent" is 4 ticks in
  for (auto& l : b.all) {
    EXPECT_EQ(l->sweep(), 1);
    EXPECT_EQ(l->trackedKeys(), 1);
  }
}

TEST(Sweep, ForgettingAnIdleKeyChangesNothingTheCallerCanSee) {
  Both b;
  for (auto& l : b.all) l->tryAcquire("a");
  b.clock->advance(10);
  for (auto& l : b.all) {
    l->sweep();
    EXPECT_TRUE(l->tryAcquire("a", 3).allowed);
    EXPECT_FALSE(l->tryAcquire("a", 1).allowed);
  }
}

TEST(Sweep, ADrainedBucketIsNotForgottenUntilItHasRefilled) {
  auto clock = std::make_shared<FakeClock>();
  auto limiter = rl::makeSweepableTokenBucket(clock, 3, 10);
  EXPECT_TRUE(limiter->tryAcquire("a", 3).allowed);
  clock->advance(10);  // one token back, two still missing
  EXPECT_EQ(limiter->sweep(), 0);
  EXPECT_EQ(limiter->trackedKeys(), 1);
  EXPECT_TRUE(limiter->tryAcquire("a", 1).allowed);
  EXPECT_FALSE(limiter->tryAcquire("a", 1).allowed);  // forgetting the key would have handed out a full bucket
  clock->advance(20);
  EXPECT_EQ(limiter->sweep(), 0);  // one token short of full: tokens at tick 10 consumed, 2 earned since, 1 missing
  clock->advance(10);
  EXPECT_EQ(limiter->sweep(), 1);
}

TEST(Sweep, AWindowKeyIsForgottenWhenItsLastRequestLeaves) {
  auto clock = std::make_shared<FakeClock>();
  auto limiter = rl::makeSweepableSlidingWindow(clock, 3, 10);
  EXPECT_TRUE(limiter->tryAcquire("a", 1).allowed);
  clock->advance(4);
  EXPECT_TRUE(limiter->tryAcquire("a", 2).allowed);
  clock->advance(6);  // tick 10: the first request left, the second has not
  EXPECT_EQ(limiter->sweep(), 0);
  EXPECT_EQ(limiter->tryAcquire("a", 2).retryAfter, 4);
  clock->advance(4);  // tick 14: the second request left
  EXPECT_EQ(limiter->sweep(), 1);
}

TEST(Sweep, SweepingAnEmptyLimiterForgetsNothing) {
  Both b;
  for (auto& l : b.all) EXPECT_EQ(l->sweep(), 0);
}

TEST(Reset, ResettingAKeyRestoresItsFullAllowanceAndLeavesOthersAlone) {
  Both b;
  for (auto& l : b.all) {
    EXPECT_TRUE(l->tryAcquire("a", 3).allowed);
    EXPECT_TRUE(l->tryAcquire("b", 3).allowed);
    EXPECT_FALSE(l->tryAcquire("a", 1).allowed);
    EXPECT_TRUE(l->reset("a"));
    EXPECT_EQ(l->trackedKeys(), 1);
    EXPECT_TRUE(l->tryAcquire("a", 3).allowed);
    EXPECT_FALSE(l->tryAcquire("b", 1).allowed);  // b was not reset
  }
}

TEST(Reset, ResettingAnUnknownKeyReportsFalse) {
  Both b;
  for (auto& l : b.all) {
    EXPECT_FALSE(l->reset("nobody"));
    EXPECT_TRUE(l->tryAcquire("a").allowed);
    EXPECT_TRUE(l->reset("a"));
    EXPECT_FALSE(l->reset("a"));
  }
}
