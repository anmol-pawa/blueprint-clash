#include <algorithm>
#include <deque>
#include <list>
#include <map>
#include <string>
#include <utility>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using cachex::EvictionPolicy;
using cachex::makeCache;
using cachex::makePolicyCache;

namespace {
using Log = std::vector<std::string>;

// First in, first out: hits change nothing.
class FifoPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { queue_.push_back(key); }
  void onAccess(const std::string&) override {}
  void onErase(const std::string& key) override { queue_.erase(std::remove(queue_.begin(), queue_.end(), key), queue_.end()); }
  std::string chooseVictim() override { return queue_.front(); }

 private:
  std::deque<std::string> queue_;
};

// Most recently used goes first (a sensible policy for a one-pass scan over the data).
class MruPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { touch(key); }
  void onAccess(const std::string& key) override { touch(key); }
  void onErase(const std::string& key) override { order_.remove(key); }
  std::string chooseVictim() override { return order_.back(); }

 private:
  void touch(const std::string& key) {
    order_.remove(key);
    order_.push_back(key);
  }
  std::list<std::string> order_;  // back = most recent
};

// Least frequently used goes first; a tie goes to the key that was used longest ago.
class LfuPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { entries_[key] = {1, ++clock_}; }
  void onAccess(const std::string& key) override {
    Entry& e = entries_[key];
    ++e.uses;
    e.stamp = ++clock_;
  }
  void onErase(const std::string& key) override { entries_.erase(key); }
  std::string chooseVictim() override {
    auto best = entries_.begin();
    for (auto it = entries_.begin(); it != entries_.end(); ++it) {
      if (it->second.uses < best->second.uses || (it->second.uses == best->second.uses && it->second.stamp < best->second.stamp)) best = it;
    }
    return best->first;
  }

 private:
  struct Entry {
    int uses = 0;
    long stamp = 0;
  };
  std::map<std::string, Entry> entries_;
  long clock_ = 0;
};

// Least recently used, written down by the test so the default cache can be compared with it.
class LruTestPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { touch(key); }
  void onAccess(const std::string& key) override { touch(key); }
  void onErase(const std::string& key) override { order_.remove(key); }
  std::string chooseVictim() override { return order_.front(); }

 private:
  void touch(const std::string& key) {
    order_.remove(key);
    order_.push_back(key);
  }
  std::list<std::string> order_;  // front = least recent
};

// Writes every call into a shared log and answers like a FIFO policy.
class RecordingPolicy : public EvictionPolicy {
 public:
  explicit RecordingPolicy(Log* log) : log_(log) {}
  void onInsert(const std::string& key) override {
    log_->push_back("insert:" + key);
    inner_.onInsert(key);
  }
  void onAccess(const std::string& key) override {
    log_->push_back("access:" + key);
    inner_.onAccess(key);
  }
  void onErase(const std::string& key) override {
    log_->push_back("erase:" + key);
    inner_.onErase(key);
  }
  std::string chooseVictim() override {
    log_->push_back("victim");
    return inner_.chooseVictim();
  }

 private:
  Log* log_;
  FifoPolicy inner_;
};

std::unique_ptr<cachex::Cache> fifoCache(int capacity) { return makePolicyCache(capacity, std::make_unique<FifoPolicy>()); }
}  // namespace

TEST(Policy, FifoEvictsTheOldestInsertEvenAfterAHit) {
  auto cache = fifoCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->get("a");  // an LRU cache would now keep a
  cache->put("c", "3");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("c"));
}

TEST(Policy, MruEvictsTheNewestKey) {
  auto cache = makePolicyCache(2, std::make_unique<MruPolicy>());
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  EXPECT_TRUE(cache->contains("a"));
  EXPECT_FALSE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("c"));
}

TEST(Policy, LfuKeepsTheFrequentlyUsedKey) {
  auto cache = makePolicyCache(2, std::make_unique<LfuPolicy>());
  cache->put("a", "1");
  cache->put("b", "2");
  cache->get("a");
  cache->get("a");
  cache->put("c", "3");  // b has the fewest uses
  EXPECT_TRUE(cache->contains("a"));
  EXPECT_FALSE(cache->contains("b"));
  cache->put("d", "4");  // c (1 use) goes before a (3 uses)
  EXPECT_TRUE(cache->contains("a"));
  EXPECT_FALSE(cache->contains("c"));
  EXPECT_TRUE(cache->contains("d"));
}

TEST(Policy, LfuBreaksTiesByTheLongestUnusedKey) {
  auto cache = makePolicyCache(3, std::make_unique<LfuPolicy>());
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  cache->put("d", "4");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
}

