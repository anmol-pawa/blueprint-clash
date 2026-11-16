#pragma once
// Public API for the Event bus problem. The hidden tests only use what is declared here.
// You implement bus::makeBus() (in any of your .cpp files); everything behind it is your design.
#include <functional>
#include <memory>
#include <string>

namespace bus {

// A message published on a topic. Topics are plain strings; the bus never looks at the payload.
struct Event {
  std::string topic;
  std::string payload;
};

using Handler = std::function<void(const Event&)>;

// What subscribe() returns when it refuses a request. Real subscription ids start at 1.
constexpr int kRefused = 0;

// An in-process publish/subscribe bus. Delivery is synchronous: publish() returns after every handler has run,
// on the caller's thread. The tests are single-threaded; say what you would do about threads, but do not build it.
class EventBus {
 public:
  virtual ~EventBus() = default;

  // Registers `handler` for events whose topic is exactly `topic` (case-sensitive, whole string).
  // Returns the subscription id: 1 for the first accepted subscription, then 2, 3, ... An id is never reused,
  // even after unsubscribe. Refused with kRefused (and nothing registered, no id used) when the topic is empty
  // or the handler is empty. The same handler may be subscribed any number of times; each is its own subscription.
  virtual int subscribe(const std::string& topic, Handler handler) = 0;

  // Removes a subscription. Returns true if it existed, false for an unknown or already removed id.
  virtual bool unsubscribe(int id) = 0;

  // Runs the handlers subscribed to event.topic, in the order they subscribed, and returns how many ran.
  // Handlers may call back into the bus while they run (subscribe, unsubscribe, publish):
  //  - a nested publish() is delivered completely, right away, before the outer publish continues;
  //  - the set of subscribers is fixed when publish() starts: a subscriber added meanwhile misses this event;
  //  - a subscriber removed meanwhile, before its turn, is not called, and does not count in the result;
  //  - a handler may unsubscribe itself and still finish normally.
  // An event with an empty topic is delivered to nobody (returns 0).
  virtual int publish(const Event& event) = 0;

  // How many subscriptions are registered.
  virtual int subscriptionCount() const = 0;
};

std::unique_ptr<EventBus> makeBus();

}  // namespace bus
