#include <memory>
#include <string>

#include "api.h"
#include "bp_test.h"

namespace {
class FakeClock : public kv::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<kv::Store> store = kv::makeStore(clock);
};

std::string valueOf(const kv::Store& store, const std::string& key) {
  const auto got = store.get(key);
  return got.has_value() ? *got : std::string("<absent>");
}
}  // namespace

TEST(Basics, ASetValueCanBeRead) {
  Fixture f;
  f.store->set("a", "1");
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Basics, AnUnknownKeyIsAnEmptyOptional) {
  Fixture f;
  EXPECT_FALSE(f.store->get("nope").has_value());
  f.store->set("a", "1");
  EXPECT_FALSE(f.store->get("b").has_value());
}

TEST(Basics, SettingAKeyAgainReplacesItsValue) {
  Fixture f;
  f.store->set("a", "1");
  f.store->set("a", "2");
  EXPECT_EQ(valueOf(*f.store, "a"), "2");
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Basics, EmptyKeysAndValuesAreOrdinaryStrings) {
  Fixture f;
  f.store->set("", "empty key");
  f.store->set("k", "");
  EXPECT_EQ(valueOf(*f.store, ""), "empty key");
  ASSERT_TRUE(f.store->get("k").has_value());
  EXPECT_EQ(*f.store->get("k"), "");
}

TEST(Basics, ANullClockIsRefused) {
  EXPECT_TRUE(kv::makeStore(nullptr) == nullptr);
}

TEST(Basics, TwoStoresShareNothing) {
  Fixture first;
  Fixture second;
  first.store->set("a", "1");
  EXPECT_FALSE(second.store->get("a").has_value());
  EXPECT_EQ(second.store->size(), 0);
}

TEST(Erase, ErasingALiveKeyReturnsTrueAndRemovesIt) {
  Fixture f;
  f.store->set("a", "1");
  f.store->set("b", "2");
  EXPECT_TRUE(f.store->erase("a"));
  EXPECT_FALSE(f.store->get("a").has_value());
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Erase, ErasingAnAbsentKeyReturnsFalse) {
  Fixture f;
  EXPECT_FALSE(f.store->erase("nope"));
  f.store->set("a", "1");
  EXPECT_TRUE(f.store->erase("a"));
  EXPECT_FALSE(f.store->erase("a"));
}

TEST(Ttl, AKeyLivesUntilItsLastTickAndIsGoneAtTheExpiryTick) {
  Fixture f;
  ASSERT_TRUE(f.store->setWithTtl("a", "1", 10));
  f.clock->advance(9);
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
  f.clock->advance(1);
  EXPECT_FALSE(f.store->get("a").has_value());
}

TEST(Ttl, TheTimeToLiveCountsFromTheMomentOfTheSet) {
  Fixture f;
  f.clock->advance(500);
  f.store->setWithTtl("a", "1", 100);
  f.clock->advance(99);
  EXPECT_TRUE(f.store->get("a").has_value());
  f.clock->advance(1);
  EXPECT_FALSE(f.store->get("a").has_value());
}

TEST(Ttl, AKeyWithoutATtlNeverExpires) {
  Fixture f;
  f.store->set("a", "1");
  f.clock->advance(1000000);
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
}

TEST(Ttl, KeysExpireIndependently) {
  Fixture f;
  f.store->setWithTtl("short", "s", 5);
  f.store->setWithTtl("long", "l", 50);
  f.store->set("forever", "f");
  f.clock->advance(5);
  EXPECT_FALSE(f.store->get("short").has_value());
  EXPECT_TRUE(f.store->get("long").has_value());
  EXPECT_TRUE(f.store->get("forever").has_value());
  EXPECT_EQ(f.store->size(), 2);
}

TEST(Ttl, ANonPositiveTtlIsRefusedAndChangesNothing) {
  Fixture f;
  EXPECT_FALSE(f.store->setWithTtl("a", "1", 0));
  EXPECT_FALSE(f.store->setWithTtl("a", "1", -5));
  EXPECT_FALSE(f.store->get("a").has_value());
  EXPECT_EQ(f.store->size(), 0);
  f.store->set("b", "old");
  EXPECT_FALSE(f.store->setWithTtl("b", "new", 0));
  EXPECT_EQ(valueOf(*f.store, "b"), "old");
}

TEST(Overwrite, PlainSetClearsAnEarlierExpiry) {
  Fixture f;
  f.store->setWithTtl("a", "1", 10);
  f.store->set("a", "2");
  f.clock->advance(100);
  EXPECT_EQ(valueOf(*f.store, "a"), "2");
  EXPECT_FALSE(f.store->ttlRemaining("a").has_value());
}

TEST(Overwrite, ANewTtlReplacesTheOldOneInBothDirections) {
  Fixture f;
  f.store->setWithTtl("a", "1", 10);
  f.clock->advance(8);
  f.store->setWithTtl("a", "2", 10);
  f.clock->advance(5);
  EXPECT_EQ(valueOf(*f.store, "a"), "2");
  f.clock->advance(5);
  EXPECT_FALSE(f.store->get("a").has_value());
}

TEST(Overwrite, SettingAnExpiredKeyBringsItBackWithTheNewValue) {
  Fixture f;
  f.store->setWithTtl("a", "old", 3);
  f.clock->advance(10);
  f.store->set("a", "new");
  EXPECT_EQ(valueOf(*f.store, "a"), "new");
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Size, ExpiredKeysAreNotCounted) {
  Fixture f;
  f.store->setWithTtl("a", "1", 5);
  f.store->setWithTtl("b", "2", 5);
  f.store->set("c", "3");
  EXPECT_EQ(f.store->size(), 3);
  f.clock->advance(5);
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Erase, AnExpiredKeyCountsAsAbsent) {
  Fixture f;
  f.store->setWithTtl("a", "1", 5);
  f.clock->advance(5);
  EXPECT_FALSE(f.store->erase("a"));
}

TEST(TtlRemaining, CountsDownWithTheClock) {
  Fixture f;
  f.store->setWithTtl("a", "1", 10);
  ASSERT_TRUE(f.store->ttlRemaining("a").has_value());
  EXPECT_EQ(*f.store->ttlRemaining("a"), 10);
  f.clock->advance(4);
  EXPECT_EQ(*f.store->ttlRemaining("a"), 6);
  f.clock->advance(5);
  EXPECT_EQ(*f.store->ttlRemaining("a"), 1);
  f.clock->advance(1);
  EXPECT_FALSE(f.store->ttlRemaining("a").has_value());
}

TEST(TtlRemaining, IsEmptyForAbsentAndForPersistentKeys) {
  Fixture f;
  EXPECT_FALSE(f.store->ttlRemaining("nope").has_value());
  f.store->set("a", "1");
  EXPECT_FALSE(f.store->ttlRemaining("a").has_value());
}

TEST(TtlRemaining, DoesNotChangeTheTtl) {
  Fixture f;
  f.store->setWithTtl("a", "1", 10);
  f.store->ttlRemaining("a");
  f.store->get("a");
  f.clock->advance(10);
  EXPECT_FALSE(f.store->get("a").has_value());
}
