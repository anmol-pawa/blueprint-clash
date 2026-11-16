# Editorial: Rate limiter library

## Requirements
Functional: `tryAcquire(client, permits)` answers a `Decision` (`allowed`, `retryAfter`). Each client string has its own token bucket: at most `capacity` tokens, full at first sight, one token added every `refillEvery` ticks while the bucket is not full. Time comes from an injected `Clock` (whole ticks, never backwards). Progress towards the next token is kept across refused requests, a full bucket stores no progress, and idle time is never banked beyond the capacity. A request is all or nothing: refused means nothing changed. `permits <= 0` is refused, more permits than the capacity is refused with `kNever`. `retryAfter` is exact: waiting one tick less is still refused. Hidden until asked: the partial-interval rule, the exact retry contract, and what a refusal costs. Non-goals: thread safety, memory reclamation of idle clients, distribution (all discussed), HTTP integration, configuration reload.

**Change Storm 1, a sliding window:** `makeWindowLimiter`: at most `maxPermits` permits in any span of `windowTicks` ticks, exact (no boundary burst), refused requests not remembered, `retryAfter` is when enough old grants have left. Revealable by asking whether other algorithms will be needed.

**Change Storm 2, a global limit:** `makeLayeredLimiter`: a per-client bucket and one shared bucket; a request needs both and charges both, or neither. Revealable by asking about a limit on the service as a whole.

## Reference design
- `LimitPolicy` is the Strategy: `check(permits, now)` looks and never changes anything, `commit(permits, now)` pays. Splitting the two is what makes "refused means unchanged" cheap to guarantee.
- `TokenBucket` owns the integer token arithmetic (`project(now)` computes what the bucket would hold, without mutating).
- `ClientPolicies` keeps one policy per client and creates it from a factory on first sight. It does not know which algorithm it holds.
- `Admission` decides a request against a list of policies: check all, merge the verdicts (the slowest wait wins, `kNever` dominates), and only if everything said yes commit all.
- `LimiterImpl` is the facade: validate permits, read the clock once, gather the applicable policies, ask `Admission`.

**Storm 1 in the reference:** one new class, `SlidingWindowLog`, implementing `LimitPolicy`, and one new factory function. The facade, `Admission` and `ClientPolicies` are untouched, because the client map only ever sees the interface.

**Storm 2 in the reference:** one extra policy (a second `TokenBucket`) in the list the facade hands to `Admission`, and one factory. `Admission` already checks everything before it charges anything, so the all-or-nothing rule and the "longest wait" rule were already there. The first draft of `Admission` that charges as it goes is the one the storm breaks.

## Alternatives
- **One class with a map of (tokens, timestamp) and an if for each algorithm** is the usual first answer. It passes the base phase and then the first storm adds an `if`, the second adds another, and each branch duplicates the refusal and retry logic.
- **Floating-point tokens** (`tokens += elapsed * rate`) is shorter and wrong at the edges: rounding makes `retryAfter` off by one and lets a request slip through a tick early. Whole tokens plus an integer anchor make the boundary testable. The cost is that the rate must be expressed as "one token per N ticks", so rates above one per tick need a scaled unit.
- **Leaky bucket as a meter** is the same arithmetic with different words; as a queue it smooths output but adds delay and memory.
- **Fixed window counter** is one integer and one timestamp per client and the cheapest of all. It lets a client double its limit across a boundary, which is the reason Storm 1 exists. Use it when that error is acceptable.
- **Sliding window counter** (current and previous window, weighted) approximates the log in O(1) memory with a small bounded error. It is the usual production choice for big fleets and slots in as another `LimitPolicy`.
- **Charge first, refund on failure** for the layers: shorter, but a window exists where the client's bucket is too empty, concurrent requests are wrongly refused, and a crash loses the refund. Check-then-commit does not have that window.
- **Timer thread that adds tokens every interval** looks natural and does not scale: one wake-up per client per interval. Lazy refill on access needs no thread and is deterministic under a fake clock.

## Trade-offs
Lazy refill makes every operation O(1) and the limiter deterministic, at the price of a map that never shrinks unless you add a sweep. Two-step check and commit costs an extra virtual call but makes refusals free of side effects and gives a natural place for a lock. The window log is exact and costs O(limit) memory per client; the token bucket is O(1) and lets clients burst up to the capacity, which is a feature for bursty clients and a defect when the downstream cannot take bursts. Integer ticks rule out floating-point surprises at the cost of an awkward unit for very high rates. `retryAfter` makes the library more useful and harder to build: it must be exact for every algorithm and every layer.

## What breaks at 10x
At 10x the clients the map is the problem: millions of mostly full buckets. A full bucket equals a new one, so drop it (lazily or by sweep), shard the map, and cap it with a stated failure mode (fail open or closed). At 10x the request rate the lock on the global bucket becomes the hottest line in the process: shard it into per-core batches of tokens that refill from the shared one. At 10x the servers the local state is wrong, since the same client is counted separately by each server: divide the limit, centralise it in a fast store with an atomic script, or sync counters and accept bounded overshoot (see the distributed rate limiter case study). At 10x the algorithms, the policy abstraction pays for itself: a new algorithm is a new class and a factory line.

## Level signals
- **SDE2:** a working token bucket with a per-client map; correct refill from elapsed time and a cap; asks what refusal returns; injects the clock; copes with the second algorithm by adding a branch or a class.
- **Senior:** asks the partial-interval and retry questions before coding; integer arithmetic and an exact retry hint; all-or-nothing requests; an algorithm abstraction so the window slots in; layers charged only when all agree; names the memory growth and the race on a shared bucket.
- **Staff:** compares algorithms by burst, boundary error and memory and picks per use case; designs idle-client eviction and sharded global tokens; reasons about the distributed version (local share, central store, token batching, gossip) with failure modes, clock skew and fail-open or fail-closed; connects retry hints to client back-off and retry storms.
