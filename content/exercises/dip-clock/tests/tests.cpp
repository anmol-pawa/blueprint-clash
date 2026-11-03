#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
int liveClocks = 0;

struct FakeClock : Clock {  // a clock the test can move
  long long now = 1000;
  FakeClock() { ++liveClocks; }
  ~FakeClock() override { --liveClocks; }
  long long nowSeconds() const override { return now; }
};

// The store owns the clock; the test keeps a non-owning pointer to move time.
struct Fixture {
  FakeClock* clock;
  SessionStore store;
  explicit Fixture(long long ttl) : clock(new FakeClock), store(std::unique_ptr<Clock>(clock), ttl) {}
};
}  // namespace

TEST(Sessions, TokensAreNumberedInOrder) {
  Fixture f(60);
  EXPECT_EQ(f.store.open("ana"), std::string("s1"));
  EXPECT_EQ(f.store.open("bo"), std::string("s2"));
}

TEST(Sessions, UnknownTokenIsInvalid) {
  Fixture f(60);
  f.store.open("ana");
  EXPECT_FALSE(f.store.isValid("s99"));
  EXPECT_FALSE(f.store.isValid(""));
}

TEST(Expiry, SessionExpiresWhenTheInjectedClockAdvances) {
  Fixture f(60);
  const std::string t = f.store.open("ana");
  EXPECT_TRUE(f.store.isValid(t));
  f.clock->now += 59;
  EXPECT_TRUE(f.store.isValid(t));
  f.clock->now += 100;
  EXPECT_FALSE(f.store.isValid(t));
}

TEST(Expiry, ExpiresExactlyAtTheTtl) {
  Fixture f(60);
  const std::string t = f.store.open("ana");
  f.clock->now += 60;
  EXPECT_FALSE(f.store.isValid(t));
}

TEST(Expiry, ActiveCountDropsAsSessionsExpire) {
  Fixture f(60);
  f.store.open("a");           // created at 1000
  f.clock->now += 30;
  f.store.open("b");           // created at 1030
  EXPECT_EQ(f.store.activeCount(), static_cast<std::size_t>(2));
  f.clock->now += 40;          // 1070: a is 70 old, b is 40 old
  EXPECT_EQ(f.store.activeCount(), static_cast<std::size_t>(1));
  f.clock->now += 40;          // 1110: both expired
  EXPECT_EQ(f.store.activeCount(), static_cast<std::size_t>(0));
}

TEST(Ownership, StoreDestroysTheClockItOwns) {
  EXPECT_EQ(liveClocks, 0);
  {
    Fixture f(10);
    EXPECT_EQ(liveClocks, 1);
  }
  EXPECT_EQ(liveClocks, 0);
}
