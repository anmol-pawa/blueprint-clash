#include "scheduler_impl.h"

std::unique_ptr<sched::Scheduler> sched::makeScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<sched::RecurringScheduler> sched::makeRecurringScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<sched::CatchUpScheduler> sched::makeCatchUpScheduler() { return std::make_unique<SchedulerImpl>(); }
