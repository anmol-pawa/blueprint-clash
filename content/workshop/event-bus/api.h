#pragma once
// Public API for the Event bus problem. The hidden tests only use what is declared here.
// You implement evb::makeBus() (in any of your .cpp files); everything behind it is your design.
// Handlers must not throw: this code is compiled without exceptions.
#include <cstddef>
#include <functional>
#include <memory>
#include <string>

namespace evb {

// One thing that happened: a topic and a payload, both plain strings.
struct Event {
  std::string topic;
  std::string payload;
};

using Handler = std::function<void(const Event&)>;

// Identifies one subscription. Valid ids are > 0; kInvalid is what a refused subscribe() returns.
using SubscriptionId = long long;
constexpr SubscriptionId kInvalid = 0;

// An in-process publish/subscribe bus. Delivery is synchronous: publish() returns after every handler has run, on the
// caller's thread.
class EventBus {
 public:
  virtual ~EventBus() = default;

  // Registers `handler` for events published to `topic`. A topic is any non-empty string, matched exactly (case-sensitive).
  // Returns kInvalid for an empty topic or an empty (null) handler. Valid ids are positive, increase with every
  // successful subscription, and are never handed out twice, even after an unsubscribe.
  virtual SubscriptionId subscribe(const std::string& topic, Handler handler) = 0;

  // Removes a subscription. Returns true if it was there, false for an unknown id, kInvalid or an id already removed.
  // The effect is immediate: a handler removed while a publish is still delivering is not called any more.
  virtual bool unsubscribe(SubscriptionId id) = 0;

  // Delivers the event to every handler subscribed to `topic`, in the order they subscribed. Returns how many handlers
  // were actually called. An empty topic delivers nothing and returns 0.
  // Handlers may subscribe, unsubscribe and publish while they run:
  //   - a subscription made during a delivery takes part from the next publish on, not in the one in progress;
  //   - an unsubscribe takes effect at once (see above);
  //   - a publish made from a handler is delivered completely, before the handler that made it returns.
  virtual std::size_t publish(const std::string& topic, const std::string& payload) = 0;
};

std::unique_ptr<EventBus> makeBus();

}  // namespace evb
