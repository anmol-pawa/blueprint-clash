#pragma once
#include <functional>

#include "api.h"

// The retry policy: repeat a call while the gateway says "temporary", at most kMaxAttempts calls. Anything else is an
// answer and ends the loop. It knows nothing about payments, keys or ledgers.
class Retrier {
 public:
  pay::Reply run(const std::function<pay::Reply()>& attempt) const {
    pay::Reply reply = pay::Reply::TemporaryError;
    for (int calls = 0; calls < pay::kMaxAttempts && reply == pay::Reply::TemporaryError; ++calls) reply = attempt();
    return reply;
  }
};
