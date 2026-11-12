// Replacing a value does not refresh the key.
#include <list>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

#include "api_storm2.h"

namespace {
using namespace cachex;

// Least recently used first: a list ordered by recency plus an index into it.
class LruPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { touch(key); }
  void onAccess(const std::string& key) override {
    if (position_.count(key) != 0) touch(key);
  }
  void onErase(const std::string& key) override {
    auto it = position_.find(key);
    if (it == position_.end()) return;
    order_.erase(it->second);
    position_.erase(it);
  }
  std::string chooseVictim() override { return order_.back(); }

 private:
  void touch(const std::string& key) {
    onErase(key);
    order_.push_front(key);
    position_[key] = order_.begin();
  }
  std::list<std::string> order_;
  std::unordered_map<std::string, std::list<std::string>::iterator> position_;
};

// One class does everything: storage, the policy calls, counting and notification.
class Naive : public ObservableCache {
 public:
  Naive(int capacity, std::unique_ptr<EvictionPolicy> policy) : capacity_(capacity), policy_(std::move(policy)) {}

  void put(const std::string& key, const std::string& value) override {
    // PUT_PRECHECK
    auto it = data_.find(key);
    if (it != data_.end()) {
      // OVERWRITE_NOTIFY
      it->second = value;
      // not counted as a use // OVERWRITE_TOUCH
      return;
    }
    if (static_cast<int>(data_.size()) >= capacity_) evictOne();
    data_[key] = value;
    policy_->onInsert(key);
  }

  std::optional<std::string> get(const std::string& key) override {
    auto it = data_.find(key);
    if (it == data_.end()) {
      ++stats_.misses;
      // MISS_HOOK
      return std::nullopt;
    }
    ++stats_.hits;
    policy_->onAccess(key); // GET_TOUCH
    return it->second;
  }

  bool contains(const std::string& key) const override {
    // CONTAINS_HOOK
    return data_.count(key) != 0;
  }

  bool erase(const std::string& key) override {
    auto it = data_.find(key);
    if (it == data_.end()) return false;
    const std::string value = it->second;
    data_.erase(it);
    policy_->onErase(key); // ERASE_POLICY
    // ERASE_STATS
    notify(key, value, RemovalReason::Erased); // ERASE_NOTIFY
    return true;
  }

  int size() const override { return static_cast<int>(data_.size()); }
  int capacity() const override { return capacity_; }
  Stats stats() const override { return stats_; }
  void setListener(std::shared_ptr<RemovalListener> listener) override { listener_ = std::move(listener); }

 private:
  void evictOne() {
    const std::string victim = policy_->chooseVictim();
    const std::string value = data_.count(victim) != 0 ? data_[victim] : std::string();
    // NOTIFY_EARLY
    data_.erase(victim);
    policy_->onErase(victim);
    ++stats_.evictions;
    notify(victim, value, RemovalReason::Evicted); // NOTIFY_EVICT
  }

  void notify(const std::string& key, const std::string& value, RemovalReason reason) {
    if (listener_ != nullptr) listener_->onRemoved(key, value, reason);
  }

  int capacity_;
  std::unique_ptr<EvictionPolicy> policy_;
  std::unordered_map<std::string, std::string> data_;
  Stats stats_;
  std::shared_ptr<RemovalListener> listener_;
};
}  // namespace

std::unique_ptr<cachex::Cache> cachex::makeCache(int capacity) {
  if (capacity < 1) return nullptr;
  return std::make_unique<Naive>(capacity, std::make_unique<LruPolicy>());
}

std::unique_ptr<cachex::Cache> cachex::makePolicyCache(int capacity, std::unique_ptr<EvictionPolicy> policy) {
  if (capacity < 1 || policy == nullptr) return nullptr;
  return std::make_unique<Naive>(capacity, std::move(policy)); // POLICY_PASS
}

std::unique_ptr<cachex::ObservableCache> cachex::makeObservableCache(int capacity, std::unique_ptr<EvictionPolicy> policy) {
  if (capacity < 1 || policy == nullptr) return nullptr;
  return std::make_unique<Naive>(capacity, std::move(policy));
}
