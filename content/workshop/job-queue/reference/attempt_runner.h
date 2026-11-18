#pragma once
#include <cstddef>
#include <string>

#include "dead_letters.h"
#include "job_book.h"
#include "run_queue.h"
#include "sim_clock.h"

// Runs what is due. Each attempt leaves the run queue before its handler is called and the job is marked Running, so a
// handler can enqueue or cancel anything while it runs. What the handler answers decides what happens to the job.
class AttemptRunner {
 public:
  AttemptRunner(JobBook& book, RunQueue& queue, DeadLetters& dead, SimClock& clock)
      : book_(book), queue_(queue), dead_(dead), clock_(clock) {}

  std::size_t runDue(long long target) {
    std::size_t ran = 0;
    std::string id;
    long long at = 0;
    while (queue_.popDue(target, id, at)) {
      clock_.set(at);
      attempt(*book_.find(id));
      ++ran;
    }
    clock_.set(target);
    return ran;
  }

 private:
  void attempt(JobRecord& job) {
    job.state = jobq::State::Running;
    const int number = ++job.attempts;
    const auto handler = job.handler;
    settle(job, (*handler)(number));
  }

  void settle(JobRecord& job, jobq::Outcome outcome) {
    if (outcome == jobq::Outcome::Done) {
      job.state = jobq::State::Succeeded;
    } else if (outcome == jobq::Outcome::Fatal) {
      bury(job, jobq::DeadReason::Fatal);
    } else if (job.plan.exhausted(job.attempts)) {
      bury(job, jobq::DeadReason::Exhausted);
    } else {
      job.state = jobq::State::Waiting;
      job.at = clock_.now() + job.plan.delayAfter(job.attempts);
      queue_.insert(job.id, job.at, job.rank);
    }
  }

  void bury(JobRecord& job, jobq::DeadReason reason) {
    job.state = jobq::State::Dead;
    job.reason = reason;
    dead_.add(job.id);
  }

  JobBook& book_;
  RunQueue& queue_;
  DeadLetters& dead_;
  SimClock& clock_;
};
