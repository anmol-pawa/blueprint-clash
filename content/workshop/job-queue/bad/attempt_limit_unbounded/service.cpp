#include <algorithm>
#include <array>
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <tuple>
#include <unordered_map>
#include <utility>
#include <vector>
#include "api_storm2.h"

// The queue's idea of "now": simulated ticks that only move when told to.
class SimClock {
 public:
  long long now() const { return now_; }
  void set(long long time) { now_ = time; }

 private:
  long long now_ = 0;
};




// How long to wait after the n-th failed attempt (Strategy). The caller applies the cap.
class BackoffRule {
 public:
  virtual ~BackoffRule() = default;
  virtual long long delayAfter(int failedAttempts, long long base) const = 0;
};

class FixedBackoff : public BackoffRule {
 public:
  long long delayAfter(int, long long base) const override { return base; }
};

class LinearBackoff : public BackoffRule {
 public:
  long long delayAfter(int failedAttempts, long long base) const override { return base * failedAttempts; }
};

class ExponentialBackoff : public BackoffRule {
 public:
  long long delayAfter(int failedAttempts, long long base) const override { return base * (1LL << (failedAttempts - 1)); }
};

inline std::shared_ptr<const BackoffRule> makeRule(jobq::Backoff which) {
  static const std::array<std::shared_ptr<const BackoffRule>, 3> table = {
      std::make_shared<FixedBackoff>(), std::make_shared<LinearBackoff>(), std::make_shared<ExponentialBackoff>()};
  return table[static_cast<std::size_t>(which)];
}




// One job's retry rules: how many attempts, and how long to wait between them (a rule, a base and a cap).
class RetryPlan {
 public:
  RetryPlan() : RetryPlan(jobq::RetryPolicy{}) {}
  explicit RetryPlan(const jobq::RetryPolicy& p)
      : maxAttempts_(p.maxAttempts), rule_(makeRule(p.backoff)), base_(p.base), cap_(p.cap) {}

  static bool valid(const jobq::RetryPolicy& p) {
    return p.maxAttempts >= 1 && p.base >= 1 && p.base <= jobq::kMaxBaseDelay &&
           p.cap >= p.base && p.cap <= jobq::kMaxDelayCap;
  }

  bool exhausted(int attemptsMade) const { return attemptsMade >= maxAttempts_; }
  long long delayAfter(int failedAttempts) const { return std::min(cap_, rule_->delayAfter(failedAttempts, base_)); }

 private:
  int maxAttempts_;
  std::shared_ptr<const BackoffRule> rule_;
  long long base_;
  long long cap_;
};




// One job, for ever: the handler and plan it was enqueued with, and where it is in its life.
struct JobRecord {
  std::string id;
  RetryPlan plan;
  std::shared_ptr<const jobq::OutcomeHandler> handler;
  jobq::State state = jobq::State::Waiting;
  jobq::DeadReason reason = jobq::DeadReason::Exhausted;  // meaningful only while Dead
  int attempts = 0;
  long long at = 0;       // when the next attempt is due (meaningful only while Waiting)
  unsigned long rank = 0; // the order of enqueueing; a retry keeps its rank
};




// Every job ever enqueued, by id. Records never move, so a reference stays valid while handlers add more jobs.
class JobBook {
 public:
  bool contains(const std::string& id) const { return jobs_.count(id) > 0; }

  JobRecord& add(JobRecord record) {
    const std::string id = record.id;
    return jobs_[id] = std::move(record);
  }

  JobRecord* find(const std::string& id) {
    const auto it = jobs_.find(id);
    return it == jobs_.end() ? nullptr : &it->second;
  }

  const JobRecord* find(const std::string& id) const {
    const auto it = jobs_.find(id);
    return it == jobs_.end() ? nullptr : &it->second;
  }

  std::size_t waiting() const {
    std::size_t n = 0;
    for (const auto& entry : jobs_) n += entry.second.state == jobq::State::Waiting ? 1 : 0;
    return n;
  }

 private:
  std::unordered_map<std::string, JobRecord> jobs_;
};



// The attempts that are due, in running order: (time, order of enqueueing), with an index by id so a job can be
// removed. Holds only ids; the job's data lives in the JobBook.
class RunQueue {
 public:
  void insert(const std::string& id, long long at, unsigned long rank) {
    const Key key(at, rank);
    index_[id] = key;
    byOrder_[key] = id;
  }

  bool remove(const std::string& id) {
    const auto it = index_.find(id);
    if (it == index_.end()) return false;
    byOrder_.erase(it->second);
    index_.erase(it);
    return true;
  }

  // Takes the first attempt out if it is due at `target`.
  bool popDue(long long target, std::string& id, long long& at) {
    if (byOrder_.empty() || byOrder_.begin()->first.first > target) return false;
    at = byOrder_.begin()->first.first;
    id = byOrder_.begin()->second;
    index_.erase(id);
    byOrder_.erase(byOrder_.begin());
    return true;
  }

 private:
  using Key = std::pair<long long, unsigned long>;

  std::map<Key, std::string> byOrder_;
  std::unordered_map<std::string, Key> index_;
};



// The ids of dead jobs, oldest death first.
class DeadLetters {
 public:
  void add(const std::string& id) { ids_.push_back(id); }
  void remove(const std::string& id) { ids_.erase(std::remove(ids_.begin(), ids_.end(), id), ids_.end()); }
  const std::vector<std::string>& ids() const { return ids_; }

 private:
  std::vector<std::string> ids_;
};




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



std::unique_ptr<jobq::Queue> jobq::makeQueue() { return std::make_unique<QueueImpl>(); }

std::unique_ptr<jobq::PolicyQueue> jobq::makePolicyQueue() { return std::make_unique<QueueImpl>(); }

std::unique_ptr<jobq::DrainingQueue> jobq::makeDrainingQueue() { return std::make_unique<QueueImpl>(); }

