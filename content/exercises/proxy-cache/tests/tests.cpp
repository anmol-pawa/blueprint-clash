#include <memory>
#include <optional>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
// Counts creations and destructions of the store a LazyStore builds.
int g_made = 0;
int g_destroyed = 0;
class CountedStore final : public Store {
 public:
  CountedStore() { ++g_made; }
  ~CountedStore() override { ++g_destroyed; }
  std::optional<std::string> get(const std::string& key) override { return "v:" + key; }
  void put(const std::string&, const std::string&) override { ++puts_; }
  int puts_ = 0;
};
void resetCounters() {
  g_made = 0;
  g_destroyed = 0;
}
}  // namespace

TEST(Caching, SecondReadIsServedFromTheCache) {
  MemoryStore real;
  real.put("a", "1");
  CachingStore cache(real);
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(real.reads(), static_cast<std::size_t>(1));
}

TEST(Caching, KeysAreCachedIndependently) {
  MemoryStore real;
  real.put("a", "1");
  real.put("b", "2");
  CachingStore cache(real);
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(cache.get("b"), std::optional<std::string>("2"));
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(cache.get("b"), std::optional<std::string>("2"));
  EXPECT_EQ(real.reads(), static_cast<std::size_t>(2));
}

TEST(Caching, PutWritesThroughAndIsNeverStale) {
  MemoryStore real;
  real.put("a", "old");
  CachingStore cache(real);
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("old"));
  cache.put("a", "new");
  EXPECT_EQ(real.writes(), static_cast<std::size_t>(2));  // the seed put plus the write-through
  EXPECT_EQ(cache.get("a"), std::optional<std::string>("new"));
  EXPECT_EQ(real.get("a"), std::optional<std::string>("new"));
}

TEST(Caching, PutOfAnUncachedKeyIsReadableThroughTheProxy) {
  MemoryStore real;
  CachingStore cache(real);
  cache.put("k", "v");
  EXPECT_EQ(cache.get("k"), std::optional<std::string>("v"));
}

TEST(Caching, MissingKeyIsReportedAndNotCached) {
  MemoryStore real;
  CachingStore cache(real);
  EXPECT_FALSE(cache.get("ghost").has_value());
  EXPECT_FALSE(cache.get("ghost").has_value());
  EXPECT_EQ(real.reads(), static_cast<std::size_t>(2));  // the miss was retried, not remembered
  real.put("ghost", "boo");                              // appears behind the proxy's back
  EXPECT_EQ(cache.get("ghost"), std::optional<std::string>("boo"));
}

TEST(Caching, IsUsableThroughTheStoreInterface) {
  MemoryStore real;
  CachingStore cache(real);
  Store& asStore = cache;
  asStore.put("x", "1");
  EXPECT_EQ(asStore.get("x"), std::optional<std::string>("1"));
}

TEST(Lazy, NothingIsCreatedUntilFirstUse) {
  resetCounters();
  {
    LazyStore lazy([] { return std::make_unique<CountedStore>(); });
    EXPECT_EQ(g_made, 0);
  }
  EXPECT_EQ(g_made, 0);
}

TEST(Lazy, CreatesTheRealStoreExactlyOnce) {
  resetCounters();
  LazyStore lazy([] { return std::make_unique<CountedStore>(); });
  EXPECT_EQ(lazy.get("a"), std::optional<std::string>("v:a"));
  EXPECT_EQ(lazy.get("b"), std::optional<std::string>("v:b"));
  lazy.put("c", "1");
  EXPECT_EQ(g_made, 1);
}

TEST(Lazy, ForwardsAWriteAsTheFirstUse) {
  MemoryStore* seen = nullptr;
  LazyStore lazy([&seen] {
    auto s = std::make_unique<MemoryStore>();
    seen = s.get();
    return s;
  });
  lazy.put("k", "v");
  EXPECT_TRUE(seen != nullptr);
  EXPECT_EQ(lazy.get("k"), std::optional<std::string>("v"));
  EXPECT_EQ(seen->writes(), static_cast<std::size_t>(1));
}

TEST(Lazy, OwnsAndDestroysWhatItCreated) {
  resetCounters();
  {
    LazyStore lazy([] { return std::make_unique<CountedStore>(); });
    lazy.get("a");
    EXPECT_EQ(g_destroyed, 0);
  }
  EXPECT_EQ(g_destroyed, 1);
}

TEST(Proxies, CanBeStacked) {
  MemoryStore real;
  real.put("a", "1");
  CachingStore cache(real);
  LazyStore lazy([&cache] { return std::make_unique<CachingStore>(cache); });
  EXPECT_EQ(lazy.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(lazy.get("a"), std::optional<std::string>("1"));
  EXPECT_EQ(real.reads(), static_cast<std::size_t>(1));
}
