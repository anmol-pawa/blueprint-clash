#pragma once
// Change Storm 1 adds wildcard topics. Everything from api.h still holds, with `topic` now a pattern.
#include "api.h"

namespace bus {

// makePatternBus() returns an EventBus whose subscribe() takes a topic pattern instead of an exact topic.
// Topics and patterns are words separated by '.', for example "orders.eu.created".
//   *  as a whole segment matches exactly one segment:        "orders.*.created" matches "orders.eu.created"
//   #  as a whole segment matches one or more segments and may only be the last segment:
//                                                            "orders.#" matches "orders.created" and "orders.eu.created", not "orders"
// A pattern without wildcards behaves exactly as before. Matching is case-sensitive and the whole topic must match.
// subscribe() refuses (kRefused, nothing registered) a pattern that is empty, has an empty segment ("a..b", ".a", "a."),
// has '#' anywhere but the last segment, or mixes a wildcard with other characters in one segment ("a*", "#b").
// publish() delivers an event whose topic is not a plain topic (empty, an empty segment, or containing * or #) to nobody.
// Handlers still run in the order they subscribed, whatever their patterns are; one event can reach several patterns,
// and a subscription is called at most once per event.
std::unique_ptr<EventBus> makePatternBus();

}  // namespace bus
