#pragma once
// Public API for the Job Queue problem. The hidden tests only use what is declared here.
// You implement jobq::makeQueue() (in any of your .cpp files); everything behind it is your design.
#include <cstddef>
#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace jobq {

enum class Status {
  Ok,
  InvalidId,       // the id is empty or longer than 32 characters
  InvalidHandler,  // the handler is an empty std::function
  InvalidPolicy,   // reserved for per-job retry policies (a later interface); enqueue() never returns it
  DuplicateId,     // the id has been used before, in any state
  NotFound,        // the id has never been used
  NotWaiting,      // the id is known but the job is not Waiting (for cancel and nextAttempt)
  NotDead,         // reserved for the dead-letter queue (a later interface); nothing here returns it
};

enum class State {
  Waiting,    // an attempt (the first one or a retry) is due at nextAttempt()
  Running,    // its handler is being called right now
  Succeeded,  // the handler reported success
  Dead,       // out of attempts; the job sits in the dead-letter queue
  Cancelled,  // removed by cancel() before it could finish
};

// A handler is called once per attempt with the attempt number (1 for the first). It returns true when the work is
// done and false when it failed and may be tried again. Handlers run on the caller's thread, inside advanceTo().
using Handler = std::function<bool(int attempt)>;

constexpr int kMaxAttempts = 5;          // attempts per job: the first one and four retries
constexpr long long kBaseDelay = 10;     // ticks to wait after the first failed attempt
constexpr std::size_t kMaxIdLength = 32;

// A job queue over SIMULATED time: nothing here reads a real clock. Time is a whole number of ticks that starts at 0 and
// moves only when the caller calls advanceTo().
//
// ENQUEUE. enqueue(id, handler) makes a job whose first attempt is due at now(). CHECK ORDER: InvalidId, InvalidHandler,
// DuplicateId. A refused call changes nothing. An id is never reused: it stays taken after the job succeeded, died or was
// cancelled.
//
// ATTEMPTS. advanceTo(t) with t >= now() runs every attempt due at a time <= t, one at a time, earlier time first and
// at the same time the job that was enqueued first (FIFO: a retry keeps the place its job was given when it was
// enqueued), then sets now() to t. While an attempt runs, now() is that attempt's own time and the job is Running. The
// result is the number of attempts that ran. advanceTo(t) with t < now() does nothing and returns 0. A handler may call
// enqueue() and cancel() on this queue (a job it enqueues is due at now() and runs in the same advance); it must not call
// advanceTo().
//
// RETRIES. When an attempt fails and it was not the kMaxAttempts-th, the next attempt is due at (the time of the failed
// attempt) + kBaseDelay * 2^(failed attempts - 1): 10, 20, 40, 80 ticks after attempts 1, 2, 3, 4. The delay is measured
// from the attempt's own time, not from the time advanceTo() was asked to reach. A failure of the kMaxAttempts-th attempt
// makes the job Dead: it leaves the run queue and its id is appended to the dead-letter queue.
//
// CANCEL. cancel(id) turns a Waiting job into Cancelled (it never runs again). NotFound for an unknown id; NotWaiting for
// a known job that is Running, Succeeded, Dead or Cancelled.
class Queue {
 public:
  virtual ~Queue() = default;

  virtual Status enqueue(const std::string& id, Handler handler) = 0;
  virtual Status cancel(const std::string& id) = 0;
  virtual std::size_t advanceTo(long long time) = 0;
  virtual long long now() const = 0;

  // Queries. The out-parameter is touched only on Ok; NotFound for an unknown id.
  virtual Status state(const std::string& id, State& out) const = 0;
  // The number of attempts that have STARTED for the job (the current one counts while it runs).
  virtual Status attempts(const std::string& id, int& out) const = 0;
  // The tick of the next attempt; NotWaiting unless the job is Waiting.
  virtual Status nextAttempt(const std::string& id, long long& at) const = 0;

  // The number of Waiting jobs.
  virtual std::size_t waiting() const = 0;
  // The ids of the Dead jobs, in the order they died (oldest first).
  virtual std::vector<std::string> deadLetters() const = 0;
};

std::unique_ptr<Queue> makeQueue();

}  // namespace jobq
