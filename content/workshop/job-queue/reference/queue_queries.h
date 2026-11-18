#pragma once
#include <string>
#include <vector>

#include "api_storm2.h"
#include "attempt_runner.h"

// The read side of the queue: it owns the state and answers every question about it without changing anything.
// QueueImpl adds the commands on top.
class QueueQueries : public jobq::DrainingQueue {
 public:
  long long now() const override { return clock_.now(); }
  std::size_t waiting() const override { return book_.waiting(); }
  std::vector<std::string> deadLetters() const override { return dead_.ids(); }

  jobq::Status state(const std::string& id, jobq::State& out) const override {
    const JobRecord* job = book_.find(id);
    if (!job) return jobq::Status::NotFound;
    out = job->state;
    return jobq::Status::Ok;
  }

  jobq::Status attempts(const std::string& id, int& out) const override {
    const JobRecord* job = book_.find(id);
    if (!job) return jobq::Status::NotFound;
    out = job->attempts;
    return jobq::Status::Ok;
  }

  jobq::Status nextAttempt(const std::string& id, long long& at) const override {
    const JobRecord* job = book_.find(id);
    if (!job) return jobq::Status::NotFound;
    if (job->state != jobq::State::Waiting) return jobq::Status::NotWaiting;
    at = job->at;
    return jobq::Status::Ok;
  }

  jobq::Status deadReason(const std::string& id, jobq::DeadReason& out) const override {
    const JobRecord* job = book_.find(id);
    if (!job) return jobq::Status::NotFound;
    if (job->state != jobq::State::Dead) return jobq::Status::NotDead;
    out = job->reason;
    return jobq::Status::Ok;
  }

 protected:
  SimClock clock_;
  JobBook book_;
  RunQueue queue_;
  DeadLetters dead_;
};
