#pragma once
#include <cstddef>
#include <vector>

#include "subscription_table.h"

// Walks a snapshot for one event: skip what no longer wants it, call the rest in order, count the calls.
// Because it only reads the snapshot, a handler that subscribes, unsubscribes or publishes cannot disturb it.
class Dispatcher {
 public:
  explicit Dispatcher(const TopicMatcher& matcher) : matcher_(matcher) {}

  std::size_t deliver(const evb::Event& event, const std::vector<SubscriptionTable::Entry>& snapshot) const {
    std::size_t delivered = 0;
    for (const auto& subscription : snapshot) {
      if (!subscription->wants(matcher_, event)) continue;
      subscription->deliver(event);
      ++delivered;
    }
    return delivered;
  }

 private:
  const TopicMatcher& matcher_;
};
