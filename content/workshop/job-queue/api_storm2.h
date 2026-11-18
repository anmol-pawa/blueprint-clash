#pragma once
// Change Storm 2: failures that are not worth retrying, and sending dead jobs back.
#include "api_storm1.h"

namespace jobq {

// A handler may say more than "it failed":
//   Done   the work is finished (the job Succeeded).
//   Retry  it failed for now: retry under the job's policy (a failure of the last attempt kills the job).
//   Fatal  it can never work (a malformed message, say): the job is Dead at once, whatever attempts are left.
enum class Outcome { Done, Retry, Fatal };
using OutcomeHandler = std::function<Outcome(int attempt)>;

// Why a Dead job is dead.
enum class DeadReason { Exhausted, Fatal };

// makeDrainingQueue() has everything makePolicyQueue() has, plus outcomes, reasons and redrive.
//
// enqueueOutcome(...) has the checks and statuses of enqueueWith(). A plain bool handler behaves as Done / Retry.
//
// deadReason(id, out): Ok for a Dead job; NotFound for an unknown id; NotDead for a job that is not Dead (the out-parameter
// is touched only on Ok).
//
// redrive(id) sends a Dead job back: it becomes Waiting with its first attempt due at now(), its attempt count reset to
// 0 (the handler sees attempt 1 again), the same handler and policy, and a NEW place in the FIFO order (it queues behind
// everything already enqueued). It leaves the dead-letter queue at once. NotFound for an unknown id; NotDead otherwise.
class DrainingQueue : public PolicyQueue {
 public:
  virtual Status enqueueOutcome(const std::string& id, const RetryPolicy& policy, OutcomeHandler handler) = 0;
  virtual Status deadReason(const std::string& id, DeadReason& out) const = 0;
  virtual Status redrive(const std::string& id) = 0;
};

std::unique_ptr<DrainingQueue> makeDrainingQueue();

}  // namespace jobq
