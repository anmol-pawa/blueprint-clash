// A plain put() on a key that had a ttl leaves the old expiry in place.
#include <climits>
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"

namespace {
using namespace cache;

// One class does everything: lookup, recency, use counts, expiry and eviction, with a scan to find the victim.
class Naive : public ExpiringCache {
 public:
  Naive(int capacity, Policy policy, const Clock& clock) : capacity_(capacity), policy_(policy), clock_(clock) {}

  void put(const std::string& key, int value) override {
    sweep();
    store(key, value, LLONG_MAX);
  }
  void putFor(const std::string& key, int value, long long ttl) override {
    sweep();
    if (ttl <= 0) {
      entries_.erase(key);
      return;
    }
    anyTtl_ = true;
    store(key, value, clock_.now() + ttl);
  }
  bool get(const std::string& key, int& value) override {
    sweep();
    auto it = entries_.find(key);
    if (it == entries_.end()) return false;
    touch(it->second);
    value = it->second.value;
    return true;
  }
  bool contains(const std::string& key) const override {
    auto it = entries_.find(key);
    return it != entries_.end() && live(it->second);
  }
  bool erase(const std::string& key) override {
    sweep();
    return entries_.erase(key) > 0;
  }
  int size() const override {
    if (!anyTtl_) return static_cast<int>(entries_.size());
    int n = 0;
    for (const auto& kv : entries_) n += live(kv.second) ? 1 : 0;
    return n;
  }
  int capacity() const override { return capacity_; }

 private:
  struct Entry {
    int value;
    int uses;
    long long last;
    long long expiresAt;
  };

  bool live(const Entry& e) const { return e.expiresAt > clock_.now(); }

  void sweep() {
    if (!anyTtl_) return;
    for (auto it = entries_.begin(); it != entries_.end();) {
      if (!live(it->second)) it = entries_.erase(it);
      else ++it;
    }
  }

  void touch(Entry& e) {
    ++e.uses;
    e.last = ++tick_;
  }

  void store(const std::string& key, int value, long long expiresAt) {
    auto it = entries_.find(key);
    if (it != entries_.end()) {
      it->second.value = value;
      if (expiresAt != LLONG_MAX) it->second.expiresAt = expiresAt;
      touch(it->second);
      return;
    }
    if (full()) evictOne();
    entries_[key] = Entry{value, 1, ++tick_, expiresAt};
  }

  bool goesFirst(const Entry& a, const Entry& b) const {
    if (policy_ == Policy::Lfu && a.uses != b.uses) return a.uses < b.uses;
    return a.last < b.last;
  }

  void evictOne() {
    auto victim = entries_.begin();
    for (auto it = entries_.begin(); it != entries_.end(); ++it) {
      if (goesFirst(it->second, victim->second)) victim = it;
    }
    entries_.erase(victim);
  }

  bool full() const { return static_cast<int>(entries_.size()) >= capacity_; }

  int capacity_;
  Policy policy_;
  const Clock& clock_;
  long long tick_ = 0;
  bool anyTtl_ = false;
  std::map<std::string, Entry> entries_;
};

class StillClock : public Clock {
 public:
  long long now() const override { return 0; }
};
}  // namespace

std::unique_ptr<cache::Cache> cache::makeCache(int capacity) { return makePolicyCache(capacity, Policy::Lru); }

std::unique_ptr<cache::Cache> cache::makePolicyCache(int capacity, Policy policy) {
  static const StillClock still;
  return makeExpiringCache(capacity, policy, still);
}

std::unique_ptr<cache::ExpiringCache> cache::makeExpiringCache(int capacity, Policy policy, const Clock& clock) {
  if (capacity < 1) return nullptr;
  return std::make_unique<Naive>(capacity, policy, clock);
}
