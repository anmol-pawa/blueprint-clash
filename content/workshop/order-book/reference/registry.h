#pragma once
#include <unordered_map>
#include <unordered_set>

#include "half_book.h"

// Every id ever accepted. An id is never reused, whatever became of its order.
class IdLedger {
 public:
  bool seen(int id) const { return used_.count(id) != 0; }
  void record(int id) { used_.insert(id); }

 private:
  std::unordered_set<int> used_;
};

// Where each RESTING order sits, so a cancel or an amend goes straight to it.
class RestingIndex {
 public:
  struct Handle {
    book::Side side;
    int price;
    HalfBook::Position position;
  };

  void add(int id, const Handle& handle) { where_.emplace(id, handle); }
  void forget(int id) { where_.erase(id); }
  const Handle* find(int id) const {
    const auto it = where_.find(id);
    return it == where_.end() ? nullptr : &it->second;
  }
  int count() const { return static_cast<int>(where_.size()); }

 private:
  std::unordered_map<int, Handle> where_;
};
