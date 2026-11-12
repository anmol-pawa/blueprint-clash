#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
class FakeClock : public rl::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 5000;
};

struct Window {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<rl::RateLimiter> limiter;
  Window(long long maxUnits, long long windowTicks) : limiter(rl::makeSlidingWindow(clock, maxUnits, windowTicks)) {}
  bool allow(const std::string& key, long long cost = 1) { return limiter->tryAcquire(key, cost).allowed; }
};
}  // namespace

TEST(Window, AtMostMaxUnitsInOneWindow) {
  Window w(3, 10);
  const rl::Decision a = w.limiter->tryAcquire("u", 1);
  EXPECT_TRUE(a.allowed);
  EXPECT_EQ(a.remaining, 2);
  EXPECT_TRUE(w.allow("u"));
  EXPECT_EQ(w.limiter->tryAcquire("u", 1).remaining, 0);
  const rl::Decision refused = w.limiter->tryAcquire("u", 1);
  EXPECT_FALSE(refused.allowed);
  EXPECT_EQ(refused.remaining, 0);
}

TEST(Window, ARequestLeavesTheWindowExactlyWindowTicksLater) {
  Window w(1, 10);
  EXPECT_TRUE(w.allow("u"));
  w.clock->advance(9);
  EXPECT_FALSE(w.allow("u"));
  w.clock->advance(1);
  EXPECT_TRUE(w.allow("u"));
}

TEST(Window, TheWindowSlidesInsteadOfResettingAllAtOnce) {
  Window w(3, 10);
  EXPECT_TRUE(w.allow("u"));  // tick 0
  w.clock->advance(5);
  EXPECT_TRUE(w.allow("u"));  // tick 5
  EXPECT_TRUE(w.allow("u"));  // tick 5
  w.clock->advance(5);        // tick 10: only the first request has left
  EXPECT_TRUE(w.allow("u"));
  EXPECT_FALSE(w.allow("u"));
  w.clock->advance(5);        // tick 15: the two from tick 5 have left
  EXPECT_TRUE(w.allow("u"));
  EXPECT_TRUE(w.allow("u"));
  EXPECT_FALSE(w.allow("u"));
}

TEST(Window, RefusedRequestsAreNotRecorded) {
  Window w(1, 10);
  EXPECT_TRUE(w.allow("u"));
  w.clock->advance(5);
  EXPECT_FALSE(w.allow("u"));
  EXPECT_FALSE(w.allow("u"));
  w.clock->advance(5);  // tick 10: the allowed request has left, the refused ones never counted
  EXPECT_TRUE(w.allow("u"));
}

TEST(Window, ACostCountsAsThatManyUnits) {
  Window w(5, 10);
  EXPECT_TRUE(w.allow("u", 3));
  w.clock->advance(4);
  const rl::Decision b = w.limiter->tryAcquire("u", 2);
  EXPECT_TRUE(b.allowed);
  EXPECT_EQ(b.remaining, 0);
  w.clock->advance(1);
  EXPECT_FALSE(w.allow("u", 1));
  w.clock->advance(5);  // tick 10: the cost-3 request has left
  EXPECT_TRUE(w.allow("u", 3));
  EXPECT_FALSE(w.allow("u", 1));
}

TEST(Window, RetryAfterIsWhenEnoughUnitsHaveLeft) {
  Window w(5, 10);
  EXPECT_TRUE(w.allow("u", 3));  // tick 0, leaves at 10
  w.clock->advance(4);
  EXPECT_TRUE(w.allow("u", 2));  // tick 4, leaves at 14
  w.clock->advance(1);           // tick 5
  EXPECT_EQ(w.limiter->tryAcquire("u", 1).retryAfter, 5);  // the first request frees 3 units
  EXPECT_EQ(w.limiter->tryAcquire("u", 3).retryAfter, 5);
  EXPECT_EQ(w.limiter->tryAcquire("u", 4).retryAfter, 9);  // needs the second request to leave as well
  EXPECT_EQ(w.limiter->tryAcquire("u", 5).retryAfter, 9);
}

TEST(Window, WaitingForRetryAfterMakesTheRequestSucceed) {
  Window w(4, 10);
  EXPECT_TRUE(w.allow("u", 1));
  w.clock->advance(2);
  EXPECT_TRUE(w.allow("u", 3));
  w.clock->advance(1);
  const rl::Decision refused = w.limiter->tryAcquire("u", 2);
  EXPECT_FALSE(refused.allowed);
  EXPECT_EQ(refused.remaining, 0);
  w.clock->advance(refused.retryAfter - 1);
  EXPECT_FALSE(w.allow("u", 2));
  w.clock->advance(1);
  EXPECT_TRUE(w.allow("u", 2));
}

TEST(Window, KeysHaveSeparateWindows) {
  Window w(1, 10);
  EXPECT_TRUE(w.allow("alice"));
  EXPECT_FALSE(w.allow("alice"));
  EXPECT_TRUE(w.allow("bob"));
}

TEST(Window, ImpossibleCostsAreRefusedForeverAndRecordNothing) {
  Window w(3, 10);
  for (const long long cost : {0LL, -1LL, 4LL}) {
    const rl::Decision d = w.limiter->tryAcquire("u", cost);
    EXPECT_FALSE(d.allowed);
    EXPECT_EQ(d.remaining, 0);
    EXPECT_EQ(d.retryAfter, -1);
  }
  EXPECT_TRUE(w.allow("u", 3));
}

TEST(Window, BadConfigurationYieldsNoLimiter) {
  auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(rl::makeSlidingWindow(clock, 1, 1) != nullptr);
  EXPECT_TRUE(rl::makeSlidingWindow(nullptr, 1, 1) == nullptr);
  EXPECT_TRUE(rl::makeSlidingWindow(clock, 0, 10) == nullptr);
  EXPECT_TRUE(rl::makeSlidingWindow(clock, 3, 0) == nullptr);
}

TEST(Window, BothAlgorithmsAreUsedThroughTheSameInterface) {
  auto clock = std::make_shared<FakeClock>();
  std::unique_ptr<rl::RateLimiter> limiters[] = {rl::makeTokenBucket(clock, 2, 10), rl::makeSlidingWindow(clock, 2, 10)};
  for (auto& limiter : limiters) {
    EXPECT_TRUE(limiter->tryAcquire("u").allowed);
    EXPECT_TRUE(limiter->tryAcquire("u").allowed);
    EXPECT_FALSE(limiter->tryAcquire("u").allowed);
  }
}

TEST(Window, ABurstAtTheEdgeOfTwoFixedWindowsIsStillLimited) {
  // A fixed-window counter lets 3 through at tick 9 and 3 more at tick 10; a sliding window must not.
  Window w(3, 10);
  w.clock->advance(9);
  EXPECT_TRUE(w.allow("u"));
  EXPECT_TRUE(w.allow("u"));
  EXPECT_TRUE(w.allow("u"));
  w.clock->advance(1);
  EXPECT_FALSE(w.allow("u"));
}
