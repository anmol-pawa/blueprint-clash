#include <algorithm>
#include <deque>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

using cachex::RemovalReason;

namespace {
using Events = std::vector<std::string>;

class FifoPolicy : public cachex::EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { queue_.push_back(key); }
  void onAccess(const std::string&) override {}
  void onErase(const std::string& key) override { queue_.erase(std::remove(queue_.begin(), queue_.end(), key), queue_.end()); }
  std::string chooseVictim() override { return queue_.front(); }

 private:
  std::deque<std::string> queue_;
};

const char* nameOf(RemovalReason reason) { return reason == RemovalReason::Evicted ? "evicted" : "erased"; }

// Records "key=value:reason". When given the cache it also looks at it from inside the callback.
class RecordingListener : public cachex::RemovalListener {
 public:
  explicit RecordingListener(Events* events) : events_(events) {}
  void watch(cachex::Cache* cache) { cache_ = cache; }
  void onRemoved(const std::string& key, const std::string& value, RemovalReason reason) override {
    events_->push_back(key + "=" + value + ":" + nameOf(reason));
    if (cache_ != nullptr) {
      sizesSeen.push_back(cache_->size());
      stillContained.push_back(cache_->contains(key));
    }
  }
  std::vector<int> sizesSeen;
  std::vector<bool> stillContained;

 private:
  Events* events_;
  cachex::Cache* cache_ = nullptr;
};

std::unique_ptr<cachex::ObservableCache> observed(int capacity, Events* events, std::shared_ptr<RecordingListener>* out = nullptr) {
  auto cache = cachex::makeObservableCache(capacity, std::make_unique<FifoPolicy>());
  auto listener = std::make_shared<RecordingListener>(events);
  cache->setListener(listener);
  if (out != nullptr) *out = listener;
  return cache;
}
}  // namespace

TEST(Listener, AnEvictionReportsTheKeyTheValueAndTheReason) {
  Events events;
  auto cache = observed(2, &events);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  EXPECT_EQ(events, (Events{"a=1:evicted"}));
}

TEST(Listener, ErasingReportsTheValueItHeld) {
  Events events;
  auto cache = observed(3, &events);
  cache->put("a", "1");
  cache->erase("a");
  EXPECT_EQ(events, (Events{"a=1:erased"}));
}

TEST(Listener, ReplacingAValueIsNotARemoval) {
  Events events;
  auto cache = observed(2, &events);
  cache->put("a", "1");
  cache->put("a", "2");
  cache->put("b", "3");
  cache->put("a", "4");
  EXPECT_TRUE(events.empty());
}

TEST(Listener, TheValueReportedIsTheLatestOne) {
  Events events;
  auto cache = observed(1, &events);
  cache->put("a", "old");
  cache->put("a", "new");
  cache->put("b", "x");
  EXPECT_EQ(events, (Events{"a=new:evicted"}));
}

TEST(Listener, ReadsPeeksAndErasingAnAbsentKeySayNothing) {
  Events events;
  auto cache = observed(2, &events);
  cache->put("a", "1");
  cache->get("a");
  cache->get("zzz");
  cache->contains("a");
  cache->erase("zzz");
  EXPECT_TRUE(events.empty());
}

TEST(Listener, EveryRemovalIsReportedOnceAndInOrder) {
  Events events;
  auto cache = observed(1, &events);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  cache->erase("c");
  EXPECT_EQ(events, (Events{"a=1:evicted", "b=2:evicted", "c=3:erased"}));
}

TEST(Listener, TheEntryIsGoneWhenTheListenerRunsForAnEviction) {
  Events events;
  std::shared_ptr<RecordingListener> listener;
  auto cache = observed(2, &events, &listener);
  listener->watch(cache.get());
  cache->put("a", "1");
  cache->put("b", "2");
  cache->put("c", "3");
  ASSERT_EQ(listener->sizesSeen.size(), 1u);
  EXPECT_EQ(listener->sizesSeen[0], 1);  // never above capacity, even for an instant
  EXPECT_FALSE(listener->stillContained[0]);
}

TEST(Listener, TheEntryIsGoneWhenTheListenerRunsForAnErase) {
  Events events;
  std::shared_ptr<RecordingListener> listener;
  auto cache = observed(3, &events, &listener);
  listener->watch(cache.get());
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("a");
  ASSERT_EQ(listener->sizesSeen.size(), 1u);
  EXPECT_EQ(listener->sizesSeen[0], 1);
  EXPECT_FALSE(listener->stillContained[0]);
}

TEST(Listener, ALaterListenerReplacesTheEarlierOneAndSeesOnlyLaterRemovals) {
  Events first;
  Events second;
  auto cache = observed(1, &first);
  cache->put("a", "1");
  cache->put("b", "2");  // evicts a, heard by the first listener
  cache->setListener(std::make_shared<RecordingListener>(&second));
  cache->put("c", "3");  // evicts b, heard by the second
  EXPECT_EQ(first, (Events{"a=1:evicted"}));
  EXPECT_EQ(second, (Events{"b=2:evicted"}));
}

TEST(Listener, ANullListenerSwitchesNotificationsOffWithoutHarm) {
  Events events;
  auto cache = observed(1, &events);
  cache->setListener(nullptr);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("b");
  EXPECT_TRUE(events.empty());
  EXPECT_EQ(cache->size(), 0);
}

TEST(Listener, ACacheWithoutAListenerWorksAsBefore) {
  auto cache = cachex::makeObservableCache(1, std::make_unique<FifoPolicy>());
  cache->put("a", "1");
  cache->put("b", "2");
  EXPECT_FALSE(cache->contains("a"));
  EXPECT_TRUE(cache->contains("b"));
}

TEST(Listener, ThePolicyStillChoosesWhoIsEvicted) {
  Events events;
  auto cache = observed(2, &events);  // FIFO policy
  cache->put("a", "1");
  cache->put("b", "2");
  cache->get("a");
  cache->put("c", "3");
  EXPECT_EQ(events, (Events{"a=1:evicted"}));
}

TEST(Listener, StatsStillCountOnlyEvictions) {
  Events events;
  auto cache = observed(1, &events);
  cache->put("a", "1");
  cache->put("b", "2");
  cache->erase("b");
  EXPECT_EQ(cache->stats().evictions, 1);
}

TEST(Listener, BadArgumentsAreRefused) {
  EXPECT_TRUE(cachex::makeObservableCache(0, std::make_unique<FifoPolicy>()) == nullptr);
  EXPECT_TRUE(cachex::makeObservableCache(2, nullptr) == nullptr);
}
