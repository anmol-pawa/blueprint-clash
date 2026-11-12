#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using cache::Policy;

namespace {
constexpr int kMiss = -12345;
int read(cache::Cache& c, const std::string& key) {
  int v = kMiss;
  return c.get(key, v) ? v : kMiss;
}
}  // namespace

TEST(Policy, ZeroOrNegativeCapacityIsRefused) {
  EXPECT_TRUE(cache::makePolicyCache(0, Policy::Lfu) == nullptr);
  EXPECT_TRUE(cache::makePolicyCache(-1, Policy::Lru) == nullptr);
}

TEST(Policy, LruPolicyBehavesLikeTheOriginalCache) {
  auto c = cache::makePolicyCache(2, Policy::Lru);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "a"), 1);
  c->put("c", 3);
  EXPECT_TRUE(c->contains("a"));
  EXPECT_FALSE(c->contains("b"));
}

TEST(Policy, TheCapacityStillHolds) {
  auto c = cache::makePolicyCache(3, Policy::Lfu);
  for (int i = 0; i < 20; ++i) c->put("k" + std::to_string(i), i);
  EXPECT_EQ(c->size(), 3);
  EXPECT_EQ(c->capacity(), 3);
}

TEST(Lfu, TheLeastFrequentlyUsedGoesFirst) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "a"), 1);
  EXPECT_EQ(read(*c, "a"), 1);
  EXPECT_EQ(read(*c, "b"), 2);  // a used 3 times in all, b twice
  c->put("c", 3);
  EXPECT_TRUE(c->contains("a"));
  EXPECT_FALSE(c->contains("b"));
  EXPECT_TRUE(c->contains("c"));
}

TEST(Lfu, FrequencyBeatsRecency) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("hot", 1);
  for (int i = 0; i < 5; ++i) EXPECT_EQ(read(*c, "hot"), 1);
  c->put("fresh", 2);  // newest, but used once
  c->put("next", 3);
  EXPECT_TRUE(c->contains("hot"));
  EXPECT_FALSE(c->contains("fresh"));
}

TEST(Lfu, TiesGoToTheLeastRecentlyUsed) {
  auto c = cache::makePolicyCache(3, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  c->put("c", 3);  // all used once; a is the oldest
  c->put("d", 4);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
  EXPECT_TRUE(c->contains("c"));
  EXPECT_TRUE(c->contains("d"));
}

TEST(Lfu, TheTieBreakFollowsRecentUseNotInsertion) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "a"), 1);
  EXPECT_EQ(read(*c, "b"), 2);  // both at 2 uses, a was used earlier than b
  c->put("c", 3);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
}

TEST(Lfu, ANewcomerSurvivesItsOwnInsertion) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  for (int i = 0; i < 3; ++i) EXPECT_EQ(read(*c, "a"), 1);
  for (int i = 0; i < 2; ++i) EXPECT_EQ(read(*c, "b"), 2);
  c->put("c", 3);  // c has 1 use, fewer than anyone, but it is not allowed to evict itself
  EXPECT_TRUE(c->contains("c"));
  EXPECT_TRUE(c->contains("a"));
  EXPECT_FALSE(c->contains("b"));
}

TEST(Lfu, AnOverwriteCountsAsAUse) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "b"), 2);  // b: 2 uses, a: 1
  c->put("a", 10);              // a: 2 uses, and more recent than b
  c->put("c", 3);               // tie at 2: b was used less recently
  EXPECT_TRUE(c->contains("a"));
  EXPECT_FALSE(c->contains("b"));
  EXPECT_EQ(read(*c, "a"), 10);
}

TEST(Lfu, ContainsAndMissesAreNotUses) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  EXPECT_EQ(read(*c, "b"), 2);  // b: 2 uses, a: 1
  for (int i = 0; i < 4; ++i) EXPECT_TRUE(c->contains("a"));
  EXPECT_EQ(read(*c, "missing"), kMiss);
  c->put("c", 3);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
}

TEST(Lfu, AnEvictedKeyStartsOverAtOne) {
  auto c = cache::makePolicyCache(2, Policy::Lfu);
  c->put("a", 1);
  for (int i = 0; i < 5; ++i) EXPECT_EQ(read(*c, "a"), 1);  // a: 6 uses
  EXPECT_TRUE(c->erase("a"));
  c->put("b", 2);
  c->put("a", 1);  // a is new again: 1 use
  EXPECT_EQ(read(*c, "b"), 2);  // b: 2 uses
  c->put("c", 3);  // a (1 use) must go, not b
  EXPECT_FALSE(c->contains("a"));
  EXPECT_TRUE(c->contains("b"));
}

TEST(Lfu, ErasingTheOnlyLowestKeyMovesTheVictimUp) {
  auto c = cache::makePolicyCache(3, Policy::Lfu);
  c->put("a", 1);
  c->put("b", 2);
  c->put("c", 3);
  EXPECT_EQ(read(*c, "b"), 2);
  EXPECT_EQ(read(*c, "c"), 3);
  EXPECT_EQ(read(*c, "c"), 3);  // a:1, b:2, c:3
  EXPECT_TRUE(c->erase("a"));
  c->put("d", 4);               // room left, nothing evicted
  EXPECT_EQ(c->size(), 3);
  c->put("e", 5);               // d (1 use) goes
  EXPECT_FALSE(c->contains("d"));
  EXPECT_TRUE(c->contains("b"));
  EXPECT_TRUE(c->contains("c"));
  EXPECT_TRUE(c->contains("e"));
}

TEST(Lfu, CapacityOneKeepsOnlyTheNewest) {
  auto c = cache::makePolicyCache(1, Policy::Lfu);
  c->put("a", 1);
  EXPECT_EQ(read(*c, "a"), 1);
  c->put("b", 2);
  EXPECT_FALSE(c->contains("a"));
  EXPECT_EQ(read(*c, "b"), 2);
}

TEST(Lfu, ALongRunKeepsTheHotKeysAndTheCapacity) {
  auto c = cache::makePolicyCache(100, Policy::Lfu);
  for (int round = 0; round < 40; ++round) {
    for (int h = 0; h < 10; ++h) c->put("hot" + std::to_string(h), h);
  }
  for (int i = 0; i < 20000; ++i) {
    c->put("cold" + std::to_string(i), i);
    if (i % 1000 == 0) ASSERT_TRUE(c->size() <= 100);
  }
  for (int h = 0; h < 10; ++h) EXPECT_TRUE(c->contains("hot" + std::to_string(h)));
  EXPECT_EQ(c->size(), 100);
}
