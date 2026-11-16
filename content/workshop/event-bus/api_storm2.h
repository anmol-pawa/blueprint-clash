#pragma once
// Change Storm 2 adds priorities and one-shot subscriptions. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace bus {

struct Options {
  // Higher runs first. Subscriptions with equal priority keep the order they subscribed in. subscribe() without
  // options is priority 0, and negative priorities are allowed.
  int priority = 0;
  // A once subscription receives at most one event. It is removed (subscriptionCount() drops, unsubscribe(id) returns
  // false) just before its handler runs, so the handler is never run a second time, not even by a publish it makes itself.
  bool once = false;
};

class OrderedBus : public EventBus {
 public:
  using EventBus::subscribe;
  virtual int subscribe(const std::string& pattern, Handler handler, Options options) = 0;
};

// Patterns work as in Storm 1.
std::unique_ptr<OrderedBus> makeOrderedBus();

}  // namespace bus
