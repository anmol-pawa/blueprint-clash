# Editorial: LRU / LFU Cache

## Requirements
Functional: a fixed-capacity cache of string keys and values with `put`, `get`, `contains`, `erase`, `size`, `capacity` and `stats`. A new key into a full cache evicts the least recently used entry. A `get` hit and a `put` that replaces a value count as a use; a miss and `contains` do not; replacing a value never evicts. `makeCache` refuses a capacity below 1. `stats` counts hits and misses from `get` only, and evictions only for entries pushed out to make room. Hidden until asked: what counts as a use, the erase and capacity rules, and the exact meaning of each counter. Non-goals: thread safety (discussed, not built), TTL (the next problem in the row), byte-based capacity, persistence, distribution.

**Change Storm 1, pluggable eviction:** `makePolicyCache(capacity, policy)` takes an `EvictionPolicy` with four hooks (`onInsert`, `onAccess`, `onErase`, `chooseVictim`). The tests bring FIFO, MRU and LFU policies the cache has never heard of, plus a recording policy that checks exactly which hook is called when. Revealable by asking what teams want next.

**Change Storm 2, removal listener:** an `ObservableCache` tells a `RemovalListener` about every entry that leaves, with its value and a reason (evicted or erased). Replacing a value is not a removal, and when the listener runs the state change is already complete.

## Reference design
- `EntryStore` holds the entries and the capacity. It does not know who should be evicted.
- `LruPolicy` keeps the use order (a list ordered by recency plus an index into it, all O(1)) and names the victim. It is told about every entry that arrives or leaves.
- `StatsCounter` is the one place that counts.
- `RemovalNotifier` announces removals to the listener, if there is one.
- `CacheImpl` is the facade. A `put` of a new key is: if full, `evictOne()`, then store, then tell the policy. `evictOne()` asks the policy for a victim, removes it, tells the policy, counts, and only then notifies.

**Storm 1 in the reference:** nothing in `CacheImpl` changes except the constructor taking the policy from outside. The base design already had the policy behind the same four calls, so the storm is an interface that moves into a public header and two more factory functions. A first-draft design with the recency list inside the cache pays for it here: the list has to come out into its own class, which is the storm.

**Storm 2 in the reference:** one new class (`RemovalNotifier`) and two call sites, one in `erase` and one in `evictOne`, both after the entry is gone. `EntryStore`, the policy and the counter are untouched.

## Alternatives
- **Everything in one class** (a map, a list, three counters and an `evict()` method) is the right answer to the base problem and what an interviewer expects first. It is also what makes the storm hurt: the recency list is wired through `put`, `get` and `erase`, so a second eviction rule means a branch in each, and the listener means another branch in two of them.
- **An enum `{Lru, Lfu, Fifo}` with a `switch` inside the cache** is the lazy answer to Storm 1. It satisfies the ones named in the enum and fails any rule the caller brings (the test's MRU), and every new policy edits the cache. The Strategy interface is the Open/Closed answer, and the price is four virtual calls per operation, which is small next to a hash lookup.
- **Policy as a template parameter** (`Cache<EvictionPolicy>`) removes the virtual calls and fixes the policy at compile time. Fine for a library, wrong when the policy is chosen from a config file or by a test at run time.
- **A single `std::map<Key, Entry>` ordered by timestamp** gives O(log n) for everything and a very short program. It is a good fallback to say out loud when you are running out of time, with the cost stated.
- **A policy that sees the whole cache** (`chooseVictim(const Cache&)`) lets it read values and sizes, but it can also mutate what it should only observe, and policy and cache then depend on each other. Passing explicit arguments to the hooks keeps the arrow one-way.
- **Observer with a list of listeners** is the more general form. One listener plus a chain of your own decorators is simpler, and the interviewer's question "what about two listeners?" is a fine place to show a composite listener.
- **Soft references or weak maps** let the garbage collector decide, which is not available in C++ and not predictable where it is.

## Trade-offs
Exact LRU needs a write on every read, which is what makes it hard to scale across threads; approximate schemes (CLOCK, sampling) give up exactness for concurrency. LFU keeps popular keys through a burst of one-off keys but pins dead ones; LRU adapts quickly and is flushed by a scan. Neither dominates, which is why the policy is pluggable and why stats exist: pick with the numbers. Strings as keys and values keep the problem small and copy more than a template would; a real library would be generic and often hand out references or shared pointers. Notifying after the state has changed makes listeners safe to reason about, and means a listener can observe that a key it was told about is already being re-inserted by another thread in a concurrent version.

## What breaks at 10x
At 10x the entries the hash map and list nodes dominate memory (a node per entry is two pointers plus allocator overhead), so you move to an intrusive list or an array-based CLOCK, and the capacity becomes bytes, not entries, with a weight per entry. At 10x the request rate one mutex is the bottleneck: shard by key hash (each shard its own policy, so eviction is only approximately global), batch recency updates, and keep listeners off the hot path. At 10x the keys the working set no longer fits, hit ratio is the metric that matters, and admission control (do not cache what is probably one-off) starts to beat clever eviction. At 10x the services the cache becomes a shared, networked tier, where stampedes, hot keys and invalidation (the caching chapter) are the real problems.

## Level signals
- **SDE2:** correct LRU behaviour including refresh on replace and no eviction on replace; hash map plus linked list with a clear O(1) argument; handles capacity and erase edge cases; knows `contains` is a peek.
- **Senior:** asks what counts as a use and what the counters mean before coding; keeps store, order and counter apart; keeps the order structure and the map in step on erase; makes the eviction rule a real Strategy and the listener fire after the state change; explains why get() mutates and what that means for locking.
- **Staff:** reasons from workload to policy (scan resistance, admission, frequency decay); proposes sharding with approximate global eviction and batched recency updates and states what is lost; handles listener delivery outside the lock, shutdown flush and weighted capacity unprompted; ties the stats to a decision.
