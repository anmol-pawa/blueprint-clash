import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations and sequences store, policy, counter and notification in the right order", phase: "base", owners: ["CacheImpl", "LruCache", "CacheCore", "CacheFacade"] },
  { id: "res-store", text: "Holds the entries and the capacity, with no opinion about who is evicted", phase: "base", owners: ["EntryStore", "Store", "Storage", "CacheStore", "EntryMap"] },
  { id: "res-order", text: "Tracks use order and names the victim; kept in step with every entry that arrives or leaves", phase: "base", owners: ["LruPolicy", "RecencyList", "LruOrder", "RecencyTracker", "LruTracker"] },
  { id: "res-stats", text: "Keeps the hit, miss and eviction totals in one place", phase: "base", owners: ["StatsCounter", "CacheStats", "Counters", "StatsRecorder", "Metrics"] },
  { id: "res-policy", text: "Decides who goes behind a seam the cache does not look through, so a new rule is a new class", phase: "storm1", owners: ["LruPolicy", "EvictionPolicy", "PolicyAdapter", "VictimSelector"] },
  { id: "res-notify", text: "Announces each removal to the listener after the state has changed", phase: "storm2", owners: ["RemovalNotifier", "Notifier", "ListenerRegistry", "RemovalPublisher", "EventPublisher"] },
];
