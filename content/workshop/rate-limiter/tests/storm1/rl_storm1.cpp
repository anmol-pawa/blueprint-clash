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
  long long now_ = 1000;
};

struct Fixture {
  explicit Fixture(rl::WindowLimit limit) : limiter(rl::makeWindowLimiter(clock, limit)) {}
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<rl::RateLimiter> limiter;

  bool ok(const std::string& client = "a", long long permits = 1) { return limiter->tryAcquire(client, permits).allowed; }
  long long wait(const std::string& client = "a", long long permits = 1) { return limiter->tryAcquire(client, permits).retryAfter; }
};
}  // namespace

TEST(Window, TheFactoryRefusesInvalidArguments) {
  auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(rl::makeWindowLimiter(nullptr, {1, 1}) == nullptr);
  EXPECT_TRUE(rl::makeWindowLimiter(clock, {0, 1}) == nullptr);
  EXPECT_TRUE(rl::makeWindowLimiter(clock, {1, 0}) == nullptr);
  EXPECT_TRUE(rl::makeWindowLimiter(clock, {2, 5}) != nullptr);
}

TEST(Window, GrantsUpToTheMaximumInsideTheWindow) {
  Fixture f({3, 10});
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  const rl::Decision d = f.limiter->tryAcquire("a");
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, 10);
}

TEST(Window, AGrantIsForgottenExactlyOneWindowLater) {
  Fixture f({1, 10});
  EXPECT_TRUE(f.ok());
  f.clock->advance(9);
  EXPECT_FALSE(f.ok());
  f.clock->advance(1);
  EXPECT_TRUE(f.ok());
}

TEST(Window, NoBurstAcrossAWindowBoundary) {
  // Ticks 1009 and 1010 straddle the edge of a clock-aligned window of 10, but they are one tick apart.
  Fixture f({3, 10});
  f.clock->advance(9);
  EXPECT_TRUE(f.ok("a", 3));
  f.clock->advance(1);
  EXPECT_FALSE(f.ok());
  EXPECT_EQ(f.wait(), 9);
}

TEST(Window, GrantsLeaveTheWindowOneByOne) {
  Fixture f({3, 10});
  EXPECT_TRUE(f.ok());   // 1000
  f.clock->advance(3);
  EXPECT_TRUE(f.ok());   // 1003
  f.clock->advance(3);
  EXPECT_TRUE(f.ok());   // 1006
  f.clock->advance(1);   // 1007
  EXPECT_EQ(f.wait(), 3);
  f.clock->advance(3);   // 1010: the grant of 1000 is gone
  EXPECT_TRUE(f.ok());
  EXPECT_EQ(f.wait(), 3);  // the next to leave is the grant of 1003
}

TEST(Window, RefusedRequestsAreNotRemembered) {
  Fixture f({2, 10});
  EXPECT_TRUE(f.ok());
  EXPECT_TRUE(f.ok());
  f.clock->advance(5);
  EXPECT_FALSE(f.ok());
  EXPECT_FALSE(f.ok());
  f.clock->advance(5);
  EXPECT_TRUE(f.ok("a", 2));
}

TEST(Window, TheWaitCoversEveryGrantThatMustLeave) {
  Fixture f({4, 10});
  EXPECT_TRUE(f.ok("a", 1));  // 1000
  f.clock->advance(2);
  EXPECT_TRUE(f.ok("a", 1));  // 1002
  f.clock->advance(2);
  EXPECT_TRUE(f.ok("a", 2));  // 1004
  f.clock->advance(1);        // 1005: 4 permits inside
  EXPECT_EQ(f.wait("a", 2), 7);  // needs the grants of 1000 and 1002 gone: 1002 + 10 - 1005
  f.clock->advance(6);
  EXPECT_FALSE(f.ok("a", 2));
  f.clock->advance(1);
  EXPECT_TRUE(f.ok("a", 2));
}

TEST(Window, ARequestIsAllOrNothing) {
  Fixture f({4, 10});
  EXPECT_TRUE(f.ok("a", 3));
  EXPECT_FALSE(f.ok("a", 2));
  EXPECT_TRUE(f.ok("a", 1));
}

TEST(Window, MoreThanTheMaximumCanNeverBeGranted) {
  Fixture f({4, 10});
  const rl::Decision d = f.limiter->tryAcquire("a", 5);
  EXPECT_FALSE(d.allowed);
  EXPECT_EQ(d.retryAfter, rl::Decision::kNever);
  EXPECT_FALSE(f.ok("a", 0));
  EXPECT_FALSE(f.ok("a", -1));
  EXPECT_TRUE(f.ok("a", 4));
}

TEST(Window, ClientsHaveSeparateWindows) {
  Fixture f({1, 10});
  EXPECT_TRUE(f.ok("alice"));
  EXPECT_FALSE(f.ok("alice"));
  EXPECT_TRUE(f.ok("bob"));
}

TEST(Window, TheAdvertisedWaitIsHonest) {
  Fixture f({2, 6});
  EXPECT_TRUE(f.ok());
  f.clock->advance(1);
  EXPECT_TRUE(f.ok());
  const long long wait = f.wait();
  EXPECT_EQ(wait, 5);
  f.clock->advance(wait - 1);
  EXPECT_FALSE(f.ok());
  f.clock->advance(1);
  EXPECT_TRUE(f.ok());
}

TEST(Window, TheTokenBucketLimiterStillWorks) {
  auto clock = std::make_shared<FakeClock>();
  auto limiter = rl::makeLimiter(clock, {2, 10});
  EXPECT_TRUE(limiter->tryAcquire("a").allowed);
  EXPECT_TRUE(limiter->tryAcquire("a").allowed);
  EXPECT_FALSE(limiter->tryAcquire("a").allowed);
  clock->advance(10);
  EXPECT_TRUE(limiter->tryAcquire("a").allowed);
}
