#pragma once
#include <string>
#include <utility>

#include "api.h"

struct Outcome {
  notif::SendResult last;  // what the final attempt said
  int attempts;            // how many calls were made
};

// Runs ONE channel until it delivers, fails for good, or runs out of attempts. It owns the retry rules (what is worth
// retrying, how many times, how long to wait) and nothing about which channel or what text.
class RetryPolicy {
 public:
  explicit RetryPolicy(notif::RetryConfig config) : config_(std::move(config)) {}

  Outcome run(notif::Channel& channel, const std::string& recipient, const std::string& body) const {
    long long delay = config_.firstDelayMs;
    Outcome outcome{notif::SendResult::Transient, 0};
    for (int attempt = 1; attempt <= config_.maxAttempts; ++attempt) {
      if (attempt > 1) {  // only ever before another attempt, never after the last one
        wait(delay);
        delay *= 2;
      }
      outcome.last = channel.send(recipient, body);
      outcome.attempts = attempt;
      if (outcome.last != notif::SendResult::Transient) break;
    }
    return outcome;
  }

 private:
  void wait(long long millis) const {
    if (config_.pause) config_.pause(millis);
  }

  notif::RetryConfig config_;
};
