#include <memory>
#include <string>

#include "api_storm2.h"
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
  Fixture(rl::Limit perClient, rl::Limit global) : limiter(rl::makeLayeredLimiter(clock, perClient, global)) {}
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<rl::RateLimiter> limiter;

  bool ok(const std::string& client, long long permits = 1) { return limiter->tryAcquire(client, permits).allowed; }
  rl::Decision ask(const std::string& client, long long permits = 1) { return limiter->tryAcquire(client, permits); }
};
}  // namespace

TEST(Layered, TheFactoryRefusesInvalidArguments) {
  auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(rl::makeLayeredLimiter(nullptr, {1, 1}, {1, 1}) == nullptr);
  EXPECT_TRUE(rl::makeLayeredLimiter(clock, {0, 1}, {1, 1}) == nullptr);
  EXPECT_TRUE(rl::makeLayeredLimiter(clock, {1, 1}, {1, 0}) == nullptr);
  EXPECT_TRUE(rl::makeLayeredLimiter(clock, {1, 1}, {1, 1}) != nullptr);
}

TEST(Layered, ClientsShareTheGlobalBucket) {
  Fixture f({5, 100}, {3, 10});
  EXPECT_TRUE(f.ok("a"));
  EXPECT_TRUE(f.ok("a"));
  EXPECT_TRUE(f.ok("b"));
  const rl::Decision d = f.ask("c");
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, 10);
}

TEST(Layered, TheClientBucketStillLimitsEachClient) {
  Fixture f({1, 100}, {10, 10});
  EXPECT_TRUE(f.ok("a"));
  const rl::Decision d = f.ask("a");
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, 100);
  EXPECT_TRUE(f.ok("b"));
}

TEST(Layered, ARefusalByTheClientBucketDoesNotChargeTheGlobalOne) {
  Fixture f({1, 100}, {3, 1000});
  EXPECT_TRUE(f.ok("a"));
  for (int i = 0; i < 5; ++i) EXPECT_FALSE(f.ok("a"));
  EXPECT_TRUE(f.ok("b"));
  EXPECT_TRUE(f.ok("c"));
}

TEST(Layered, ARefusalByTheGlobalBucketDoesNotChargeTheClientOne) {
  Fixture f({2, 1000}, {1, 10});
  EXPECT_TRUE(f.ok("a"));
  EXPECT_FALSE(f.ok("a"));
  f.clock->advance(10);
  EXPECT_TRUE(f.ok("a"));
  f.clock->advance(10);
  EXPECT_FALSE(f.ok("a"));
}

TEST(Layered, WhenBothRefuseTheWaitIsTheLongerOne) {
  Fixture clientSlower({1, 50}, {1, 30});
  EXPECT_TRUE(clientSlower.ok("a"));
  const rl::Decision first = clientSlower.ask("a");
  EXPECT_FALSE(first.allowed);
  EXPECT_EQ(first.retryAfter, 50);

  Fixture globalSlower({1, 30}, {1, 50});
  EXPECT_TRUE(globalSlower.ok("a"));
  const rl::Decision second = globalSlower.ask("a");
  EXPECT_FALSE(second.allowed);
  EXPECT_EQ(second.retryAfter, 50);
}

TEST(Layered, WhenOnlyTheSlowerOneRefusesItsWaitIsReported) {
  Fixture f({1, 20}, {4, 60});
  EXPECT_TRUE(f.ok("a"));
  EXPECT_TRUE(f.ok("b"));
  EXPECT_TRUE(f.ok("c"));
  EXPECT_TRUE(f.ok("d"));
  f.clock->advance(5);
  const rl::Decision d = f.ask("a");
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, 55);
}

TEST(Layered, AWaitThatIsHonestForBothLayers) {
  Fixture f({1, 20}, {2, 30});
  EXPECT_TRUE(f.ok("a"));
  EXPECT_TRUE(f.ok("b"));
  const long long wait = f.ask("a").retryAfter;
  EXPECT_EQ(wait, 30);
  f.clock->advance(wait - 1);
  EXPECT_FALSE(f.ok("a"));
  f.clock->advance(1);
  EXPECT_TRUE(f.ok("a"));
}

TEST(Layered, AskingForMoreThanEitherBucketCanHoldIsNeverGranted) {
  Fixture f({5, 10}, {3, 10});
  const rl::Decision d = f.ask("a", 4);
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, rl::Decision::kNever);
  EXPECT_TRUE(f.ok("a", 3));
}

TEST(Layered, ZeroPermitsAreRefusedWithoutCharging) {
  Fixture f({1, 100}, {1, 100});
  EXPECT_FALSE(f.ok("a", 0));
  EXPECT_TRUE(f.ok("a"));
}

TEST(Layered, TheOlderLimitersStillWork) {
  auto clock = std::make_shared<FakeClock>();
  auto bucket = rl::makeLimiter(clock, {1, 10});
  auto window = rl::makeWindowLimiter(clock, {1, 10});
  EXPECT_TRUE(bucket->tryAcquire("a").allowed);
  EXPECT_FALSE(bucket->tryAcquire("a").allowed);
  EXPECT_TRUE(window->tryAcquire("a").allowed);
  EXPECT_FALSE(window->tryAcquire("a").allowed);
}
