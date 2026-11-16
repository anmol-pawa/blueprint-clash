import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Validates the request, reads the clock once and sequences the collaborators; no rule of its own about buckets or windows", phase: "base", owners: ["LimiterImpl", "RateLimiterImpl", "LimiterFacade", "Limiter"] },
  { id: "res-bucket", text: "Owns the token arithmetic: refill, cap, partial progress and the wait for a given number of permits", phase: "base", owners: ["TokenBucket", "Bucket", "TokenBucketPolicy", "TokenBucketLimit"] },
  { id: "res-clients", text: "Keeps one allowance per client and creates it on first sight", phase: "base", owners: ["ClientPolicies", "ClientRegistry", "ClientTable", "BucketRegistry", "PolicyRegistry"] },
  { id: "res-strategy", text: "A common abstraction for 'how much can this allowance pay for' that bucket and window both implement", phase: "storm1", owners: ["LimitPolicy", "RateLimitPolicy", "LimitStrategy", "LimitAlgorithm", "Policy"] },
  { id: "res-window", text: "Owns the sliding-window arithmetic: the log of grants, what has left the window and the wait for room", phase: "storm1", owners: ["SlidingWindowLog", "SlidingWindow", "WindowPolicy", "WindowLog"] },
  { id: "res-layers", text: "Decides one request against several allowances: ask all first, charge all only if every one says yes, and merge the waits", phase: "storm2", owners: ["Admission", "AllOf", "PolicyChain", "LayeredPolicy", "CompositePolicy", "LimitChain"] },
];
