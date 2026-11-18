#pragma once
// Change Storm 1: a retry policy per job.
#include "api.h"

namespace jobq {

enum class Backoff { Fixed, Linear, Exponential };

constexpr int kMaxPolicyAttempts = 20;
constexpr long long kMaxBaseDelay = 1000000LL;       // 10^6 ticks
constexpr long long kMaxDelayCap = 1000000000LL;     // 10^9 ticks

// How one job is retried. After the n-th failed attempt (n = 1, 2, ...) the next attempt is due `delay(n)` ticks after
// the failed one, where
//   Fixed        delay(n) = base
//   Linear       delay(n) = base * n
//   Exponential  delay(n) = base * 2^(n - 1)
// and every delay is at most `cap`. The job dies when attempt number `maxAttempts` fails. The default is exactly the
// behaviour of enqueue(): 5 attempts, exponential from 10 ticks (the cap is far beyond what 5 attempts can reach).
struct RetryPolicy {
  int maxAttempts = kMaxAttempts;
  Backoff backoff = Backoff::Exponential;
  long long base = kBaseDelay;
  long long cap = kMaxDelayCap;
};

// makePolicyQueue() has everything makeQueue() has, plus a policy per job.
// enqueueWith(id, policy, handler) CHECK ORDER: InvalidId, InvalidHandler, InvalidPolicy, DuplicateId.
// InvalidPolicy: maxAttempts outside 1..kMaxPolicyAttempts, base outside 1..kMaxBaseDelay, or cap outside
// base..kMaxDelayCap. A policy belongs to that job alone; enqueue() is enqueueWith(id, RetryPolicy{}, handler).
class PolicyQueue : public Queue {
 public:
  virtual Status enqueueWith(const std::string& id, const RetryPolicy& policy, Handler handler) = 0;
};

std::unique_ptr<PolicyQueue> makePolicyQueue();

}  // namespace jobq
