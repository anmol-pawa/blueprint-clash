#include <string>

#include "api_storm2.h"
#include "bp_test.h"

using cache::Policy;

namespace {
constexpr int kMiss = -12345;

class ManualClock : public cache::Clock {
 public:
  long long now() const override { return now_; }
  void set(long long t) { now_ = t; }
  void advance(long long dt) { now_ += dt; }

 private:
  long long now_ = 0;
};

int read(cache::Cache& c, const std::string& key) {
  int v = kMiss;
  return c.get(key, v) ? v : kMiss;
}

// A clock plus a cache built on it, so a test can say "after 10 ticks".
struct Rig {
  ManualClock clock;
  std::unique_ptr<cache::ExpiringCache> cache;
  explicit Rig(int capacity, Policy policy = Policy::Lru) : cache(cache::makeExpiringCache(capacity, policy, clock)) {}
};
}  // namespace

TEST(Ttl, AnEntryIsAliveBeforeItsTtlRunsOut) {
  Rig r(3);
  r.cache->putFor("a", 1, 10);
  r.clock.set(9);
  EXPECT_EQ(read(*r.cache, "a"), 1);
  EXPECT_TRUE(r.cache->contains("a"));
}

TEST(Ttl, AnEntryIsDeadExactlyAtItsTtl) {
  Rig r(3);
  r.cache->putFor("a", 1, 10);
  r.clock.set(10);
  EXPECT_EQ(read(*r.cache, "a"), kMiss);
  EXPECT_FALSE(r.cache->contains("a"));
}

TEST(Ttl, TheTtlCountsFromTheTimeOfTheStore) {
  Rig r(3);
  r.clock.set(100);
  r.cache->putFor("a", 1, 5);
  r.clock.set(104);
  EXPECT_TRUE(r.cache->contains("a"));
  r.clock.set(105);
  EXPECT_FALSE(r.cache->contains("a"));
}

TEST(Ttl, PlainPutNeverExpires) {
  Rig r(3);
  r.cache->put("a", 1);
  r.clock.set(1000000);
  EXPECT_EQ(read(*r.cache, "a"), 1);
}

TEST(Ttl, PlainPutRemovesAnEarlierTtl) {
  Rig r(3);
  r.cache->putFor("a", 1, 10);
  r.cache->put("a", 2);
  r.clock.set(50);
  EXPECT_EQ(read(*r.cache, "a"), 2);
}

TEST(Ttl, PuttingWithANewTtlReplacesTheOldOne) {
  Rig r(3);
  r.cache->putFor("a", 1, 10);
  r.clock.set(5);
  r.cache->putFor("a", 2, 10);  // now dies at 15
  r.clock.set(12);
  EXPECT_EQ(read(*r.cache, "a"), 2);
  r.clock.set(15);
  EXPECT_FALSE(r.cache->contains("a"));
}

TEST(Ttl, AGetDoesNotExtendTheLife) {
  Rig r(3);
  r.cache->putFor("a", 1, 10);
  r.clock.set(8);
  EXPECT_EQ(read(*r.cache, "a"), 1);
  r.clock.set(10);
  EXPECT_FALSE(r.cache->contains("a"));
}

TEST(Ttl, ANonPositiveTtlStoresNothingAndRemovesTheKey) {
  Rig r(3);
  r.cache->put("a", 1);
  r.cache->putFor("a", 2, 0);
  EXPECT_FALSE(r.cache->contains("a"));
  r.cache->putFor("b", 3, -4);
  EXPECT_FALSE(r.cache->contains("b"));
  EXPECT_EQ(r.cache->size(), 0);
}

TEST(Ttl, EntriesExpireIndependently) {
  Rig r(5);
  r.cache->putFor("short", 1, 5);
  r.cache->putFor("long", 2, 50);
  r.cache->put("forever", 3);
  r.clock.set(10);
  EXPECT_FALSE(r.cache->contains("short"));
  EXPECT_TRUE(r.cache->contains("long"));
  EXPECT_TRUE(r.cache->contains("forever"));
}

TEST(Expired, SizeAndContainsIgnoreExpiredEntriesWithoutAnyOtherCall) {
  Rig r(3);
  r.cache->putFor("a", 1, 5);
  r.cache->putFor("b", 2, 5);
  r.cache->put("c", 3);
  EXPECT_EQ(r.cache->size(), 3);
  r.clock.set(5);
  EXPECT_EQ(r.cache->size(), 1);
  EXPECT_FALSE(r.cache->contains("a"));
}

