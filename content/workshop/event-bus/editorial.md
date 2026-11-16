# Editorial: Event bus (pub-sub)

## Requirements
Functional: `subscribe(topic, handler)` registers a handler for a non-empty topic matched exactly and returns a positive id (`kInvalid` for an empty topic or a null handler); `unsubscribe(id)` removes it and says whether it was there; `publish(topic, payload)` calls every handler of the topic synchronously, in subscription order, and returns how many were actually called. Ids grow and are never reused. Handlers may subscribe, unsubscribe and publish while they run: an unsubscribe is immediate, a new subscription starts with the next publish, a nested publish completes before its handler returns. Hidden until asked: exact (not prefix) matching, the id and unsubscribe contract, and every one of the mid-delivery rules. Non-goals: threads, exceptions (compiled without them), asynchronous delivery, persistence, distribution.

**Change Storm 1, hierarchical topics:** `makeHierarchicalBus`: dot-separated topics, `*` for one segment, `#` (last only) for zero or more, invalid patterns refused, wildcard topics cannot be published. Revealable by asking whether topics will have structure.

**Change Storm 2, filters:** `makeFilteredBus`: `subscribe(topic, handler, filter)`, evaluated at publish time, right before the handler, only for matching and still-subscribed entries; a rejected event is not delivered and not counted. Revealable by asking whether subscribers will want only some events of a topic.

## Reference design
- `SubscriptionTable` owns the live subscriptions in subscription order, the id counter and the snapshot. Entries are shared pointers, so `remove` can switch an entry off (`cancel`) while a delivery that already holds it is still walking.
- `Subscription` is one listener: pattern, handler, filter and an active flag. `wants(matcher, event)` is the single place that decides, in a cheap-to-expensive order: still active, pattern matches, filter agrees.
- `Dispatcher` is one delivery: for each entry in the snapshot, skip it unless it wants the event, call it, count it. It never touches the table, so a handler that changes the table cannot disturb the walk.
- `TopicMatcher` is the Strategy for what a topic is: `ExactMatcher` for the base bus. It answers three questions (valid pattern, valid topic, does this pattern match this topic) and nothing else.
- `BusImpl` is the facade: validate, ask the table, ask the dispatcher.

**Storm 1 in the reference:** one new class, `SegmentMatcher`, and one factory function. The table, dispatcher, subscription and facade are untouched, because they only ever see the `TopicMatcher` interface.

**Storm 2 in the reference:** one new field and one extra condition in `Subscription::wants`, a second `subscribe` overload that forwards to the same table call, and a factory. Be honest about this one: unlike Storm 1 it edits an existing class (twice), because the filter is a property of the subscription. What keeps the change small is that `wants` was already the only place that decides, so the count, the order and the 'removed means skipped' rule did not need to learn about filters.

## Alternatives
- **Map from topic to vector of handlers** is the usual first answer and is right for the base phase. It makes order across topics meaningless, which is harmless until wildcards arrive: a subscriber of `#` has to be merged into every topic's list, and 'subscription order across patterns' needs a global sequence number anyway. One ordered list with a matcher per entry is slower and has one set of rules.
- **Live list with an index loop** passes the first tests and then loops forever or skips an entry the first time a handler subscribes or unsubscribes. Snapshot plus an active flag is the minimum that is correct.
- **Copy the handlers into the snapshot instead of sharing entries** makes `unsubscribe` unable to affect a delivery in flight (the copies are not the registered ones), which breaks 'removed means not called'.
- **A queue for nested publishes** (publish from a handler is appended and drained later) avoids deep recursion and keeps one delivery at a time, at the price of a different contract: nested `publish` returns before its handlers run, so there is no count and no 'done when it returns'. It is the right design for an asynchronous bus and the wrong one for this brief.
- **Observer interface instead of `std::function`** (a `Listener` base class with `onEvent`) is the textbook form and costs a class per listener; `std::function` lets a lambda subscribe in one line and makes identity depend on the id, not on the pointer.
- **One class with `if (hierarchical)` and `if (filter)` branches** works for one storm and turns the table, the matching and the filtering into a single method by the second.

## Trade-offs
A snapshot per publish makes delivery safe and predictable at the cost of copying the shared pointers on every call, O(subscribers) even when few match; a table indexed by topic would make that O(matching) and is the first optimisation to reach for once measured. Immediate unsubscribe is safer than 'unsubscribe applies to the next publish' because the owner may be about to be destroyed, but it means every delivery asks each entry whether it is still active. Counting calls rather than matches makes the return value mean something to the caller. Exact matching is the cheapest and the clearest, wildcards add a grammar that must be specified exactly (what is a segment, what does `#` match when there is nothing left) or two teams will read it two ways. Synchronous delivery means a slow handler stalls the publisher and a handler that publishes can recurse deeply; both are accepted here and named in the follow-ups.

## What breaks at 10x
At 10x the subscribers, copying the whole list on every publish is the cost: index by topic (a hash map for exact topics, a trie for patterns) and snapshot only the matching entries. At 10x the publish rate, the lock around the table (once threads arrive) is the hot spot: copy-on-write subscriber lists (readers take a shared pointer to an immutable vector, writers swap in a new one) let publishers run without locking. At 10x the handler count per topic, a single slow handler dominates latency and the bus needs an asynchronous dispatcher with a bounded queue and a stated overflow policy. At 10x the teams, topics become an API: naming conventions, ownership, versioned payloads and a registry matter more than the code.

## Level signals
- **SDE2:** a working topic-to-handlers map with ids and unsubscribe; deliveries in order; asks what unsubscribe returns; handles the subscribe-during-publish case when prompted; copes with wildcards by adding a branch.
- **Senior:** asks what handlers may do while being called before coding; snapshot plus an active flag, with the reasons; an id counter that never goes back; a matcher abstraction so that wildcards slot in; one place that decides whether a subscriber wants an event, so filters are a small change; names the thread-safety and exception questions and where the lock must not be held.
- **Staff:** states the delivery contract as a set of guarantees (order, re-entrancy, counting, lifetime) and shows which are cheap to keep under threads or a queue; indexes patterns with a trie and keeps the linear matcher as a test oracle; compares in-process, queued and broker designs by what each guarantees and gives up; designs subscription lifetime (RAII handles, weak owners) so that dangling handlers are impossible by construction.
