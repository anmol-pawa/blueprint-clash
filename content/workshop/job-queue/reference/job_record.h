#pragma once
#include <memory>
#include <string>

#include "retry_plan.h"

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
