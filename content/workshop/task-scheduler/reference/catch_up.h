#pragma once
#include <array>
#include <memory>

#include "api_storm2.h"

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
