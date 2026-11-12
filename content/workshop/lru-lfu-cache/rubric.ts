import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-order", text: "Tracks the order of use and names the least recently used key in O(1), without knowing values or capacity", phase: "base", owners: ["LruPolicy", "EvictionPolicy", "RecencyList", "LruList", "RecencyOrder", "LruOrder", "LruTracker"] },
  { id: "res-facade", text: "Owns the values, enforces the capacity and sequences lookup, use-recording, eviction and insertion", phase: "base", owners: ["CacheImpl", "LruCache", "CacheCore", "Cache", "CacheStore"] },
  { id: "res-seam", text: "Chooses the victim by a rule the cache does not know: the second rule slots in beside the first", phase: "storm1", owners: ["EvictionPolicy", "EvictionStrategy", "EvictionRule", "VictimPolicy"] },
  { id: "res-lfu", text: "Counts uses and picks the least used victim, ties by recency, forgetting a key that leaves", phase: "storm1", owners: ["LfuPolicy", "FrequencyPolicy", "LfuTracker", "LfuList", "FrequencyOrder"] },
  { id: "res-expiry", text: "Knows when each entry dies and reports which are dead at a given time, independent of the eviction rule", phase: "storm2", owners: ["ExpiryIndex", "ExpiryTracker", "TtlIndex", "ExpiryQueue", "Expirations"] },
];
