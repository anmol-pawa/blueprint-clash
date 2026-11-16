import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Validates what comes in and sequences the collaborators; no rule of its own about topics, ordering or filters", phase: "base", owners: ["BusImpl", "EventBusImpl", "EventBus", "Bus", "MessageBus"] },
  { id: "res-table", text: "Owns the live subscriptions: ids from a counter that never goes back, add and remove, and a snapshot that later changes cannot disturb", phase: "base", owners: ["SubscriptionTable", "SubscriptionRegistry", "SubscriberRegistry", "Registry", "SubscriberList", "Subscribers"] },
  { id: "res-dispatch", text: "Owns one delivery: walk the snapshot in order, skip what is no longer subscribed, call, and count the calls", phase: "base", owners: ["Dispatcher", "EventDispatcher", "Deliverer", "Delivery", "Publisher"] },
  { id: "res-matcher", text: "A common abstraction for 'how are topics written and compared' so that exact and wildcard matching are interchangeable", phase: "storm1", owners: ["TopicMatcher", "TopicMatching", "Matcher", "TopicStrategy", "TopicPolicy", "MatchPolicy"] },
  { id: "res-grammar", text: "Owns the wildcard grammar: segments, '*', '#' and which patterns and topics are valid", phase: "storm1", owners: ["SegmentMatcher", "WildcardMatcher", "HierarchicalMatcher", "DottedMatcher", "TopicPattern", "PatternMatcher"] },
  { id: "res-subscription", text: "A subscription object that decides whether it wants an event (still active, pattern matches, filter agrees) in one place", phase: "storm2", owners: ["Subscription", "Subscriber", "Listener", "SubscriptionEntry", "Observer"] },
];
