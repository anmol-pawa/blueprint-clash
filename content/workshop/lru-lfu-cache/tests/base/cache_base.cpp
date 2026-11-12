#include <string>

#include "api.h"
#include "bp_test.h"

using cachex::makeCache;

namespace {
// Reads without keeping an optional around, so a test line says what it checks.
std::string valueOf(cachex::Cache& cache, const std::string& key) {
  const auto got = cache.get(key);
  return got.has_value() ? *got : std::string("<miss>");
}
}  // namespace

TEST(Basics, APutValueCanBeRead) {
  auto cache = makeCache(3);
  cache->put("a", "1");
  EXPECT_EQ(valueOf(*cache, "a"), "1");
  EXPECT_EQ(cache->size(), 1);
}

TEST(Basics, AMissIsAnEmptyOptional) {
  auto cache = makeCache(3);
  EXPECT_FALSE(cache->get("nope").has_value());
  cache->put("a", "1");
  EXPECT_FALSE(cache->get("b").has_value());
}

TEST(Basics, PuttingAKeyAgainReplacesItsValue) {
  auto cache = makeCache(3);
  cache->put("a", "1");
  cache->put("a", "2");
  EXPECT_EQ(valueOf(*cache, "a"), "2");
  EXPECT_EQ(cache->size(), 1);
}

TEST(Basics, KeysAndValuesAreOpaqueStringsIncludingEmptyOnes) {
  auto cache = makeCache(2);
  cache->put("", "empty key");
  cache->put("k", "");
  EXPECT_EQ(valueOf(*cache, ""), "empty key");
  ASSERT_TRUE(cache->get("k").has_value());
  EXPECT_EQ(*cache->get("k"), "");
}

TEST(Basics, TwoCachesShareNothing) {
  auto first = makeCache(2);
  auto second = makeCache(2);
  first->put("a", "1");
  EXPECT_FALSE(second->contains("a"));
  EXPECT_EQ(second->size(), 0);
}

TEST(Capacity, ACapacityBelowOneIsRefused) {
  EXPECT_TRUE(makeCache(0) == nullptr);
  EXPECT_TRUE(makeCache(-3) == nullptr);
  EXPECT_FALSE(makeCache(1) == nullptr);
}

TEST(Capacity, CapacityIsReportedAndSizeNeverExceedsIt) {
  auto cache = makeCache(3);
  EXPECT_EQ(cache->capacity(), 3);
  for (int i = 0; i < 20; ++i) {
    cache->put("k" + std::to_string(i), "v");
    EXPECT_LE(cache->size(), 3);
  }
  EXPECT_EQ(cache->size(), 3);
}

TEST(Capacity, ACapacityOfOneKeepsOnlyTheNewestKey) {
  auto cache = makeCache(1);
  cache->put("a", "1");
  cache->put("b", "2");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_EQ(valueOf(*cache, "b"), "2");
  EXPECT_EQ(cache->size(), 1);
}

TEST(Capacity, OverwritingAKeyNeverEvictsAnything) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->get("a");  // b is now the least recently used
  cache->put("a", "1b");
  EXPECT_TRUE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
  EXPECT_EQ(cache->size(), 2);
  EXPECT_EQ(cache->stats().evictions, 0);
}

TEST(Recency, TheLeastRecentlyUsedEntryIsEvictedFirst) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("c"));
}

TEST(Recency, AHitMakesTheKeyTheMostRecentlyUsed) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->get("a");
  cache->put("c", "3");
  EXPECT_TRUE(cache->contains("a"));
  EXPECT_FALSE(cache->contains("b"));
}

TEST(Recency, ReplacingAValueCountsAsAUse) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("a", "1b");
  cache->put("c", "3");
  EXPECT_TRUE(cache->contains("a"));
  EXPECT_FALSE(cache->contains("b"));
}

TEST(Recency, AMissChangesNothing) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->get("zzz");
  cache->put("c", "3");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
}

TEST(Recency, ContainsIsAPeekAndDoesNotRefresh) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  EXPECT_TRUE(cache->contains("a"));
  cache->put("c", "3");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
}

TEST(Recency, SeveralUsesLeaveTheRightOrderBehind) {
  auto cache = makeCache(3);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  cache->get("a");  // order, oldest first: b c a
  cache->get("b");  // c a b
  cache->put("d", "4");  // evicts c
  EXPECT_FALSE(cache->contains("c"));
  cache->put("e", "5");  // evicts a
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("d"));
  EXPECT_TRUE(cache->contains("e"));
}

TEST(Erase, ErasingReportsWhetherTheKeyWasThere) {
  auto cache = makeCache(3);
  cache->put("a", "1");
  EXPECT_TRUE(cache->erase("a"));
  EXPECT_FALSE(cache->erase("a"));
  EXPECT_FALSE(cache->erase("never"));
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_EQ(cache->size(), 0);
}

TEST(Erase, ErasingFreesRoomSoNothingIsEvicted) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("a");
  cache->put("c", "3");
  EXPECT_TRUE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("c"));
  EXPECT_EQ(cache->stats().evictions, 0);
}

TEST(Erase, AnErasedKeyIsNeverChosenAsAVictimLater) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("a");  // a was the oldest; the order must forget it
  cache->put("c", "3");
  cache->put("d", "4");  // full again: b is the real least recently used
  EXPECT_FALSE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("c"));
  EXPECT_TRUE(cache->contains("d"));
  EXPECT_EQ(cache->size(), 2);
}

TEST(Erase, APutAfterEraseMakesTheKeyNewestAgain) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("a");
  cache->put("a", "again");
  cache->put("c", "3");  // b is oldest now
  EXPECT_FALSE(cache->contains("b"));
  EXPECT_EQ(valueOf(*cache, "a"), "again");
}

TEST(StatsTest, ACacheStartsWithZeroCounters) {
  auto cache = makeCache(2);
  const cachex::Stats s = cache->stats();
  EXPECT_EQ(s.hits, 0);
  EXPECT_EQ(s.misses, 0);
  EXPECT_EQ(s.evictions, 0);
}

TEST(StatsTest, OnlyGetCountsHitsAndMisses) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->get("a");
  cache->get("a");
  cache->get("x");
  cache->contains("a");
  cache->contains("x");
  cache->put("a", "2");
  const cachex::Stats s = cache->stats();
  EXPECT_EQ(s.hits, 2);
  EXPECT_EQ(s.misses, 1);
}

TEST(StatsTest, EvictionsCountOnlyEntriesPushedOutForRoom) {
  auto cache = makeCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");  // evicts a
  cache->put("c", "3b");  // replacing
  cache->erase("b");  // erasing
  cache->put("d", "4");  // room available
  EXPECT_EQ(cache->stats().evictions, 1);
}
