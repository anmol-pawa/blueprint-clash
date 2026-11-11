#pragma once
#include <cstddef>
#include <vector>
#include "api.h"

struct Stats {
  long long count = 0;
  long long sum = 0;
  int max = 0;
};

// TODO: guard every access to the three numbers with `lock_`, using an RAII guard.
// record() rejects negative values without leaving the lock held; recordAll() takes the lock once.
class SafeStats {
 public:
  explicit SafeStats(Lock& lock) : lock_(lock) {}
  bool record(int) { return false; }
  std::size_t recordAll(const std::vector<int>&) { return 0; }
  Stats snapshot() const { return Stats(); }
  void reset() {}

 private:
  Lock& lock_;
  Stats stats_;
};
