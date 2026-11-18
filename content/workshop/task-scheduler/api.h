#pragma once
// Public API for the Task Scheduler problem. The hidden tests only use what is declared here.
// You implement sched::makeScheduler() (in any of your .cpp files); everything behind it is your design.
#include <cstddef>
#include <functional>
#include <memory>
#include <string>

namespace sched {

enum class Status {
  Ok,
  InvalidId,      // the id is empty or longer than 32 characters
  InvalidJob,     // the job is an empty std::function
  InvalidTime,    // the time is beyond kMaxTime
  InThePast,      // the time is before now()
  DuplicateId,    // a pending job already has this id
  NotFound,       // no pending job has this id
  InvalidPeriod,  // reserved for recurring jobs (a later interface); schedule() never returns it
};

constexpr long long kMaxTime = 1000000000000LL;  // 10^12 ticks

using Job = std::function<void()>;

// A scheduler over SIMULATED time: nothing here reads a real clock. Time is a whole number of ticks that starts at 0 and
// moves only when the caller calls advanceTo(). Jobs run on the caller's thread, inside advanceTo().
//
// ORDER. Jobs run in this order: earlier time first; at the same time the higher priority number first (priority is any
// int, bigger means more urgent); at the same time and priority the job that was scheduled first runs first (FIFO).
//
// RUNNING. advanceTo(t) with t >= now() runs every pending job whose time is <= t, one at a time in the order above, and
// then sets now() to t. While a job runs, now() is the time that job was scheduled for (not t). A job may call schedule()
// and cancel() on the same scheduler: a job it schedules for a time <= t runs in this same advanceTo(), in its place in the
// order; a job it cancels does not run. Calling advanceTo() from inside a job is not allowed. The result is the number of
// jobs that ran. advanceTo(t) with t < now() does nothing and returns 0; time never goes backwards.
//
// A one-shot job is gone as soon as it starts running: its id is free again (a job may schedule itself again) and
// cancel() of it from inside itself is NotFound.
//
// CHECK ORDER for schedule(): InvalidId, InvalidJob, InvalidTime, InThePast, DuplicateId. A call that does not return Ok
// changes nothing. A time equal to now() is allowed and runs in the next advanceTo(), even advanceTo(now()).
class Scheduler {
 public:
  virtual ~Scheduler() = default;

  // Runs `job` once at tick `at`. An id is 1 to 32 characters, unique among pending jobs.
  virtual Status schedule(const std::string& id, long long at, int priority, Job job) = 0;

  // Removes a pending job so it never runs. NotFound if there is no such pending job.
  virtual Status cancel(const std::string& id) = 0;

  virtual std::size_t advanceTo(long long time) = 0;

  virtual long long now() const = 0;

  // The number of pending jobs.
  virtual std::size_t pending() const = 0;

  // The tick of the next run of a pending job. `at` is touched only on Ok; NotFound otherwise.
  virtual Status nextRun(const std::string& id, long long& at) const = 0;
};

std::unique_ptr<Scheduler> makeScheduler();

}  // namespace sched
