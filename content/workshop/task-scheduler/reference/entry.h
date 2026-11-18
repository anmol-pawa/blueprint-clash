#pragma once
#include <memory>
#include <string>

#include "cadence.h"
#include "catch_up.h"

// One pending job. The job is shared, not copied, so the next occurrence of a recurring job runs the same callable.
struct Entry {
  std::string id;
  long long at = 0;
  int priority = 0;
  unsigned long rank = 0;  // the order of scheduling; a recurring job keeps its rank in every round
  Cadence cadence;
  std::shared_ptr<const CatchUpPolicy> catchUp;
  std::shared_ptr<const sched::Job> job;
};

inline Entry nextOccurrence(const Entry& e) {
  Entry next = e;
  next.at = e.cadence.after(e.at);
  return next;
}
