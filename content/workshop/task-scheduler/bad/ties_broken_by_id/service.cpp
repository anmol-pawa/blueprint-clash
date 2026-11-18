#include <array>
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <tuple>
#include <unordered_map>
#include <utility>
#include "api_storm2.h"

// The scheduler's idea of "now": simulated ticks that only move when told to.
class SimClock {
 public:
  long long now() const { return now_; }
  void set(long long time) { now_ = time; }

 private:
  long long now_ = 0;
};


// How a job repeats: never (period 0) or every `period` ticks at a fixed rate.
class Cadence {
 public:
  explicit Cadence(long long period = 0) : period_(period) {}

  bool repeats() const { return period_ > 0; }
  long long period() const { return period_; }
  long long after(long long at) const { return at + period_; }

 private:
  long long period_;
};


// Decides whether an occurrence that is due should really run (Strategy). `target` is the time advanceTo() was given.
class CatchUpPolicy {
 public:
  virtual ~CatchUpPolicy() = default;
  virtual bool shouldRun(long long at, long long period, long long target) const = 0;
};

class RunAll : public CatchUpPolicy {
 public:
  bool shouldRun(long long, long long, long long) const override { return true; }
};

// The occurrence after this one is still due, so this one is not the latest.
class RunLatest : public CatchUpPolicy {
 public:
  bool shouldRun(long long at, long long period, long long target) const override { return at + period > target; }
};

class RunOnTime : public CatchUpPolicy {
 public:
  bool shouldRun(long long at, long long, long long target) const override { return at == target; }
};

inline std::shared_ptr<const CatchUpPolicy> makePolicy(sched::CatchUp which) {
  static const std::array<std::shared_ptr<const CatchUpPolicy>, 3> table = {
      std::make_shared<RunAll>(), std::make_shared<RunLatest>(), std::make_shared<RunOnTime>()};
  return table[static_cast<std::size_t>(which)];
}


// One pending job. The job is shared, not copied, so the next occurrence of a recurring job runs the same callable.
struct Entry {
  std::string id;
  long long at = 0;
  int priority = 0;
  unsigned long rank = 0;  // the order of scheduling; a recurring job keeps its rank in every round
  Cadence cadence;
  std::shared_ptr<const CatchUpPolicy> catchUp;
  std::shared_ptr<const sched::Job> job;
};

inline Entry nextOccurrence(const Entry& e) {
  Entry next = e;
  next.at = e.cadence.after(e.at);
  return next;
}


// The pending jobs in running order: (time, higher priority first, scheduling order), with an index by id.
class RunQueue {
 public:
  bool contains(const std::string& id) const { return index_.count(id) > 0; }
  std::size_t size() const { return byOrder_.size(); }

  void insert(const Entry& e) {
    const Key key = keyOf(e);
    index_[e.id] = key;
    byOrder_[key] = e;
  }

  bool remove(const std::string& id) {
    const auto it = index_.find(id);
    if (it == index_.end()) return false;
    byOrder_.erase(it->second);
    index_.erase(it);
    return true;
  }

  // Takes the first entry out if it is due at `target`.
  bool popDue(long long target, Entry& out) {
    if (byOrder_.empty() || byOrder_.begin()->second.at > target) return false;
    out = byOrder_.begin()->second;
    index_.erase(out.id);
    byOrder_.erase(byOrder_.begin());
    return true;
  }

  bool timeOf(const std::string& id, long long& at) const {
    const auto it = index_.find(id);
    if (it == index_.end()) return false;
    at = std::get<0>(it->second);
    return true;
  }

 private:
  using Key = std::tuple<long long, int, unsigned long>;

  static Key keyOf(const Entry& e) { return Key(e.at, -e.priority, e.rank); }

  std::map<Key, Entry> byOrder_;
  std::unordered_map<std::string, Key> index_;
};


// Runs what is due. Each entry leaves the queue before its job starts, and a recurring job's next occurrence goes back
// first, so a job may schedule or cancel anything (itself included) while it runs.
class Dispatcher {
 public:
  std::size_t runDue(RunQueue& queue, SimClock& clock, long long target) const {
    std::size_t ran = 0;
    Entry e;
    while (queue.popDue(target, e)) {
      if (e.cadence.repeats()) queue.insert(nextOccurrence(e));
      clock.set(e.at);
      if (!e.catchUp->shouldRun(e.at, e.cadence.period(), target)) continue;
      (*e.job)();
      ++ran;
    }
    clock.set(target);
    return ran;
  }
};


class SchedulerImpl : public sched::CatchUpScheduler {
 public:
  sched::Status schedule(const std::string& id, long long at, int priority, sched::Job job) override {
    return admit(id, at, priority, Cadence(), makePolicy(sched::CatchUp::All), std::move(job));
  }

  sched::Status scheduleEvery(const std::string& id, long long first, long long period, int priority, sched::Job job) override {
    return scheduleEveryWith(id, first, period, priority, sched::CatchUp::All, std::move(job));
  }

  sched::Status scheduleEveryWith(const std::string& id, long long first, long long period, int priority,
                                  sched::CatchUp policy, sched::Job job) override {
    if (!validId(id)) return sched::Status::InvalidId;
    if (!job) return sched::Status::InvalidJob;
    if (period < 1 || period > sched::kMaxPeriod) return sched::Status::InvalidPeriod;
    return admit(id, first, priority, Cadence(period), makePolicy(policy), std::move(job));
  }

  sched::Status cancel(const std::string& id) override {
    return queue_.remove(id) ? sched::Status::Ok : sched::Status::NotFound;
  }

  std::size_t advanceTo(long long time) override {
    if (time < clock_.now()) return 0;
    return dispatcher_.runDue(queue_, clock_, time);
  }

  long long now() const override { return clock_.now(); }
  std::size_t pending() const override { return queue_.size(); }

  sched::Status nextRun(const std::string& id, long long& at) const override {
    return queue_.timeOf(id, at) ? sched::Status::Ok : sched::Status::NotFound;
  }

 private:
  static bool validId(const std::string& id) { return !id.empty() && id.size() <= 32; }

  sched::Status admit(const std::string& id, long long at, int priority, Cadence cadence,
                      std::shared_ptr<const CatchUpPolicy> policy, sched::Job job) {
    if (!validId(id)) return sched::Status::InvalidId;
    if (!job) return sched::Status::InvalidJob;
    if (at > sched::kMaxTime) return sched::Status::InvalidTime;
    if (at < clock_.now()) return sched::Status::InThePast;
    if (queue_.contains(id)) return sched::Status::DuplicateId;
    Entry e;
    e.id = id;
    e.at = at;
    e.priority = priority;
    e.rank = static_cast<unsigned char>(id[0]) * 1000000ul + nextRank_++;
    e.cadence = cadence;
    e.catchUp = std::move(policy);
    e.job = std::make_shared<const sched::Job>(std::move(job));
    queue_.insert(e);
    return sched::Status::Ok;
  }

  SimClock clock_;
  RunQueue queue_;
  Dispatcher dispatcher_;
  unsigned long nextRank_ = 0;
};


std::unique_ptr<sched::Scheduler> sched::makeScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<sched::RecurringScheduler> sched::makeRecurringScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<sched::CatchUpScheduler> sched::makeCatchUpScheduler() { return std::make_unique<SchedulerImpl>(); }

