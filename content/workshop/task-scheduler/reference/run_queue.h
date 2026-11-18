#pragma once
#include <cstddef>
#include <map>
#include <string>
#include <tuple>
#include <unordered_map>

#include "entry.h"

// The pending jobs in running order: (time, higher priority first, scheduling order), with an index by id.
class RunQueue {
 public:
  bool contains(const std::string& id) const { return index_.count(id) > 0; }
  std::size_t size() const { return byOrder_.size(); }

  void insert(const Entry& e) {
    const Key key = keyOf(e);
    index_[e.id] = key;
    byOrder_[key] = e;
  }

  bool remove(const std::string& id) {
    const auto it = index_.find(id);
    if (it == index_.end()) return false;
    byOrder_.erase(it->second);
    index_.erase(it);
    return true;
  }

  // Takes the first entry out if it is due at `target`.
  bool popDue(long long target, Entry& out) {
    if (byOrder_.empty() || byOrder_.begin()->second.at > target) return false;
    out = byOrder_.begin()->second;
    index_.erase(out.id);
    byOrder_.erase(byOrder_.begin());
    return true;
  }

  bool timeOf(const std::string& id, long long& at) const {
    const auto it = index_.find(id);
    if (it == index_.end()) return false;
    at = std::get<0>(it->second);
    return true;
  }

 private:
  using Key = std::tuple<long long, int, unsigned long>;

  static Key keyOf(const Entry& e) { return Key(e.at, -e.priority, e.rank); }

  std::map<Key, Entry> byOrder_;
  std::unordered_map<std::string, Key> index_;
};
