# Editorial: Pub-sub event bus

## Requirements
Functional: `subscribe(topic, handler)` returns an id (1, 2, 3 ..., never reused; an empty topic or handler is refused with `kRefused` and uses no id), `unsubscribe(id)` says whether the id was live, `publish(event)` runs the handlers of that topic synchronously, in subscription order, and returns how many ran, `subscriptionCount()` counts live subscriptions. Handlers may re-enter the bus: a nested publish completes first, the subscriber set is fixed when a publish starts (late joiners miss the event, subscribers removed before their turn are skipped and not counted), and a handler may unsubscribe itself and finish. Hidden until asked: the order, the return value, the re-entrancy rules and the id contract. Non-goals: threads, handler failure (the build has no exceptions), persistence, typed events, replay.

**Change Storm 1, wildcard topics:** `makePatternBus()`: dotted topics, `*` is exactly one segment, `#` is one or more and only last, malformed patterns are refused, a published topic containing wildcards reaches nobody, order is still subscription order. Revealable by asking whether subscribers will want families of topics.

**Change Storm 2, priorities and one-shot subscriptions:** `makeOrderedBus()`: `Options{priority, once}`. Higher priority first, ties by subscription order; a once subscription is removed just before its handler runs. Revealable by asking whether every subscriber is equal and whether anyone listens just once.

## Reference design
- `TopicPattern` owns the topic syntax: `parse` (validation) and `matches` (one pattern, one plain topic). It knows nothing about subscribers.
- `Subscription` is one registration: id, pattern, handler, options and an `active` flag. It is shared (`shared_ptr`) between the registry and any dispatch in progress.
- `SubscriptionRegistry` owns the list and the id counter and produces a snapshot of the matching subscriptions in delivery order (a stable sort by priority over subscription order).
- `Dispatcher` runs one publish from that snapshot: skip inactive subscriptions, mark a once subscription spent before calling it, call, count.
- `BusImpl` is the facade: refuse bad input, parse the pattern, delegate.

**Storm 1 in the reference:** `TopicPattern` is the only class that changes (the base phase's exact match is the special case of a pattern without wildcards), and nothing else notices, because the registry only asks `matches(topic)`.

**Storm 2 in the reference:** `Options` flows into `Subscription`; the registry's sort gains a priority key; the dispatcher gains one line (remove a once subscription before delivering it). The active flag, which exists for re-entrancy, is what makes the once rule safe under nested publishes: the outer publish skips a once subscription that a nested publish already used.

## Alternatives
- **Live `std::map<std::string, std::vector<Handler>>` and loop over it.** The obvious first answer and fine for the base requirements until a handler unsubscribes: erasing during the loop skips an element or invalidates iterators. Copying the vector for each publish is the smallest fix; it still needs the active check for subscribers removed after the copy.
- **Copy-on-write subscriber list** (subscribe and unsubscribe build a new immutable vector, publish grabs a `shared_ptr` to the current one). No copy on publish and no lock needed to read; subscribe becomes O(n). The right choice when publishes vastly outnumber subscription changes.
- **Deferred removal** (mark dead, erase after the outermost publish finishes). Avoids the snapshot allocation, needs a depth counter and a place for the cleanup, and is the usual source of leaks when a publish never finishes.
- **A queue of events, drained by a loop** (nested publishes are appended, not delivered immediately). Removes recursion depth and gives breadth-first order, but changes the contract the tests pin: a nested publish no longer completes before the outer one continues, and `publish` can no longer tell the caller how many handlers ran.
- **A class hierarchy of topic matchers** (`ExactMatcher`, `StarMatcher`...). More ceremony than a pattern with a handful of rules justifies; a trie is the next step if matching must scale (see the follow-ups).
- **Observer on each publisher object** instead of a shared bus. Fewer indirections, but every subscriber must know every publisher, which is the coupling a bus exists to remove.

## Trade-offs
Synchronous delivery keeps the system easy to reason about and test (when publish returns, everything has happened) and couples the publisher's latency to its slowest handler. The snapshot costs an allocation per publish and buys safety under re-entrancy. Fixing the subscriber set at publish start gives deterministic behaviour but means a handler that subscribes cannot see the event that caused it, which surprises some callers; the alternative (late joiners see the current event) makes termination hard to reason about. Subscription order as the default order keeps behaviour predictable; priorities are an explicit opt-in. The linear scan over all subscriptions is O(subscriptions) per publish: simple and fast for tens of subscribers, wrong for tens of thousands.

## What breaks at 10x
At 10x the subscribers the scan on every publish dominates: index by first segment or use a segment trie, and cache the match set for hot topics. At 10x the publish rate the allocation of the snapshot shows up in profiles: copy-on-write lists remove it. At 10x the handlers per event the synchronous model makes tail latency the sum of the handlers: split slow ones onto queues with bounds and a stated overflow policy. At 10x the teams, topic names become a shared API with no owner: write them down, version event shapes, and add tracing of delivery trees so a surprising cascade can be explained. At 10x the processes, you no longer have this problem: you have a broker, with at-least-once delivery, ordering per key, retries and dead letters.

## Level signals
- **SDE2:** a working map from topic to handlers; subscribe, unsubscribe and publish behave; asks about order and what publish returns; handles a handler that unsubscribes without crashing (perhaps by copying the vector); adds wildcards by extending the match function.
- **Senior:** asks what handlers may do before coding and states the re-entrancy rules; snapshot plus liveness check, with a reason for each; ids that are never reused; validates input at the boundary; isolates topic matching in one class so the storm touches one place; priorities and once flags added without rewriting delivery; names the lock-while-calling-out deadlock and the handler-outlives-subscriber hazard.
- **Staff:** frames the bus as the in-process end of a spectrum (observer, mediator, queue, broker) and says when each applies; designs for scale (trie, copy-on-write, per-subscriber queues with bounds and overflow policy), failure isolation, cascade control (hop counts, depth limits, an orchestrator for multi-step flows) and observability; connects to the distributed case: durable log, offsets, idempotent handlers, schema evolution, dead letters.
