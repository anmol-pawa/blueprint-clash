#pragma once
#include <iterator>
#include <map>
#include <string>
#include <unordered_map>
#include <vector>

// Knows when keys die. Only keys stored with a ttl appear here; everything else never expires.
class ExpiryIndex {
 public:
  void set(const std::string& key, long long expiresAt) {
    clear(key);
    where_[key] = byTime_.emplace(expiresAt, key);
  }
  void clear(const std::string& key) {
    auto it = where_.find(key);
    if (it == where_.end()) return;
    byTime_.erase(it->second);
    where_.erase(it);
  }
  bool isExpired(const std::string& key, long long now) const {
    auto it = where_.find(key);
    return it != where_.end() && it->second->first <= now;
  }
  // How many tracked keys are dead at `now`, without removing them.
  int expiredCount(long long now) const {
    return static_cast<int>(std::distance(byTime_.begin(), byTime_.upper_bound(now)));
  }
  // Removes every key that is dead at `now` from the index and returns them.
  std::vector<std::string> takeExpired(long long now) {
    std::vector<std::string> dead;
    auto end = byTime_.upper_bound(now);
    for (auto it = byTime_.begin(); it != end; ++it) {
      dead.push_back(it->second);
      where_.erase(it->second);
    }
    byTime_.erase(byTime_.begin(), end);
    return dead;
  }

 private:
  std::multimap<long long, std::string> byTime_;
  std::unordered_map<std::string, std::multimap<long long, std::string>::iterator> where_;
};
