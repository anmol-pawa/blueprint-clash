#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "dispatcher.h"

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
    e.rank = nextRank_++;
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
