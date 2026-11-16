#pragma once
#include "subscription_registry.h"

// Runs one publish. Works from a snapshot so handlers can change the registry while it runs.
class Dispatcher {
 public:
  explicit Dispatcher(SubscriptionRegistry& registry) : registry_(registry) {}

  // Returns how many handlers ran.
  int dispatch(const bus::Event& event) {
    const auto snapshot = registry_.matching(event.topic);
    int delivered = 0;
    for (const auto& subscription : snapshot) {
      if (!subscription->active()) continue;  // removed by an earlier handler, or a once subscription already used
      if (subscription->once()) registry_.remove(subscription->id());
      subscription->deliver(event);
      ++delivered;
    }
    return delivered;
  }

 private:
  SubscriptionRegistry& registry_;
};
