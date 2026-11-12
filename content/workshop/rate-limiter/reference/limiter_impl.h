#pragma once
#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

#include "api_storm2.h"
#include "limit.h"

// Creates the state for a key seen for the first time.
using LimitMaker = std::function<std::unique_ptr<Limit>(long long now)>;

// The public face: it owns the clock and the table of keys and delegates every number to a Limit.
// Adding an algorithm means writing a Limit and a LimitMaker; this class does not change.
class LimiterImpl : public rl::SweepableLimiter {
 public:
  LimiterImpl(std::shared_ptr<rl::Clock> clock, long long maxCost, LimitMaker maker)
      : clock_(std::move(clock)), maxCost_(maxCost), maker_(std::move(maker)) {}

  rl::Decision tryAcquire(const std::string& key, long long cost) override {
    if (cost < 1 || cost > maxCost_) return {false, 0, -1};
    const long long now = clock_->now();
    auto it = limits_.find(key);
    if (it == limits_.end()) it = limits_.emplace(key, maker_(now)).first;
    return it->second->tryAcquire(now, cost);
  }

  int trackedKeys() const override { return static_cast<int>(limits_.size()); }

  int sweep() override {
    const long long now = clock_->now();
    int forgotten = 0;
    for (auto it = limits_.begin(); it != limits_.end();) {
      if (it->second->isIdle(now)) {
        it = limits_.erase(it);
        ++forgotten;
      } else {
        ++it;
      }
    }
    return forgotten;
  }

  bool reset(const std::string& key) override { return limits_.erase(key) > 0; }

 private:
  std::shared_ptr<rl::Clock> clock_;
  long long maxCost_;
  LimitMaker maker_;
  std::unordered_map<std::string, std::unique_ptr<Limit>> limits_;
};