TEST(Expired, EraseOfAnExpiredKeyReportsFalse) {
  Rig r(3);
  r.cache->putFor("a", 1, 5);
  r.clock.set(6);
  EXPECT_FALSE(r.cache->erase("a"));
  EXPECT_EQ(r.cache->size(), 0);
}

TEST(Expired, DeadEntriesAreDroppedBeforeAnyLiveOneIsEvicted) {
  Rig r(2);
  r.cache->put("old", 1);
  r.cache->putFor("dying", 2, 5);  // the most recently used entry, but it will die
  r.clock.set(10);
  r.cache->put("new", 3);
  EXPECT_TRUE(r.cache->contains("old"));
  EXPECT_TRUE(r.cache->contains("new"));
  EXPECT_EQ(r.cache->size(), 2);
}

TEST(Expired, SeveralDeadEntriesAllMakeRoom) {
  Rig r(3);
  r.cache->putFor("a", 1, 5);
  r.cache->putFor("b", 2, 6);
  r.cache->put("keep", 3);
  r.clock.set(10);
  r.cache->put("x", 4);
  r.cache->put("y", 5);
  EXPECT_TRUE(r.cache->contains("keep"));
  EXPECT_TRUE(r.cache->contains("x"));
  EXPECT_TRUE(r.cache->contains("y"));
}

TEST(Expired, WhenNothingIsDeadTheNormalPolicyEvicts) {
  Rig r(2);
  r.cache->putFor("a", 1, 100);
  r.cache->putFor("b", 2, 100);
  r.cache->put("c", 3);
  EXPECT_FALSE(r.cache->contains("a"));
  EXPECT_TRUE(r.cache->contains("b"));
  EXPECT_TRUE(r.cache->contains("c"));
}

TEST(Expired, StoringAnExpiredKeyAgainIsAFreshEntry) {
  Rig r(2);
  r.cache->putFor("a", 1, 5);
  r.cache->put("b", 2);
  r.clock.set(6);
  r.cache->put("a", 9);  // fresh, so now the newest
  r.cache->put("c", 3);  // evicts b, the oldest live entry
  EXPECT_FALSE(r.cache->contains("b"));
  EXPECT_EQ(read(*r.cache, "a"), 9);
}

TEST(Expired, AnExpiredEntryDoesNotCountAsRecentUse) {
  Rig r(2);
  r.cache->put("a", 1);
  r.cache->putFor("b", 2, 5);
  r.clock.set(6);
  EXPECT_EQ(read(*r.cache, "b"), kMiss);
  r.cache->put("c", 3);
  r.cache->put("d", 4);  // full again: a is the oldest live entry
  EXPECT_FALSE(r.cache->contains("a"));
}

TEST(Expired, LfuStartsAFreshCountForAnExpiredKey) {
  Rig r(2, Policy::Lfu);
  r.cache->putFor("a", 1, 5);
  for (int i = 0; i < 4; ++i) EXPECT_EQ(read(*r.cache, "a"), 1);  // 5 uses
  r.cache->put("b", 2);
  r.clock.set(6);
  r.cache->put("a", 3);              // a is new: 1 use
  EXPECT_EQ(read(*r.cache, "b"), 2);  // b: 2 uses
  r.cache->put("c", 4);              // a (1 use) goes
  EXPECT_FALSE(r.cache->contains("a"));
  EXPECT_TRUE(r.cache->contains("b"));
}

TEST(Expired, LfuStillPicksTheLeastUsedAmongLiveEntries) {
  Rig r(2, Policy::Lfu);
  r.cache->put("a", 1);
  r.cache->put("b", 2);
  EXPECT_EQ(read(*r.cache, "a"), 1);
  r.cache->put("c", 3);
  EXPECT_TRUE(r.cache->contains("a"));
  EXPECT_FALSE(r.cache->contains("b"));
}

TEST(Expired, AHugeTtlDoesNotOverflow) {
  Rig r(2);
  r.clock.set(1000);
  r.cache->putFor("a", 1, 9000000000000000000LL);
  r.clock.set(2000);
  EXPECT_TRUE(r.cache->contains("a"));
}

TEST(Expired, ACapacityOneCacheReplacesADeadEntryAndALiveOne) {
  Rig r(1);
  r.cache->putFor("a", 1, 5);
  r.clock.set(6);
  r.cache->put("b", 2);
  EXPECT_FALSE(r.cache->contains("a"));
  EXPECT_EQ(r.cache->size(), 1);
  r.cache->put("c", 3);
  EXPECT_FALSE(r.cache->contains("b"));
  EXPECT_EQ(read(*r.cache, "c"), 3);
}
