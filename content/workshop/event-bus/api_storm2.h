#pragma once
// Change Storm 2 adds content filters. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace evb {

// Decides whether one subscriber wants one event.
using Filter = std::function<bool(const Event&)>;

// A hierarchical bus (api_storm1.h) whose subscriptions can carry a filter. A subscription is called for an event only if
// its pattern matches AND its filter (when there is one) returns true. A null filter accepts everything.
//   - The filter is evaluated at publish time, once per publish, only for subscriptions whose pattern matches and that are
//     still subscribed, in subscription order, immediately before that subscription's handler would run.
//   - An event the filter rejects is not delivered and is not counted in publish()'s result.
class FilteredBus : public EventBus {
 public:
  using EventBus::subscribe;
  virtual SubscriptionId subscribe(const std::string& topic, Handler handler, Filter filter) = 0;
};

std::unique_ptr<FilteredBus> makeFilteredBus();

}  // namespace evb
