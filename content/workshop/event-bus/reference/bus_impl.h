#pragma once
#include <memory>
#include <string>
#include <utility>

#include "dispatcher.h"

// The public face. It validates what comes in and sequences the collaborators; it has no rule of its own about
// topics, ordering or filters.
class BusImpl : public evb::FilteredBus {
 public:
  explicit BusImpl(std::unique_ptr<TopicMatcher> matcher) : matcher_(std::move(matcher)), dispatcher_(*matcher_) {}

  evb::SubscriptionId subscribe(const std::string& topic, evb::Handler handler) override {
    return subscribe(topic, std::move(handler), nullptr);
  }

  evb::SubscriptionId subscribe(const std::string& topic, evb::Handler handler, evb::Filter filter) override {
    if (handler == nullptr || !matcher_->validPattern(topic)) return evb::kInvalid;
    return table_.add(topic, std::move(handler), std::move(filter));
  }

  bool unsubscribe(evb::SubscriptionId id) override { return table_.remove(id); }

  std::size_t publish(const std::string& topic, const std::string& payload) override {
    if (!matcher_->validTopic(topic)) return 0;
    return dispatcher_.deliver(evb::Event{topic, payload}, table_.snapshot());
  }

 private:
  std::unique_ptr<TopicMatcher> matcher_;
  SubscriptionTable table_;
  Dispatcher dispatcher_;
};
