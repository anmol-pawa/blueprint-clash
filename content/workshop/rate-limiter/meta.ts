import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "rate-limiter",
  title: "Rate limiter library",
  level: "Senior",
  parMinutes: 55,
  patterns: ["Strategy"],
  requirements: [
    { id: "R-bucket", text: "makeTokenBucket(clock, capacity, refillTicks): per-key buckets, a fresh key starts full, one token is added every refillTicks ticks up to capacity, refill is computed lazily and keeps progress towards the next token, and time spent full is not banked. Returns nullptr for a null clock, capacity below 1 or refillTicks below 1.", phase: "base", hidden: true },
    { id: "R-cost", text: "tryAcquire(key, cost) uses cost tokens when available. A cost below 1 or above the capacity is refused with remaining 0 and retryAfter -1 and changes no state. A refused request uses up nothing. Keys never affect each other.", phase: "base", hidden: true },
    { id: "R-retry", text: "Decision.remaining is the tokens left after the call; retryAfter is 0 when allowed, otherwise the smallest wait that makes the same request succeed, counting progress already made towards the next token.", phase: "base", hidden: true },
    { id: "R-window", text: "Storm 1: makeSlidingWindow(clock, maxUnits, windowTicks) behind the same RateLimiter interface. An allowed request counts from its tick until tick + windowTicks - 1 and leaves at tick + windowTicks. Costs are units, refused requests are not recorded, remaining is maxUnits minus units in the window, retryAfter is the wait until enough old units have left, keys have separate logs.", phase: "storm1", hidden: true },
    { id: "R-sweep", text: "Storm 2: SweepableLimiter adds trackedKeys(), sweep() and reset(key) to both algorithms. Keys get state on first valid use; sweep() forgets exactly the keys whose state equals a fresh key's (a bucket at the tick it is full again, a window key when its last request has left) and returns how many; reset(key) forgets one key and reports whether it was tracked.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "invalid_cost_accepted",
      failsPhase: "base",
      failingTests: ["Cost.ImpossibleCostsAreRefusedForeverAndChangeNothing"],
      reason: "Only the upper bound of the cost is checked. A cost of zero is allowed (harmless but wrong), and a negative cost is allowed too and subtracts a negative number of tokens, which pays tokens into the bucket: a caller can mint its own quota. Validate inputs at the boundary, before any state is touched.",
    },
    {
      dir: "global_bucket",
      failsPhase: "base",
      failingTests: ["Burst.KeysDoNotShareTokens", "Config.ManyKeysKeepTheirOwnState"],
      reason: "The key is ignored and everyone shares one bucket, so one noisy caller starves all the others. The whole point of the library is per-key isolation; the table of keys is the one thing the facade must get right.",
    },
    {
      dir: "denied_drains_bucket",
      failsPhase: "base",
      failingTests: ["Burst.ACostUsesSeveralTokensAtOnce", "Retry.RetryAfterForABigCostCountsAllMissingTokensAndKeepsProgress"],
      reason: "A refused request empties the bucket, as a 'penalty'. Callers that are told no by retrying politely end up with nothing left when they are finally allowed. The contract says a refusal uses up nothing; any penalty is a separate policy with its own name.",
    },
    {
      dir: "no_cap_on_refill",
      failsPhase: "base",
      failingTests: ["Refill.TheBucketNeverHoldsMoreThanItsCapacity"],
      reason: "Refill adds tokens without a ceiling, so a key that is idle for an hour comes back with an hour's worth of tokens and can burst far past the capacity. The capacity is the whole definition of burst size.",
    },
    {
      dir: "refill_resets_remainder",
      failsPhase: "base",
      failingTests: ["Refill.ProgressTowardsTheNextTokenIsKeptBetweenCalls", "Refill.OneTokenArrivesPerInterval"],
      reason: "Every call moves the refill point to now, so asking again before the next token is due restarts the clock. A client that retries every 7 ticks against a token every 10 would never get one. Advance the refill point by whole intervals so the fractional progress survives.",
    },
    {
      dir: "full_bucket_banks_time",
      failsPhase: "base",
      failingTests: ["Refill.ATimeAwayFromFullIsNotBankedAsExtraTokens"],
      reason: "While the bucket is full the refill point is not reset, so the idle time is treated as earned progress. After the caller spends the whole bucket, tokens come back immediately for all the time it sat idle. A full bucket earns nothing: restart the clock when it stops being full.",
    },
    {
      dir: "retry_ignores_progress",
      failsPhase: "base",
      failingTests: ["Retry.RetryAfterCountsDownToTheNextToken", "Retry.RetryAfterForABigCostCountsAllMissingTokensAndKeepsProgress"],
      reason: "retryAfter is missing tokens times the interval, ignoring that part of the next interval has already passed. Clients told to wait too long lose throughput, and the number does not count down as time passes. It is the one value the caller acts on, so it should be exact.",
    },
    {
      dir: "window_edge_inclusive",
      failsPhase: "storm1",
      failingTests: ["Window.ARequestLeavesTheWindowExactlyWindowTicksLater"],
      reason: "A request stays in the window for windowTicks + 1 ticks, because the expiry test uses < where <= is needed. The interval (counts from t to t + window - 1, gone at t + window) must be written down and tested at the exact tick; this is the same off-by-one as expiry in a TTL cache.",
    },
    {
      dir: "denied_recorded",
      failsPhase: "storm1",
      failingTests: ["Window.RefusedRequestsAreNotRecorded"],
      reason: "Refused requests are added to the log as if they had been allowed. A client that keeps retrying keeps the window full forever, and the retry-after the library gave is never honoured. The contract is that a refusal costs nothing, in both algorithms.",
    },
    {
      dir: "retry_first_hit_only",
      failsPhase: "storm1",
      failingTests: ["Window.RetryAfterIsWhenEnoughUnitsHaveLeft", "Window.WaitingForRetryAfterMakesTheRequestSucceed"],
      reason: "retryAfter is the time until the oldest request leaves, even when that request frees fewer units than the caller needs. The client waits, retries and is refused again. Walk the log oldest first and stop at the request whose expiry frees enough units.",
    },
    {
      dir: "window_shared_log",
      failsPhase: "storm1",
      failingTests: ["Window.KeysHaveSeparateWindows"],
      reason: "The window algorithm keeps one request log for all keys, while the token bucket (which the base tests cover) was keyed correctly. When a second algorithm is added next to the first, each one has to re-earn the key isolation; having the key table in one shared place, with the algorithm per key behind an interface, makes this impossible.",
    },
    {
      dir: "sweep_forgets_all",
      failsPhase: "storm2",
      failingTests: ["Sweep.AKeyBecomesIdleAtTheExactTickNotBefore", "Sweep.ADrainedBucketIsNotForgottenUntilItHasRefilled", "Sweep.OnlyIdleKeysAreForgotten"],
      reason: "The sweep forgets every key. That frees memory, and it also gives every abusive key a brand-new full bucket the moment housekeeping runs, which the caller can trigger by waiting. Forgetting is only safe when the state is indistinguishable from a fresh key's.",
    },
    {
      dir: "sweep_off_by_one",
      failsPhase: "storm2",
      failingTests: ["Sweep.IdleKeysAreForgottenAndCounted", "Sweep.AKeyBecomesIdleAtTheExactTickNotBefore"],
      reason: "The sweep evaluates idleness against a time one tick in the past, so a key that has just become idle is kept until the next sweep. Harmless to correctness, but the sweep's contract (exactly the idle keys at this tick) is what makes it testable and bounds memory predictably.",
    },
    {
      dir: "sweep_count_wrong",
      failsPhase: "storm2",
      failingTests: ["Sweep.IdleKeysAreForgottenAndCounted"],
      reason: "sweep() returns how many keys remain instead of how many it forgot. An operator graphing the return value as 'keys reclaimed' would see zero when everything was cleaned. Return values are part of the contract and need a test like any behaviour.",
    },
    {
      dir: "reset_clears_all",
      failsPhase: "storm2",
      failingTests: ["Reset.ResettingAKeyRestoresItsFullAllowanceAndLeavesOthersAlone"],
      reason: "reset(key) wipes the whole table. A support engineer unblocking one customer silently gives every other customer a fresh allowance. Operator actions must be as narrow as their name.",
    },
    {
      dir: "reset_always_true",
      failsPhase: "storm2",
      failingTests: ["Reset.ResettingAnUnknownKeyReportsFalse"],
      reason: "reset(key) reports success whether or not the key existed, so a typo in the key looks like a successful unblock and the real customer stays blocked.",
    },
  ],
};
