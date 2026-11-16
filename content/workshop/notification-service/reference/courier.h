#pragma once
#include <string>
#include <utility>
#include <vector>

#include "channel_registry.h"
#include "retry_policy.h"

// Carries one finished text along a route: each hop gets the whole retry policy to itself, the first delivery ends the
// trip, and a hop that gives up hands over to the next one. A route of one hop is the plain single-channel send.
class Courier {
 public:
  explicit Courier(RetryPolicy policy) : policy_(std::move(policy)) {}

  notif::Receipt deliver(const std::string& recipient, const std::string& body, const std::vector<Hop>& route) const {
    notif::Receipt receipt;
    receipt.status = notif::Status::Failed;
    receipt.body = body;
    for (const Hop& hop : route) {
      const Outcome outcome = policy_.run(*hop.channel, recipient, body);
      receipt.attempts += outcome.attempts;
      receipt.channel = hop.name;
      if (outcome.last == notif::SendResult::Delivered) {
        receipt.status = notif::Status::Delivered;
        break;
      }
    }
    return receipt;
  }

 private:
  RetryPolicy policy_;
};
