#pragma once
// Change Storm 1 adds hierarchical topics with wildcards. Everything from api.h still holds for the new bus.
#include "api.h"

namespace evb {

// A bus whose topics are dot-separated paths such as "orders.eu.created". The subscribe() argument is a pattern:
//   - a plain segment matches itself, exactly;
//   - "*" matches exactly one segment ("orders.*" matches "orders.created", not "orders" and not "orders.eu.created");
//   - "#" matches zero or more segments and may only be the LAST segment ("orders.#" matches "orders", "orders.created"
//     and "orders.eu.created"; "#" alone matches every topic).
// A segment is never empty. subscribe() returns kInvalid for a pattern with an empty segment ("", ".a", "a.", "a..b")
// or with "#" anywhere but last. publish() takes a concrete topic: one with an empty segment or a "*" / "#" segment is
// refused (returns 0, delivers nothing). Delivery is still in the order the subscriptions were made, across all patterns,
// and a subscription is called at most once per publish.
// makeBus() is unchanged: it still matches topics exactly.
std::unique_ptr<EventBus> makeHierarchicalBus();

}  // namespace evb
