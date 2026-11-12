#pragma once
#include <list>
#include <string>
#include <unordered_map>

#include "api_storm2.h"

// Least recently used first: a list ordered by recency plus an index into it, so every call is O(1).
class LruPolicy : public cachex::EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { moveToFront(key); }
  void onAccess(const std::string& key) override { moveToFront(key); }

  void onErase(const std::string& key) override {
    const auto found = position_.find(key);
    if (found == position_.end()) return;
    order_.erase(found->second);
    position_.erase(found);
  }

  std::string chooseVictim() override { return order_.back(); }

 private:
  void moveToFront(const std::string& key) {
    onErase(key);
    order_.push_front(key);
    position_[key] = order_.begin();
  }

  std::list<std::string> order_;  // front = most recently used
  std::unordered_map<std::string, std::list<std::string>::iterator> position_;
};
