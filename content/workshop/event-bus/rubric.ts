import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates requests (empty topic or handler) and sequences registry and dispatch", phase: "base", owners: ["BusImpl", "EventBusImpl", "InMemoryBus", "BusFacade", "Bus"] },
  { id: "res-registry", text: "Owns the subscriptions and the id counter; decides who is interested in a topic and in what order", phase: "base", owners: ["SubscriptionRegistry", "Registry", "SubscriberRegistry", "SubscriptionTable", "SubscriberList"] },
  { id: "res-dispatch", text: "Runs one publish from a snapshot and skips subscribers removed meanwhile, so handlers can re-enter the bus", phase: "base", owners: ["Dispatcher", "EventDispatcher", "DeliveryEngine", "Publisher", "Delivery"] },
  { id: "res-pattern", text: "Owns the topic syntax and the question 'does this pattern match this topic?', separate from delivery", phase: "storm1", owners: ["TopicPattern", "TopicMatcher", "PatternMatcher", "TopicFilter", "Pattern"] },
  { id: "res-subscription", text: "Represents one subscription: handler, pattern, priority, once flag and whether it is still active", phase: "storm2", owners: ["Subscription", "Subscriber", "Listener", "SubscriptionEntry", "Registration"] },
];
