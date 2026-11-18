#pragma once
#include <map>
#include <string>
#include <tuple>
#include <unordered_map>

// The attempts that are due, in running order: (time, order of enqueueing), with an index by id so a job can be
// removed. Holds only ids; the job's data lives in the JobBook.
class RunQueue {
 public:
  void insert(const std::string& id, long long at, unsigned long rank) {
    const Key key(at, rank);
    index_[id] = key;
    byOrder_[key] = id;
  }

  bool remove(const std::string& id) {
    const auto it = index_.find(id);
    if (it == index_.end()) return false;
    byOrder_.erase(it->second);
    index_.erase(it);
    return true;
  }

  // Takes the first attempt out if it is due at `target`.
  bool popDue(long long target, std::string& id, long long& at) {
    if (byOrder_.empty() || byOrder_.begin()->first.first > target) return false;
    at = byOrder_.begin()->first.first;
    id = byOrder_.begin()->second;
    index_.erase(id);
    byOrder_.erase(byOrder_.begin());
    return true;
  }

 private:
  using Key = std::pair<long long, unsigned long>;

  std::map<Key, std::string> byOrder_;
  std::unordered_map<std::string, Key> index_;
};
