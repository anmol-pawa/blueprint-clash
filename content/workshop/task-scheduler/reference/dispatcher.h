#pragma once
#include <cstddef>

#include "run_queue.h"
#include "sim_clock.h"

// Runs what is due. Each entry leaves the queue before its job starts, and a recurring job's next occurrence goes back
// first, so a job may schedule or cancel anything (itself included) while it runs.
class Dispatcher {
 public:
  std::size_t runDue(RunQueue& queue, SimClock& clock, long long target) const {
    std::size_t ran = 0;
    Entry e;
    while (queue.popDue(target, e)) {
      if (e.cadence.repeats()) queue.insert(nextOccurrence(e));
      clock.set(e.at);
      if (!e.catchUp->shouldRun(e.at, e.cadence.period(), target)) continue;
      (*e.job)();
      ++ran;
    }
    clock.set(target);
    return ran;
  }
};
