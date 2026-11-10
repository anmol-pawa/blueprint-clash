#pragma once
#include <algorithm>
#include <cstddef>
#include <memory>
#include <string>
#include <vector>
#include "api.h"

// TODO: notify live listeners in subscription order without owning them, forget dead ones,
// ignore duplicate subscriptions and survive (un)subscribing from inside onMessage.
class Topic {
 public:
  void subscribe(const std::shared_ptr<Listener>&) {}
  void unsubscribe(const Listener&) {}
  std::size_t publish(const std::string&) { return 0; }
  std::size_t subscriberCount() { return 0; }
};
