import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operation, owns the clock and the table of keys, and creates state for a key on first sight", phase: "base", owners: ["LimiterImpl", "RateLimiterImpl", "KeyedLimiter", "Limiter", "LimiterService"] },
  { id: "res-bucket", text: "Owns the token arithmetic for one key: lazy refill, cap, consuming and the retry-after", phase: "base", owners: ["TokenBucketLimit", "TokenBucket", "Bucket", "TokenBucketState", "TokenBucketPolicy"] },
  { id: "res-cost", text: "Rejects costs that can never succeed before any state is touched or created", phase: "base", owners: ["LimiterImpl", "RateLimiterImpl", "CostValidator", "KeyedLimiter", "Limiter"] },
  { id: "res-algo", text: "Defines the per-key algorithm as an abstraction, so a second algorithm is a new class and not an edit to the others", phase: "storm1", owners: ["Limit", "LimitAlgorithm", "Algorithm", "RateLimitPolicy", "LimitStrategy"] },
  { id: "res-window", text: "Owns the log of recent requests for one key and the wait until enough of it expires", phase: "storm1", owners: ["SlidingWindowLimit", "SlidingWindow", "WindowLog", "SlidingWindowLog", "WindowPolicy"] },
  { id: "res-idle", text: "Each algorithm says when its own state is indistinguishable from a fresh key; the owner of the table only asks and forgets", phase: "storm2", owners: ["Limit", "LimitAlgorithm", "Algorithm", "TokenBucketLimit", "SlidingWindowLimit"] },
];
