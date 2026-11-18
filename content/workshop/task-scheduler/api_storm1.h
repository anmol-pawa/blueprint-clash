#pragma once
// Change Storm 1: recurring jobs.
#include "api.h"

namespace sched {

constexpr long long kMaxPeriod = 1000000000LL;  // 10^9 ticks

// makeRecurringScheduler() has everything makeScheduler() has, plus jobs that repeat.
//
// scheduleEvery(id, first, period, priority, job) runs the job at `first`, `first + period`, `first + 2 * period`, ...
// until it is cancelled: a fixed rate measured from `first`, never from when a run happened. A period is 1 to
// kMaxPeriod ticks. CHECK ORDER: InvalidId, InvalidJob, InvalidPeriod, InvalidTime, InThePast, DuplicateId.
//
// A recurring job is ONE pending job whatever happens: pending() counts it once, its id stays taken, nextRun() is the
// time of its next occurrence, and cancel() ends the whole series (also from inside the job's own run, when no later
// occurrence runs). Every occurrence due in an advanceTo() runs, in the usual order against everything else
// (advanceTo(100) over a period of 10 starting at 0 runs eleven times, with now() at 0, 10, ..., 100). A recurring job
// keeps the place in the FIFO order it got when it was scheduled: at the same time and priority it runs before a job
// that was scheduled after it, and after one that was scheduled before it, in every round.
class RecurringScheduler : public Scheduler {
 public:
  virtual Status scheduleEvery(const std::string& id, long long first, long long period, int priority, Job job) = 0;
};

std::unique_ptr<RecurringScheduler> makeRecurringScheduler();

}  // namespace sched
