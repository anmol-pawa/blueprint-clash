import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "observer-topic",
  title: "Observer: a topic that notifies listeners without owning them",
  concepts: ["observer", "weak_ptr", "lapsed listener", "ownership", "re-entrancy", "iterator invalidation"],
  hints: [
    "Store `std::weak_ptr<Listener>`, not `shared_ptr` and not a raw pointer. A `weak_ptr` lets you ask 'is it still alive?' via `lock()` without keeping it alive.",
    "In `publish`, walk a **copy** of the subscriber list. A listener that unsubscribes or subscribes from inside `onMessage` then modifies the real list, not the one you are iterating. For each entry call `lock()` and only call the listener if you got a non-null `shared_ptr`.",
    "Prune dead entries (`expired()`) while you publish and in `subscriberCount()`. To avoid duplicates, compare `lock().get()` with the incoming pointer in `subscribe`; `unsubscribe` compares against `&listener`.",
  ],
  wrong: [
    { dir: "holds_shared_ptr", failingTests: ["Topic.DoesNotKeepListenersAlive", "Topic.DeadListenersAreSkippedAndNotCounted"], reason: "Stores shared_ptr: the topic becomes a co-owner, so a listener that its owner released is never destroyed and still receives messages (the lapsed-listener leak)." },
    { dir: "no_pruning", failingTests: ["Topic.SubscriberCountIgnoresDeadListeners"], reason: "Skips dead listeners when publishing but never removes them, so the list grows forever and the count includes ghosts." },
    { dir: "duplicate_subscribe", failingTests: ["Topic.SubscribingTwiceDeliversOnce"], reason: "Appends without checking: a listener subscribed twice hears every message twice." },
    { dir: "iterates_live_list", failingTests: ["Topic.ListenerMayUnsubscribeItselfDuringPublish"], reason: "Iterates the real vector while listeners modify it: iterator invalidation, so a re-entrant call skips or double-calls listeners (or crashes)." },
    { dir: "order_not_kept", failingTests: ["Topic.DeliversInSubscriptionOrder"], reason: "Delivers newest first (or in an unspecified order): consumers that rely on registration order break." },
  ],
};
