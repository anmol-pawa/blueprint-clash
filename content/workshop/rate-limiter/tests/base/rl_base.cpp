#include <memory>
#include <string>

#include "api.h"
#include "bp_test.h"

namespace {
class FakeClock : public rl::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<rl::RateLimiter> limiter;
  Fixture(long long capacity, long long refillTicks) : limiter(rl::makeTokenBucket(clock, capacity, refillTicks)) {}
  bool allow(const std::string& key, long long cost = 1) { return limiter->tryAcquire(key, cost).allowed; }
};
}  // namespace

TEST(Burst, AFreshKeyStartsWithAFullBucket) {
  Fixture f(3, 10);
  const rl::Decision first = f.limiter->tryAcquire("u", 1);
  EXPECT_TRUE(first.allowed);
  EXPECT_EQ(first.remaining, 2);
  EXPECT_EQ(first.retryAfter, 0);
  EXPECT_EQ(f.limiter->tryAcquire("u", 1).remaining, 1);
  EXPECT_EQ(f.limiter->tryAcquire("u", 1).remaining, 0);
  const rl::Decision fourth = f.limiter->tryAcquire("u", 1);
  EXPECT_FALSE(fourth.allowed);
  EXPECT_EQ(fourth.remaining, 0);
}

TEST(Burst, ARefusedRequestUsesUpNothing) {
  Fixture f(2, 10);
  EXPECT_TRUE(f.allow("u"));
  EXPECT_TRUE(f.allow("u"));
  EXPECT_FALSE(f.allow("u"));
  EXPECT_FALSE(f.allow("u"));
  f.clock->advance(10);
  EXPECT_TRUE(f.allow("u"));
  EXPECT_FALSE(f.allow("u"));
}

TEST(Burst, ACostUsesSeveralTokensAtOnce) {
  Fixture f(5, 10);
  const rl::Decision a = f.limiter->tryAcquire("u", 3);
  EXPECT_TRUE(a.allowed);
  EXPECT_EQ(a.remaining, 2);
  const rl::Decision b = f.limiter->tryAcquire("u", 3);
  EXPECT_FALSE(b.allowed);
  EXPECT_EQ(b.remaining, 2);
  EXPECT_TRUE(f.allow("u", 2));
  EXPECT_EQ(f.limiter->tryAcquire("u", 1).remaining, 0);
}

TEST(Burst, KeysDoNotShareTokens) {
  Fixture f(1, 10);
  EXPECT_TRUE(f.allow("alice"));
  EXPECT_FALSE(f.allow("alice"));
  EXPECT_TRUE(f.allow("bob"));
  EXPECT_FALSE(f.allow("bob"));
}

TEST(Cost, ImpossibleCostsAreRefusedForeverAndChangeNothing) {
  Fixture f(3, 10);
  for (const long long cost : {0LL, -2LL, 4LL, 1000LL}) {
    const rl::Decision d = f.limiter->tryAcquire("u", cost);
    EXPECT_FALSE(d.allowed);
    EXPECT_EQ(d.remaining, 0);
    EXPECT_EQ(d.retryAfter, -1);
  }
  EXPECT_TRUE(f.allow("u"));
  EXPECT_TRUE(f.allow("u"));
  EXPECT_TRUE(f.allow("u"));
  EXPECT_FALSE(f.allow("u"));
}

TEST(Cost, TheWholeCapacityCanBeSpentInOneRequest) {
  Fixture f(4, 10);
  EXPECT_TRUE(f.allow("u", 4));
  EXPECT_FALSE(f.allow("u", 1));
}

TEST(Refill, OneTokenArrivesPerInterval) {
  Fixture f(2, 10);
  EXPECT_TRUE(f.allow("u"));
  EXPECT_TRUE(f.allow("u"));
  f.clock->advance(9);
  EXPECT_FALSE(f.allow("u"));
  f.clock->advance(1);
  EXPECT_TRUE(f.allow("u"));
  EXPECT_FALSE(f.allow("u"));
}

TEST(Refill, TheBucketNeverHoldsMoreThanItsCapacity) {
  Fixture f(3, 10);
  EXPECT_TRUE(f.allow("u"));
  f.clock->advance(1000);
  EXPECT_TRUE(f.allow("u"));
  EXPECT_TRUE(f.allow("u"));
  EXPECT_TRUE(f.allow("u"));
  EXPECT_FALSE(f.allow("u"));
}

