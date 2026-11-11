#pragma once
#include <algorithm>
#include <cstddef>
#include <mutex>
#include <vector>
#include "api.h"

struct Stats {
  long long count = 0;
  long long sum = 0;
  int max = 0;
};

// Every access to `stats_` happens while `lock_` is held, through an RAII guard, so the lock is
// released on every path (early returns included). The lock is injected so it can be observed in tests.
class SafeStats {
 public:
  explicit SafeStats(Lock& lock) : lock_(lock) {}

  bool record(int value) {
    if (value < 0) return false;  // reject before touching shared state; no lock needed to say no
    std::lock_guard<Lock> guard(lock_);
    add(value);
    return true;
  }

  // One critical section for the whole batch: observers see all of it or none of it.
  std::size_t recordAll(const std::vector<int>& values) {
    std::lock_guard<Lock> guard(lock_);
    std::size_t accepted = 0;
    for (const int v : values) {
      if (v < 0) continue;
      add(v);
      ++accepted;
    }
    return accepted;
  }

  Stats snapshot() const {
    return stats_;
  }

  void reset() {
    std::lock_guard<Lock> guard(lock_);
    stats_ = Stats();
  }

 private:
  void add(int value) {  // caller holds lock_
    ++stats_.count;
    stats_.sum += value;
    stats_.max = std::max(stats_.max, value);
  }

  Lock& lock_;
  Stats stats_;
};
