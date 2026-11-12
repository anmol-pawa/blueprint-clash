#pragma once
#include "api.h"

// The only place that counts. The cache says what happened; this keeps the totals.
class StatsCounter {
 public:
  void recordHit() { ++totals_.hits; }
  void recordMiss() { ++totals_.misses; }
  void recordEviction() { ++totals_.evictions; }
  cachex::Stats snapshot() const { return totals_; }

 private:
  cachex::Stats totals_;
};