TEST(Refill, ProgressTowardsTheNextTokenIsKeptBetweenCalls) {
  Fixture f(2, 10);
  EXPECT_TRUE(f.allow("u", 2));  // tick 0: empty, next token at 10
  f.clock->advance(7);
  EXPECT_FALSE(f.allow("u"));    // tick 7: asking must not restart the clock
  f.clock->advance(7);
  EXPECT_TRUE(f.allow("u"));     // tick 14: the token from tick 10 is there
  f.clock->advance(5);
  EXPECT_FALSE(f.allow("u"));    // tick 19: the next one is due at 20
  f.clock->advance(1);
  EXPECT_TRUE(f.allow("u"));     // tick 20
}

TEST(Refill, ATimeAwayFromFullIsNotBankedAsExtraTokens) {
  Fixture f(2, 10);
  EXPECT_TRUE(f.allow("u"));     // tick 0: one token left
  f.clock->advance(95);          // full again since tick 10
  EXPECT_TRUE(f.allow("u", 2));  // tick 95: empty, next token at 105
  f.clock->advance(5);
  EXPECT_FALSE(f.allow("u"));    // tick 100: only 5 ticks since the bucket emptied
  f.clock->advance(5);
  EXPECT_TRUE(f.allow("u"));     // tick 105
}

TEST(Refill, RemainingReflectsTokensEarnedWhileWaiting) {
  Fixture f(5, 10);
  EXPECT_TRUE(f.allow("u", 5));
  f.clock->advance(20);
  const rl::Decision d = f.limiter->tryAcquire("u", 1);
  EXPECT_TRUE(d.allowed);
  EXPECT_EQ(d.remaining, 1);
}

TEST(Retry, RetryAfterCountsDownToTheNextToken) {
  Fixture f(1, 10);
  EXPECT_TRUE(f.allow("u"));
  EXPECT_EQ(f.limiter->tryAcquire("u", 1).retryAfter, 10);
  f.clock->advance(4);
  EXPECT_EQ(f.limiter->tryAcquire("u", 1).retryAfter, 6);
}

TEST(Retry, RetryAfterForABigCostCountsAllMissingTokensAndKeepsProgress) {
  Fixture f(5, 10);
  EXPECT_TRUE(f.allow("u", 5));
  f.clock->advance(15);  // one token, five ticks into the next
  const rl::Decision d = f.limiter->tryAcquire("u", 3);
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.remaining, 1);
  EXPECT_EQ(d.retryAfter, 15);  // two more tokens: 5 ticks to the next, 10 more for the one after
}

TEST(Retry, WaitingForExactlyRetryAfterMakesTheRequestSucceed) {
  Fixture f(4, 7);
  EXPECT_TRUE(f.allow("u", 4));
  f.clock->advance(3);
  const rl::Decision refused = f.limiter->tryAcquire("u", 3);
  EXPECT_FALSE(refused.allowed);
  f.clock->advance(refused.retryAfter - 1);
  EXPECT_FALSE(f.allow("u", 3));
  f.clock->advance(1);
  EXPECT_TRUE(f.allow("u", 3));
}

TEST(Config, BadConfigurationYieldsNoLimiter) {
  auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(rl::makeTokenBucket(clock, 1, 1) != nullptr);
  EXPECT_TRUE(rl::makeTokenBucket(nullptr, 1, 1) == nullptr);
  EXPECT_TRUE(rl::makeTokenBucket(clock, 0, 10) == nullptr);
  EXPECT_TRUE(rl::makeTokenBucket(clock, 5, 0) == nullptr);
  EXPECT_TRUE(rl::makeTokenBucket(clock, -1, 10) == nullptr);
}

TEST(Config, ManyKeysKeepTheirOwnState) {
  Fixture f(2, 10);
  for (int i = 0; i < 200; ++i) EXPECT_TRUE(f.allow("k" + std::to_string(i), 2));
  for (int i = 0; i < 200; ++i) EXPECT_FALSE(f.allow("k" + std::to_string(i)));
}
