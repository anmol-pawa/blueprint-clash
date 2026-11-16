import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Validates a request in the documented order and sequences the collaborators; no rule of its own about placeholders, retries or routes", phase: "base", owners: ["ServiceImpl", "NotificationServiceImpl", "NotificationManager", "NotificationEngine", "Notifier"] },
  { id: "res-render", text: "Owns the template grammar: finds placeholders, fills them from the params, reports a missing one, and never rescans inserted values", phase: "base", owners: ["TemplateRenderer", "Renderer", "TemplateEngine", "MessageRenderer", "TemplateFormatter"] },
  { id: "res-retry", text: "Owns the retry rules for one channel: which results are retried, the attempt limit, the doubling wait and the rule of no wait after the last attempt", phase: "base", owners: ["RetryPolicy", "Retrier", "RetryStrategy", "BackoffPolicy", "RetryHandler", "RetryRunner"] },
  { id: "res-registry", text: "Owns the named channels: registration rules and lookup, so the facade never touches a map of channels", phase: "base", owners: ["ChannelRegistry", "ChannelRouter", "ChannelManager", "Channels", "ChannelStore"] },
  { id: "res-route", text: "Carries one rendered text along an ordered list of channels, giving each its own retry run and stopping at the first delivery", phase: "storm1", owners: ["Courier", "Router", "Dispatcher", "FallbackChain", "RouteRunner", "Escalation", "DeliveryChain"] },
  { id: "res-once", text: "Adds 'at most one delivery per key' around the sender without editing it, and records a key only on a delivery", phase: "storm2", owners: ["IdempotentServiceImpl", "IdempotencyDecorator", "IdempotentService", "DedupingService", "IdempotencyGuard", "OnceDecorator"] },
];
