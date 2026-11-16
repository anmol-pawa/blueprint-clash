#pragma once
#include "api_storm2.h"

// One rule about how much a single allowance can pay for. The two-step shape is the point: check() looks and never
// changes anything, commit() pays. Callers that combine several policies can look at all of them before paying any.
class LimitPolicy {
 public:
  virtual ~LimitPolicy() = default;

  // Would `permits` (> 0) be granted at `now`? If not, how long until they would be? Does not change the policy.
  virtual rl::Decision check(long long permits, long long now) const = 0;

  // Pays for `permits`. Only called after check() said yes at the same `now`.
  virtual void commit(long long permits, long long now) = 0;
};
