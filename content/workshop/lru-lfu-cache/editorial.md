# Editorial: LRU / LFU Cache

## Requirements
Functional: a fixed-capacity cache from string keys to int values with `put`, `get`, `contains`, `erase`, `size` and `capacity`. When full, a new key evicts the least recently used entry. A use is a `get` hit or a `put` of an existing key; `contains` and a miss are not uses. Hidden until asked: that a miss leaves the output alone and that any int (zero included) is a legal value, that overwriting never evicts, that an erased key stored again is new, and that every operation must be O(1) expected. Non-goals: generics, thread safety, resizing, an eviction listener, metrics (discussed, not built).

**Change Storm 1, LFU:** `makePolicyCache(capacity, Policy::Lfu)` evicts the least frequently used entry. A key starts at one use, `get` hits and overwrites add one, ties go to the least recently used, a key that leaves forgets its count, and the entry being stored cannot evict itself. Revealable by asking whether LRU will stay the only rule.

**Change Storm 2, expiry:** `putFor(key, value, ttl)` on an injected `Clock`. An entry is alive while `now < T + ttl`. A dead entry is absent for every query, is dropped before any live entry is evicted, and storing its key again is a fresh entry. `put` never expires and cancels an earlier ttl; `get` does not extend life.

## Reference design
- `EvictionPolicy` is the seam: `onInsert`, `onAccess`, `onRemove`, `victim`. It sees keys only.
- `LruPolicy` keeps a `std::list` ordered by recency and a map from key to list iterator, so a use is a `splice` to the front and the victim is the back. All O(1).
- `LfuPolicy` keeps keys in groups by use count, each group ordered by recency; the victim is the back of the lowest group. A use moves a key from group `n` to `n+1`. The group map is a `std::map`, so finding the lowest group is O(1) (`begin()`) and moving between groups is O(log distinct counts).
- `ExpiryIndex` knows when keys die: a multimap by deadline plus a map from key to its entry. It can say whether a key is dead, count the dead without removing them (for const queries), and hand back every key dead at a time.
- `CacheImpl` is the facade. It owns the values, enforces capacity, asks the policy for a victim and the index for the dead. Every mutating call first drops dead entries, then does its work.
- `cache.cpp` holds three small factories. The plain and policy caches reuse the expiring implementation with a clock that never moves.

**Storm 1 in the reference:** one new class (`LfuPolicy`) and a switch in a factory. Because the policy interface had to exist already (even LRU lived behind it), `CacheImpl` did not change.

**Storm 2 in the reference:** one new class (`ExpiryIndex`) and a `dropExpired()` call at the top of each mutating method of `CacheImpl`. The eviction policies do not change: expiry is a different reason to remove a key, and `remove()` already told the policy.

## Alternatives
- **Hash map plus a doubly linked list written by hand** (nodes with prev/next pointers, sentinel head and tail) is the classic interview answer and a good one. `std::list::splice` gives the same behaviour with less pointer code, but be ready to draw the hand-written version, because interviewers often ask for it.
- **One `unordered_map<string, Node>` where each node carries a timestamp, and a scan for the oldest** is correct and O(n) per eviction. It passes every behaviour test and fails the speed requirement, which is the point of asking about size early.
- **An ordered map keyed by a use counter** (`map<long long, string>`) is O(log n) per operation and simple to get right; it needs the counter bumped and the entry re-keyed on every use. A fair choice when O(log n) is acceptable, a weaker one when you were told to be O(1).
- **An `enum` plus `switch` inside the cache for LRU versus LFU** works for two policies. The first change to a third (or ARC, 2Q, TinyLFU) touches every operation. A policy interface costs one class now and makes each later rule an addition.
- **The classic O(1) LFU** (frequency buckets plus a `minFreq` variable) removes the log factor. It is delicate once arbitrary keys can be removed, which expiry and `erase` both do: `minFreq` can become stale. The `std::map` of buckets is slightly slower and cannot get that wrong.
- **Lazy expiry only** (check the deadline on `get`) is the cheapest and the first thing people write. Its flaw is that dead entries keep occupying slots, so a full cache evicts live data while corpses sit in it. The storm tests exactly that.
- **A background thread that sweeps** bounds the latency of any single call but brings locking, a shutdown story and nondeterministic tests. A manual clock and a sweep on each call keeps the behaviour testable.

## Trade-offs
LRU is simple, adapts quickly and is fooled by scans: one pass over cold data flushes the hot set. LFU keeps a stable hot set and is slow to forget: yesterday's favourites outrank today's traffic unless counts are aged. Neither dominates, which is why the policy is a seam. The sweep at the start of every mutating call keeps capacity meaning live entries, at the cost of one call paying for a backlog of dead ones; the const queries do not sweep, so they ask the index instead of mutating. Values live in the cache and keys in the policy, which duplicates each key string; the saving from sharing them (pointers or ids) is real but trades clarity.

## What breaks at 10x
At ten times the entries, the per-entry overhead matters: an unordered map node, a list node and a string key held twice is easily over a hundred bytes of bookkeeping per int. Moving to interned keys or integer ids, and to intrusive lists, cuts that. At ten times the callers, one lock around the cache is the bottleneck, and `get` writes to the list so a reader-writer lock does not help: shard the cache by key hash, accept per-shard eviction, and consider sampled approximate LRU (as large caches do) so a read does not need an exclusive lock. At ten times the ttls, a multimap is fine but a timing wheel is cheaper if second-level resolution is enough.

## Level signals
- **SDE II:** a correct LRU with a map and a list, explains why both, handles overwrite and the `get` refresh, and writes tests for eviction order. May use a scan if told O(1) matters only after being pushed.
- **Senior:** asks what counts as a use before coding, keeps O(1), separates the eviction rule from the capacity bookkeeping, and absorbs LFU as a new class. Names the tie-break and the "newcomer must not evict itself" trap without being told.
- **Staff:** drives the discussion to the real constraints: concurrency model and sharding, admission and aging for LFU, stampede protection and invalidation, memory overhead per entry, and what to measure (hit ratio per workload) before choosing a policy.
