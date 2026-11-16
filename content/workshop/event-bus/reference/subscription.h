#pragma once
#include <string>
#include <utility>

#include "topic_matcher.h"

// One registered listener. It knows whether it still wants to hear things (it can be cancelled while a delivery that
// already holds it is in progress) and whether a given event is for it. It does not know how topics are compared.
class Subscription {
 public:
  Subscription(evb::SubscriptionId id, std::string pattern, evb::Handler handler, evb::Filter filter)
      : id_(id), pattern_(std::move(pattern)), handler_(std::move(handler)), filter_(std::move(filter)) {}

  evb::SubscriptionId id() const { return id_; }

  void cancel() { active_ = false; }

  // Still subscribed, pattern matches, and the filter (if any) agrees. The filter runs last and only when it has to.
  bool wants(const TopicMatcher& matcher, const evb::Event& event) const {
    return active_ && matcher.matches(pattern_, event.topic) && (!filter_ || filter_(event));
  }

  void deliver(const evb::Event& event) const { handler_(event); }

 private:
  evb::SubscriptionId id_;
  std::string pattern_;
  evb::Handler handler_;
  evb::Filter filter_;
  bool active_ = true;
};
