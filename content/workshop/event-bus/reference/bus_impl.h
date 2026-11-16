#pragma once
#include <string>
#include <utility>

#include "dispatcher.h"

// The facade: validates requests and sequences registry and dispatcher.
class BusImpl : public bus::OrderedBus {
 public:
  BusImpl() : dispatcher_(registry_) {}

  int subscribe(const std::string& topic, bus::Handler handler) override {
    return subscribe(topic, std::move(handler), bus::Options{});
  }

  int subscribe(const std::string& pattern, bus::Handler handler, bus::Options options) override {
    if (!handler) return bus::kRefused;
    auto parsed = TopicPattern::parse(pattern);
    if (!parsed) return bus::kRefused;
    return registry_.add(std::move(*parsed), std::move(handler), options)->id();
  }

  bool unsubscribe(int id) override { return registry_.remove(id); }

  int publish(const bus::Event& event) override { return dispatcher_.dispatch(event); }

  int subscriptionCount() const override { return registry_.size(); }

 private:
  SubscriptionRegistry registry_;
  Dispatcher dispatcher_;
};
