#pragma once
#include <limits>
#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

#include "api_storm2.h"
#include "expiry.h"
#include "policy.h"

// The facade. It owns the values, enforces the capacity and sequences the two helpers; it never decides
// who is evicted (the policy) or who is dead (the expiry index).
class CacheImpl : public cache::ExpiringCache {
 public:
  CacheImpl(int capacity, std::unique_ptr<EvictionPolicy> policy, const cache::Clock& clock)
      : capacity_(capacity), policy_(std::move(policy)), clock_(clock) {}

  void put(const std::string& key, int value) override {
    dropExpired();
    insert(key, value);
    expiry_.clear(key);
  }

  void putFor(const std::string& key, int value, long long ttl) override {
    dropExpired();
    if (ttl <= 0) {
      remove(key);
      return;
    }
    insert(key, value);
    const long long now = clock_.now();
    const bool neverDies = ttl > std::numeric_limits<long long>::max() - now;
    if (neverDies) expiry_.clear(key);
    else expiry_.set(key, now + ttl);
  }

  bool get(const std::string& key, int& value) override {
    dropExpired();
    auto found = values_.find(key);
    if (found == values_.end()) return false;
    policy_->onAccess(key);
    value = found->second;
    return true;
  }

  bool contains(const std::string& key) const override {
    return values_.count(key) > 0 && !expiry_.isExpired(key, clock_.now());
  }

  bool erase(const std::string& key) override {
    dropExpired();
    if (values_.count(key) == 0) return false;
    remove(key);
    return true;
  }

  int size() const override { return static_cast<int>(values_.size()) - expiry_.expiredCount(clock_.now()); }
  int capacity() const override { return capacity_; }

 private:
  void insert(const std::string& key, int value) {
    auto found = values_.find(key);
    if (found != values_.end()) {
      found->second = value;
      policy_->onAccess(key);
      return;
    }
    if (static_cast<int>(values_.size()) >= capacity_) remove(policy_->victim());
    values_.emplace(key, value);
    policy_->onInsert(key);
  }

  void remove(const std::string& key) {
    if (values_.erase(key) == 0) return;
    policy_->onRemove(key);
    expiry_.clear(key);
  }

  void dropExpired() {
    for (const std::string& key : expiry_.takeExpired(clock_.now())) remove(key);
  }

  int capacity_;
  std::unique_ptr<EvictionPolicy> policy_;
  const cache::Clock& clock_;
  ExpiryIndex expiry_;
  std::unordered_map<std::string, int> values_;
};
