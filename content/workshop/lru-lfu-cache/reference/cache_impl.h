#pragma once
#include <memory>
#include <optional>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "entry_store.h"
#include "removal_notifier.h"
#include "stats_counter.h"

// The public face. It sequences the collaborators and holds no rule of its own about which entry goes:
// the store holds data, the policy picks victims, the counter counts and the notifier announces.
class CacheImpl : public cachex::ObservableCache {
 public:
  CacheImpl(int capacity, std::unique_ptr<cachex::EvictionPolicy> policy) : store_(capacity), policy_(std::move(policy)) {}

  void put(const std::string& key, const std::string& value) override {
    if (store_.contains(key)) {
      store_.store(key, value);
      policy_->onAccess(key);
      return;
    }
    if (store_.full()) evictOne();
    store_.store(key, value);
    policy_->onInsert(key);
  }

  std::optional<std::string> get(const std::string& key) override {
    const std::string* found = store_.find(key);
    if (found == nullptr) {
      stats_.recordMiss();
      return std::nullopt;
    }
    stats_.recordHit();
    policy_->onAccess(key);
    return *found;
  }

  bool contains(const std::string& key) const override { return store_.contains(key); }

  bool erase(const std::string& key) override {
    std::optional<std::string> value = store_.remove(key);
    if (!value.has_value()) return false;
    policy_->onErase(key);
    notifier_.removed(key, *value, cachex::RemovalReason::Erased);
    return true;
  }

  int size() const override { return store_.size(); }
  int capacity() const override { return store_.capacity(); }
  cachex::Stats stats() const override { return stats_.snapshot(); }

  void setListener(std::shared_ptr<cachex::RemovalListener> listener) override { notifier_.setListener(std::move(listener)); }

 private:
  // Order matters: the entry is gone and the policy informed before anyone is told.
  void evictOne() {
    const std::string victim = policy_->chooseVictim();
    std::optional<std::string> value = store_.remove(victim);
    policy_->onErase(victim);
    stats_.recordEviction();
    if (value.has_value()) notifier_.removed(victim, *value, cachex::RemovalReason::Evicted);
  }

  EntryStore store_;
  std::unique_ptr<cachex::EvictionPolicy> policy_;
  StatsCounter stats_;
  RemovalNotifier notifier_;
};
