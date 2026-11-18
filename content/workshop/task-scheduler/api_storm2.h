#pragma once
// Change Storm 2: what to do about missed occurrences.
#include "api_storm1.h"

namespace sched {

// When one advanceTo(t) finds several occurrences of a recurring job due (the process "slept" through them), the job's
// catch-up policy decides which of them run:
//   All         every occurrence runs, oldest first (what scheduleEvery() does).
//   Latest      only the latest occurrence that is <= t runs; the earlier ones are skipped.
//   OnTimeOnly  only an occurrence exactly at t runs; every occurrence before t counts as missed and is skipped.
// A skipped occurrence does not run and is not counted in the result of advanceTo(); the series carries on as if it
// had run, so after advanceTo(t) the job's nextRun() is its first occurrence after t. One-shot jobs always run, however
// late. now() while an occurrence runs is that occurrence's own time.
enum class CatchUp { All, Latest, OnTimeOnly };

// makeCatchUpScheduler() has everything makeRecurringScheduler() has, plus a policy per recurring job.
// Same checks as scheduleEvery(). The policy belongs to that job alone.
class CatchUpScheduler : public RecurringScheduler {
 public:
  virtual Status scheduleEveryWith(const std::string& id, long long first, long long period, int priority, CatchUp policy,
                                   Job job) = 0;
};

std::unique_ptr<CatchUpScheduler> makeCatchUpScheduler();

}  // namespace sched
