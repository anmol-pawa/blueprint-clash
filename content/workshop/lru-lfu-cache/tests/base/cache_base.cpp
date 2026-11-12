#include <string>

#include "api.h"
#include "bp_test.h"

namespace {
// Reads through get(), the way a caller does; the sentinel is outside every value the tests store.
constexpr int kMiss = -12345;
int read(cache::Cache& c, const std::string& key) {
  int v = kMiss;
  return c.get(key, v) ? v : kMiss;
}
}  // namespace

TEST(Basics, APutValueCanBeRead) {
  auto c = cache::makeCache(3);
  c->put("a", 10);
  int v = 0;
  EXPECT_TRUE(c->get("a", v));
  EXPECT_EQ(v, 10);
}

TEST(Basics, AMissReportsFalseAndLeavesTheOutputAlone) {
  auto c = cache::makeCache(3);
  c->put("a", 1);
  int v = 77;
  EXPECT_FALSE(c->get("nope", v));
  EXPECT_EQ(v, 77);
}

TEST(Basics, PuttingAgainReplacesTheValue) {
  auto c = cache::makeCache(3);
  c->put("a", 1);
  c->put("a", 2);
  EXPECT_EQ(read(*c, "a"), 2);
}

TEST(Basics, OverwritingDoesNotGrowTheCache) {
  auto c = cache::makeCache(3);
  c->put("a", 1);
  c->put("a", 2);
  c->put("a", 3);
  EXPECT_EQ(c->size(), 1);
}

TEST(Basics, ZeroAndNegativeValuesAreRealValues) {
  auto c = cache::makeCache(3);
  c->put("zero", 0);
  c->put("neg", -5);
  int v = kMiss;
  EXPECT_TRUE(c->get("zero", v));
  EXPECT_EQ(v, 0);
  EXPECT_TRUE(c->get("neg", v));
  EXPECT_EQ(v, -5);
  EXPECT_TRUE(c->contains("zero"));
}

TEST(Basics, KeysAreExactStrings) {
  auto c = cache::makeCache(4);
  c->put("a", 1);
  c->put("A", 2);
  c->put("", 3);
  EXPECT_EQ(read(*c, "a"), 1);
  EXPECT_EQ(read(*c, "A"), 2);
  EXPECT_EQ(read(*c, ""), 3);
  EXPECT_EQ(c->size(), 3);
}

TEST(Setup, CapacityIsReported) {
  auto c = cache::makeCache(7);
  ASSERT_TRUE(c != nullptr);
  EXPECT_EQ(c->capacity(), 7);
  EXPECT_EQ(c->size(), 0);
}

TEST(Setup, ZeroOrNegativeCapacityIsRefused) {
  EXPECT_TRUE(cache::makeCache(0) == nullptr);
  EXPECT_TRUE(cache::makeCache(-3) == nullptr);
}

TEST(Setup, TwoCachesShareNothing) {
  auto x = cache::makeCache(2);
  auto y = cache::makeCache(2);
  x->put("k", 1);
  EXPECT_FALSE(y->contains("k"));
  y->put("k", 2);
  EXPECT_EQ(read(*x, "k"), 1);
  EXPECT_EQ(read(*y, "k"), 2);
}

TEST(Eviction, TheLeastRecentlyInsertedGoesFirst) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  c->put("c", 3);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
  EXPECT_TRUE(c->contains("c"));
}

TEST(Eviction, SizeNeverExceedsCapacity) {
  auto c = cache::makeCache(3);
  for (int i = 0; i < 10; ++i) {
    c->put("k" + std::to_string(i), i);
    EXPECT_LE(c->size(), 3);
  }
  EXPECT_EQ(c->size(), 3);
}

TEST(Eviction, CapacityOneKeepsOnlyTheNewest) {
  auto c = cache::makeCache(1);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_EQ(read(*c, "b"), 2);
  EXPECT_EQ(c->size(), 1);
}

TEST(Recency, AGetRefreshesTheKey) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "a"), 1);
  c->put("c", 3);
  EXPECT_TRUE(c->contains("a"));
  EXPECT_FALSE(c->contains("b"));
}

