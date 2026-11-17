#pragma once
#include <map>
#include <vector>

#include "api_storm2.h"

// The subscribers of a sheet (Observer). Ids count up and are never reused, so "subscribe order" is id order.
class ChangeFeed {
 public:
  int add(sheet::Listener listener) {
    listeners_[nextId_] = std::move(listener);
    return nextId_++;
  }

  void remove(int id) { listeners_.erase(id); }

  void publish(const sheet::Change& change) const {
    std::vector<int> ids;
    for (const auto& entry : listeners_) ids.push_back(entry.first);
    for (int id : ids) {
      const auto it = listeners_.find(id);
      if (it != listeners_.end()) it->second(change);
    }
  }

 private:
  std::map<int, sheet::Listener> listeners_;
  int nextId_ = 1;
};
