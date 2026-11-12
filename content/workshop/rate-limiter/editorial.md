# Editorial: Rate limiter library

## Requirements
Functional: a per-key limiter behind `tryAcquire(key, cost)` returning a `Decision` (allowed, remaining, retryAfter). Time arrives through an injected `Clock` (whole ticks, never backwards). The base algorithm is a token bucket: a fresh key starts full, one token arrives every `refillTicks` ticks up to the capacity, a request of cost c needs c tokens. A refused request uses up nothing. A cost below 1 or above the capacity is refused forever (`retryAfter` -1) and changes no state. `retryAfter` is the exact wait for the same request to succeed. Hidden until asked: the starting state of a key, the cost of a refusal, whether partial refill progress is kept, and what idle time does for a full bucket. Non-goals: threads, a distributed limit, HTTP.

**Change Storm 1, a second algorithm:** `makeSlidingWindow(clock, maxUnits, windowTicks)` behind the same interface: at most `maxUnits` in any window, an allowed request leaves the window exactly `windowTicks` later, refused requests are not recorded, `retryAfter` is the wait until enough old units have left. Revealable by asking whether product wants a strict "N per window" mode.

**Change Storm 2, housekeeping:** `trackedKeys()`, `sweep()` (forget exactly the idle keys, return how many) and `reset(key)`, for both algorithms. Revealable by asking whether state is ever cleaned up.

## Reference design
- `Limit` is the per-key abstraction: `tryAcquire(now, cost)` and `isIdle(now)`. It knows the numbers and never the clock.
- `TokenBucketLimit` holds tokens and a refill point. The refill moves the point forward by whole intervals, so progress survives; when the bucket is full, the point is reset to now, so idle time is not banked.
- `SlidingWindowLimit` holds a deque of (tick, units) for the allowed requests and a running total. Expiry pops from the front; the retry-after walks from the oldest entry until enough units would have left.
- `LimiterImpl` owns the clock and `unordered_map<string, unique_ptr<Limit>>`. It validates the cost before touching the table, creates state through a `LimitMaker` on first sight, and implements sweep and reset by asking each `Limit` whether it is idle.

**Storm 1 in the reference:** one new class (`SlidingWindowLimit`) and one factory function. `LimiterImpl`, `TokenBucketLimit` and the cost validation are untouched, because the facade only speaks to `Limit`.

**Storm 2 in the reference:** `isIdle` was on the interface from the start of the storm; the sweep is a loop in `LimiterImpl`, and reset is one `erase`. Neither algorithm class changed except for the `isIdle` each gives. A first draft that kept per-algorithm structs in a `switch` has to touch every branch.

## Alternatives
- **One class with the bucket arithmetic inline** is the quickest answer to the base problem. It makes Storm 1 hurt: the window becomes an `if (algorithm == ...)` in every method, and the sweep needs a third branch.
- **A fixed-window counter** (count per aligned window) is the smallest state and the simplest code, and lets twice the limit through around a window boundary. Good to name and reject.
- **Sliding window counter** (previous and current window counts, weighted by overlap) uses two numbers per key and approximates the log. A good follow-up; it is not exact, so it cannot pass the exact-edge tests.
- **A timer thread adding tokens** is the intuitive model of a bucket and is the wrong implementation: a timer per key does not scale and ruins determinism. Compute the refill lazily from elapsed time.
- **Floating-point rate** (`tokens += elapsed * rate`) is compact and drifts: comparisons such as `tokens >= 1` become flaky at the boundary. Integer ticks per token keep every boundary exact.
- **`std::function` per algorithm instead of a class** works for a stateless policy; a stateful one (the window's log) wants a class. The reference uses an abstract class for the state and a `std::function` only for the one-line factory.
- **Template policy parameter** (`Limiter<Algorithm>`) removes the virtual call and fixes the algorithm at compile time. It is the right choice when the algorithm never changes at runtime; here a runtime choice per limiter keeps the factory trivial.

## Trade-offs
Lazy refill makes every request O(1) with no background work, and costs two numbers of state per key, kept even when the key is idle until a sweep. The window log is exact and costs memory proportional to the limit per key; the bucket is tiny and permits bursts. Integer ticks per token avoid rounding and make the rate a fixed grid, but cannot express "1.5 tokens per tick" without scaling. Holding state in a hash map keyed by string makes isolation obvious and makes memory a function of key cardinality, which is why the sweep is part of the design and not an afterthought.

## What breaks at 10x
At 10x the keys, memory is the problem before CPU: sweep incrementally (one shard at a time), cap the total number of keys, and decide what to do with overflow (refuse, or evict the least recently used idle key). At 10x the request rate one mutex on the table serializes everything: shard the map by key hash with a lock per shard, or use atomics on a packed (tokens, refill point) word with compare-and-swap. At 10x the servers a per-process limit is no longer a per-customer limit: you need a shared store (an atomic script in Redis) or leased token batches, and a decision about failing open or closed when the store is down. At 10x the window size the log gets expensive and the weighted two-counter approximation starts to win.

## Level signals
- **SDE2:** a correct token bucket with lazy refill, a cap, per-key state, refusals that cost nothing, validation of the cost, and a clear sense of why a timer is the wrong tool.
- **Senior:** asks about burst, refusal cost, partial progress and idle time before coding; keeps the remainder of the refill; computes an exact retry-after; puts the algorithm behind an interface so a window arrives as a new class; knows what is wrong with fixed windows; plans for forgetting keys.
- **Staff:** weighs bucket, log and weighted-counter by memory and accuracy; shards for contention and bounds memory under key flooding; designs the multi-server limit (central store, leases, sticky routing) with failure behaviour and the business tolerance for over-limit traffic.