TEST(Recency, APutOfAnExistingKeyRefreshesIt) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  c->put("a", 9);
  c->put("c", 3);
  EXPECT_EQ(read(*c, "a"), 9);
  EXPECT_FALSE(c->contains("b"));
}

TEST(Recency, ContainsDoesNotRefresh) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_TRUE(c->contains("a"));
  c->put("c", 3);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
}

TEST(Recency, AMissDoesNotDisturbTheOrder) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "zzz"), kMiss);
  c->put("c", 3);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
  EXPECT_EQ(c->size(), 2);
}

TEST(Recency, OverwritingAtCapacityEvictsNothing) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "a"), 1);  // b is now the least recently used
  c->put("a", 5);
  EXPECT_TRUE(c->contains("b"));
  EXPECT_EQ(read(*c, "a"), 5);
  EXPECT_EQ(c->size(), 2);
}

TEST(Recency, EvictionOrderFollowsUseNotInsertion) {
  auto c = cache::makeCache(3);
  c->put("a", 1);
  c->put("b", 2);
  c->put("c", 3);
  EXPECT_EQ(read(*c, "a"), 1);
  EXPECT_EQ(read(*c, "b"), 2);
  c->put("d", 4);  // evicts c
  EXPECT_FALSE(c->contains("c"));
  c->put("e", 5);  // evicts a
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
  EXPECT_TRUE(c->contains("d"));
  EXPECT_TRUE(c->contains("e"));
}

TEST(Erase, RemovesTheKeyAndReportsIt) {
  auto c = cache::makeCache(3);
  c->put("a", 1);
  EXPECT_TRUE(c->erase("a"));
  EXPECT_FALSE(c->contains("a"));
  EXPECT_EQ(c->size(), 0);
}

TEST(Erase, ReportsFalseForAMissingKey) {
  auto c = cache::makeCache(3);
  c->put("a", 1);
  EXPECT_FALSE(c->erase("b"));
  EXPECT_EQ(c->size(), 1);
}

TEST(Erase, FreesASlotSoNothingElseIsEvicted) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_TRUE(c->erase("a"));
  c->put("c", 3);
  EXPECT_TRUE(c->contains("b"));
  EXPECT_TRUE(c->contains("c"));
  EXPECT_EQ(c->size(), 2);
}

TEST(Erase, AKeyPutAgainIsAFreshEntry) {
  auto c = cache::makeCache(2);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_TRUE(c->erase("a"));
  c->put("a", 3);  // a is now the newest
  c->put("c", 4);  // evicts b
  EXPECT_FALSE(c->contains("b"));
  EXPECT_EQ(read(*c, "a"), 3);
}

TEST(Scale, ManyKeysStayWithinCapacity) {
  auto c = cache::makeCache(1000);
  for (int i = 0; i < 5000; ++i) c->put("key" + std::to_string(i), i);
  EXPECT_EQ(c->size(), 1000);
  EXPECT_FALSE(c->contains("key3999"));
  EXPECT_TRUE(c->contains("key4000"));
  EXPECT_EQ(read(*c, "key4999"), 4999);
}

TEST(Scale, ALongMixedRunIsFastAndConsistent) {
  const int kCapacity = 2000;
  auto c = cache::makeCache(kCapacity);
  unsigned state = 12345u;
  int lastPut = -1;
  for (int i = 0; i < 20000; ++i) {
    state = state * 1664525u + 1013904223u;
    const int k = static_cast<int>((state >> 8) % 4000u);
    if ((state & 3u) == 0u) {
      int v = 0;
      c->get("k" + std::to_string(k), v);
    } else {
      c->put("k" + std::to_string(k), k);
      lastPut = k;
    }
    if (i % 2500 == 0) ASSERT_TRUE(c->size() <= kCapacity);
  }
  EXPECT_TRUE(c->contains("k" + std::to_string(lastPut)));
  EXPECT_EQ(c->size(), kCapacity);
}
