#include "scheduler_impl.h"

std::unique_ptr<rooms::Scheduler> rooms::makeScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<rooms::FindingScheduler> rooms::makeFindingScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<rooms::SeriesScheduler> rooms::makeSeriesScheduler() { return std::make_unique<SchedulerImpl>(); }
