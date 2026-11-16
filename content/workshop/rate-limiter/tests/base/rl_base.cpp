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
  explicit Fixture(rl::Limit limit) : limiter(rl::makeLimiter(clock, limit)) {}
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<rl::RateLimiter> limiter;

  bool ok(const std::string& client = "a", long long permits = 1) { return limiter->tryAcquire(client, permits).allowed; }
  long long wait(const std::string& client = "a", long long permits = 1) { return limiter->tryAcquire(client, permits).retryAfter; }
};
}  // namespace

TEST(Bucket, AClientStartsWithAFullBucket) {
  Fixture f({5, 10});
  for (int i = 0; i < 5; ++i) EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
}

TEST(Bucket, AGrantedRequestHasNothingToWaitFor) {
  Fixture f({2, 10});
  const rl::Decision d = f.limiter->tryAcquire("a");
  EXPECT_TRUE(d.allowed);
  EXPECT_EQ(d.retryAfter, 0);
}

TEST(Bucket, ARefusalSaysHowLongToWait) {
  Fixture f({2, 10});
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  EXPECT_EQ(f.wait(), 10);
  f.clock->advance(4);
  EXPECT_EQ(f.wait(), 6);
  f.clock->advance(6);
  EXPECT_TRUE(f.ok());
}

TEST(Bucket, TheAdvertisedWaitIsExactlyRight) {
  Fixture f({3, 7});
  for (int i = 0; i < 3; ++i) EXPECT_TRUE(f.ok());
  const long long wait = f.wait();
  EXPECT_EQ(wait, 7);
  f.clock->advance(wait - 1);
  EXPECT_FALSE(f.ok());
  f.clock->advance(1);
  EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
}

TEST(Bucket, OneTokenComesBackPerInterval) {
  Fixture f({3, 10});
  for (int i = 0; i < 3; ++i) EXPECT_TRUE(f.ok());
  f.clock->advance(10);
  EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
  f.clock->advance(20);
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
}

TEST(Bucket, ARefusedRequestDoesNotRestartTheCountdown) {
  Fixture f({1, 10});
  EXPECT_TRUE(f.ok());
  f.clock->advance(7);
  EXPECT_FALSE(f.ok());
  f.clock->advance(3);
  EXPECT_TRUE(f.ok());
}

TEST(Bucket, PartOfAnIntervalIsNotLostWhenTokensAreEarned) {
  Fixture f({3, 10});
  for (int i = 0; i < 3; ++i) EXPECT_TRUE(f.ok());
  f.clock->advance(25);
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  EXPECT_EQ(f.wait(), 5);
  f.clock->advance(5);
  EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
}

TEST(Bucket, IdleTimeIsNeverBankedBeyondTheCapacity) {
  Fixture f({3, 10});
  EXPECT_TRUE(f.ok());
  f.clock->advance(100000);
  for (int i = 0; i < 3; ++i) EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
}

TEST(Bucket, TheCountdownStartsWhenATokenIsFirstTakenFromAFullBucket) {
  Fixture f({2, 10});
  f.clock->advance(500);
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  const rl::Decision d = f.limiter->tryAcquire("a");
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, 10);
}

TEST(Bucket, ARefusalWaitsOnlyForTheTimeStillOwed) {
  Fixture f({1, 10});
  EXPECT_TRUE(f.ok());
  f.clock->advance(3);
  EXPECT_EQ(f.wait(), 7);
}

TEST(Clients, EachClientHasItsOwnBucket) {
  Fixture f({2, 10});
  EXPECT_TRUE(f.ok("alice"));
  EXPECT_TRUE(f.ok("alice"));
  EXPECT_FALSE(f.ok("alice"));
  EXPECT_TRUE(f.ok("bob"));
  EXPECT_TRUE(f.ok("bob"));
  EXPECT_FALSE(f.ok("bob"));
}

TEST(Clients, TheEmptyStringIsAnOrdinaryClient) {
  Fixture f({1, 10});
  EXPECT_TRUE(f.ok(""));
  EXPECT_FALSE(f.ok(""));
  EXPECT_TRUE(f.ok("a"));
}

TEST(Permits, SeveralPermitsAreTakenTogether) {
  Fixture f({5, 10});
  EXPECT_TRUE(f.ok("a", 3));
  EXPECT_TRUE(f.ok("a", 2));
  EXPECT_FALSE(f.ok("a", 1));
}

TEST(Permits, ARefusedRequestTakesNothing) {
  Fixture f({5, 100});
  EXPECT_TRUE(f.ok("a", 3));
  EXPECT_FALSE(f.ok("a", 3));
  EXPECT_TRUE(f.ok("a", 2));
}

TEST(Permits, TheWaitCoversAllTheMissingTokens) {
  Fixture f({5, 10});
  EXPECT_TRUE(f.ok("a", 5));
  EXPECT_EQ(f.wait("a", 3), 30);
  f.clock->advance(12);
  EXPECT_EQ(f.wait("a", 3), 18);
  f.clock->advance(18);
  EXPECT_TRUE(f.ok("a", 3));
}

TEST(Permits, MoreThanTheCapacityCanNeverBeGranted) {
  Fixture f({5, 10});
  const rl::Decision d = f.limiter->tryAcquire("a", 6);
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, rl::Decision::kNever);
  EXPECT_TRUE(f.ok("a", 5));
}

TEST(Permits, ZeroOrNegativePermitsAreRefusedAndChangeNothing) {
  Fixture f({2, 10});
  EXPECT_FALSE(f.ok("a", 0));
  EXPECT_FALSE(f.ok("a", -3));
  EXPECT_EQ(f.wait("a", 0), 0);
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  EXPECT_FALSE(f.ok());
}

TEST(Factory, InvalidArgumentsGiveNoLimiter) {
  auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(rl::makeLimiter(nullptr, {1, 1}) == nullptr);
  EXPECT_TRUE(rl::makeLimiter(clock, {0, 1}) == nullptr);
  EXPECT_TRUE(rl::makeLimiter(clock, {1, 0}) == nullptr);
  EXPECT_TRUE(rl::makeLimiter(clock, {-1, 5}) == nullptr);
  EXPECT_TRUE(rl::makeLimiter(clock, {1, 1}) != nullptr);
}
