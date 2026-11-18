#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "queue_queries.h"

// The commands. The read side (every query) lives in QueueQueries, which owns the state.
class QueueImpl : public QueueQueries {
 public:
  QueueImpl() : runner_(book_, queue_, dead_, clock_) {}

  jobq::Status enqueue(const std::string& id, jobq::Handler handler) override {
    return enqueueWith(id, jobq::RetryPolicy{}, std::move(handler));
  }

  jobq::Status enqueueWith(const std::string& id, const jobq::RetryPolicy& policy, jobq::Handler handler) override {
    if (!handler) return checked(id, policy, nullptr);
    auto outcome = [h = std::move(handler)](int attempt) { return h(attempt) ? jobq::Outcome::Done : jobq::Outcome::Retry; };
    return checked(id, policy, std::move(outcome));
  }

  jobq::Status enqueueOutcome(const std::string& id, const jobq::RetryPolicy& policy, jobq::OutcomeHandler handler) override {
    return checked(id, policy, std::move(handler));
  }

  jobq::Status cancel(const std::string& id) override {
    JobRecord* job = book_.find(id);
    if (!job) return jobq::Status::NotFound;
    if (job->state != jobq::State::Waiting) return jobq::Status::NotWaiting;
    queue_.remove(id);
    job->state = jobq::State::Cancelled;
    return jobq::Status::Ok;
  }

  jobq::Status redrive(const std::string& id) override {
    JobRecord* job = book_.find(id);
    if (!job) return jobq::Status::NotFound;
    if (job->state != jobq::State::Dead) return jobq::Status::NotDead;
    dead_.remove(id);
    job->state = jobq::State::Waiting;
    job->attempts = 0;
    job->at = clock_.now();
    job->rank = nextRank_++;
    queue_.insert(id, job->at, job->rank);
    return jobq::Status::Ok;
  }

  std::size_t advanceTo(long long time) override { return time < clock_.now() ? 0 : runner_.runDue(time); }

 private:
  jobq::Status checked(const std::string& id, const jobq::RetryPolicy& policy, jobq::OutcomeHandler handler) {
    if (id.empty() || id.size() > jobq::kMaxIdLength) return jobq::Status::InvalidId;
    if (!handler) return jobq::Status::InvalidHandler;
    if (!RetryPlan::valid(policy)) return jobq::Status::InvalidPolicy;
    if (book_.contains(id)) return jobq::Status::DuplicateId;
    JobRecord job;
    job.id = id;
    job.plan = RetryPlan(policy);
    job.handler = std::make_shared<const jobq::OutcomeHandler>(std::move(handler));
    job.at = clock_.now();
    job.rank = nextRank_++;
    queue_.insert(id, job.at, job.rank);
    book_.add(std::move(job));
    return jobq::Status::Ok;
  }

  AttemptRunner runner_;
  unsigned long nextRank_ = 0;
};
