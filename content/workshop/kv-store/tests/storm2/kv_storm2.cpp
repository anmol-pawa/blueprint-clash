#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
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
  std::unique_ptr<kv::ScannableStore> store = kv::makeScannableStore(clock);
};

using Keys = std::vector<std::string>;
}  // namespace

TEST(Scan, ANullClockIsRefused) {
  EXPECT_TRUE(kv::makeScannableStore(nullptr) == nullptr);
}

TEST(Scan, ListsKeysThatStartWithThePrefix) {
  Fixture f;
  f.store->set("user:1", "a");
  f.store->set("user:2", "b");
  f.store->set("order:1", "c");
  EXPECT_EQ(f.store->keysWithPrefix("user:"), (Keys{"user:1", "user:2"}));
}

TEST(Scan, ResultsAreInAscendingOrderWhateverTheInsertionOrder) {
  Fixture f;
  for (int i = 30; i >= 1; --i) f.store->set("k" + std::to_string(100 + i), "v");
  const Keys keys = f.store->keysWithPrefix("k");
  ASSERT_EQ(keys.size(), 30u);
  for (std::size_t i = 1; i < keys.size(); ++i) EXPECT_TRUE(keys[i - 1] < keys[i]);
  EXPECT_EQ(keys.front(), "k101");
  EXPECT_EQ(keys.back(), "k130");
}

TEST(Scan, ThePrefixMustBeAtTheStartNotAnywhere) {
  Fixture f;
  f.store->set("abc", "1");
  f.store->set("xabc", "2");
  f.store->set("ab", "3");
  EXPECT_EQ(f.store->keysWithPrefix("ab"), (Keys{"ab", "abc"}));
}

TEST(Scan, TheEmptyPrefixListsEveryLiveKey) {
  Fixture f;
  f.store->set("b", "1");
  f.store->set("", "2");
  f.store->set("a", "3");
  EXPECT_EQ(f.store->keysWithPrefix(""), (Keys{"", "a", "b"}));
}

TEST(Scan, NoMatchGivesAnEmptyList) {
  Fixture f;
  f.store->set("a", "1");
  EXPECT_TRUE(f.store->keysWithPrefix("zzz").empty());
}

TEST(Scan, ExpiredKeysAreNotListed) {
  Fixture f;
  f.store->setWithTtl("s:short", "1", 5);
  f.store->setWithTtl("s:long", "2", 50);
  f.store->set("s:forever", "3");
  f.clock->advance(5);
  EXPECT_EQ(f.store->keysWithPrefix("s:"), (Keys{"s:forever", "s:long"}));
}

TEST(Scan, UncommittedWritesAreVisibleAndRollbackHidesThemAgain) {
  Fixture f;
  f.store->set("p:keep", "1");
  f.store->set("p:gone", "2");
  f.store->begin();
  f.store->set("p:new", "3");
  f.store->erase("p:gone");
  EXPECT_EQ(f.store->keysWithPrefix("p:"), (Keys{"p:keep", "p:new"}));
  f.store->rollback();
  EXPECT_EQ(f.store->keysWithPrefix("p:"), (Keys{"p:gone", "p:keep"}));
}

TEST(Scan, AKeyOverwrittenManyTimesIsListedOnce) {
  Fixture f;
  f.store->set("a", "1");
  f.store->set("a", "2");
  f.store->setWithTtl("a", "3", 10);
  EXPECT_EQ(f.store->keysWithPrefix("a"), (Keys{"a"}));
}