TEST(Policy, ADifferentPolicyMakesTheSameCallsGiveADifferentAnswer) {
  auto fifo = fifoCache(2);
  auto mru = makePolicyCache(2, std::make_unique<MruPolicy>());
  for (cachex::Cache* c : {fifo.get(), mru.get()}) {
    c->put("a", "1");
    c->put("b", "2");
    c->get("b");
    c->put("c", "3");
  }
  EXPECT_FALSE(fifo->contains("a"));  // oldest insert goes
  EXPECT_TRUE(fifo->contains("b"));
  EXPECT_FALSE(mru->contains("b"));  // most recently used goes
  EXPECT_TRUE(mru->contains("a"));
}

TEST(Policy, ALeastRecentlyUsedPolicyBehavesLikeTheDefaultCache) {
  auto plain = makeCache(3);
  auto viaPolicy = makePolicyCache(3, std::make_unique<LruTestPolicy>());
  const char* const keys[] = {"a", "b", "c", "a", "d", "b", "e", "c", "a", "f"};
  int step = 0;
  for (const char* k : keys) {
    if (step % 3 == 2) {
      EXPECT_EQ(plain->get(k).has_value(), viaPolicy->get(k).has_value());
    } else {
      plain->put(k, "v");
      viaPolicy->put(k, "v");
    }
    ++step;
    for (const char* probe : {"a", "b", "c", "d", "e", "f"}) EXPECT_EQ(plain->contains(probe), viaPolicy->contains(probe));
  }
}

TEST(Policy, BadArgumentsAreRefused) {
  EXPECT_TRUE(makePolicyCache(0, std::make_unique<FifoPolicy>()) == nullptr);
  EXPECT_TRUE(makePolicyCache(-1, std::make_unique<FifoPolicy>()) == nullptr);
  EXPECT_TRUE(makePolicyCache(3, nullptr) == nullptr);
}

TEST(Policy, OverwritingErasingAndStatsStillWorkWithAnyPolicy) {
  auto cache = fifoCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("a", "1b");  // replacing never evicts
  EXPECT_EQ(cache->size(), 2);
  EXPECT_EQ(*cache->get("a"), "1b");
  EXPECT_FALSE(cache->get("zzz").has_value());
  cache->put("c", "3");  // FIFO: a goes although it was just used
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->erase("b"));
  EXPECT_EQ(cache->capacity(), 2);
  const cachex::Stats s = cache->stats();
  EXPECT_EQ(s.hits, 1);
  EXPECT_EQ(s.misses, 1);
  EXPECT_EQ(s.evictions, 1);
}

TEST(Protocol, ANewKeyIsAnInsertAndAReplacementIsAnAccess) {
  Log log;
  auto cache = makePolicyCache(3, std::make_unique<RecordingPolicy>(&log));
  cache->put("a", "1");
  cache->put("a", "2");
  EXPECT_EQ(log, (Log{"insert:a", "access:a"}));
}

TEST(Protocol, AHitIsAnAccessAndAMissOrAPeekIsNothing) {
  Log log;
  auto cache = makePolicyCache(3, std::make_unique<RecordingPolicy>(&log));
  cache->put("a", "1");
  log.clear();
  cache->get("a");
  EXPECT_EQ(log, (Log{"access:a"}));
  log.clear();
  cache->get("missing");
  cache->contains("a");
  cache->contains("missing");
  EXPECT_TRUE(log.empty());
}

TEST(Protocol, ErasingTellsThePolicyOnlyWhenTheKeyWasThere) {
  Log log;
  auto cache = makePolicyCache(3, std::make_unique<RecordingPolicy>(&log));
  cache->put("a", "1");
  log.clear();
  cache->erase("a");
  EXPECT_EQ(log, (Log{"erase:a"}));
  log.clear();
  cache->erase("a");
  cache->erase("never");
  EXPECT_TRUE(log.empty());
}

TEST(Protocol, EvictionAsksThenTellsTheVictimLeftThenInsertsTheNewKey) {
  Log log;
  auto cache = makePolicyCache(2, std::make_unique<RecordingPolicy>(&log));
  cache->put("a", "1");
  cache->put("b", "2");
  log.clear();
  cache->put("c", "3");
  EXPECT_EQ(log, (Log{"victim", "erase:a", "insert:c"}));
}

TEST(Protocol, TheVictimIsOnlyRequestedWhenANewKeyFindsTheCacheFull) {
  Log log;
  auto cache = makePolicyCache(2, std::make_unique<RecordingPolicy>(&log));
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("b", "2b");  // full but only a replacement
  cache->erase("a");
  cache->put("c", "3");  // room again
  EXPECT_EQ(std::count(log.begin(), log.end(), std::string("victim")), 0);
}

TEST(Protocol, AnErasedKeyNeverComesBackAsAVictim) {
  auto cache = fifoCache(2);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("a");
  cache->put("c", "3");
  cache->put("d", "4");  // the policy must name b, the oldest key that is still stored
  EXPECT_FALSE(cache->contains("b"));
  EXPECT_TRUE(cache->contains("c"));
  EXPECT_TRUE(cache->contains("d"));
  EXPECT_EQ(cache->size(), 2);
}
