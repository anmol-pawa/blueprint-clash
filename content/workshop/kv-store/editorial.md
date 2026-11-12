# Editorial: Key-value store with TTL and transactions

## Requirements
Functional: an in-memory map from string keys to string values with `set`, `setWithTtl`, `get`, `erase`, `size` and `ttlRemaining`. Time arrives through an injected `Clock` (whole ticks, never backwards). A key set with a ttl of `t` at tick `s` is readable while `now < s + t` and gone from `s + t` on. A ttl of zero or less is refused without any change. Setting a key replaces its value and its expiry. An expired key is absent everywhere: not readable, not counted, `erase` returns false, `ttlRemaining` is empty. Hidden until asked: the exact expiry boundary, the overwrite rule, and what an expired key means for each operation. Non-goals: reclaiming memory promptly (discussed), thread safety, persistence, typed values, isolation between callers.

**Change Storm 1, nested transactions:** `begin`, `commit`, `rollback`, `depth`. Reads see uncommitted writes. Rollback restores values, expiries and the presence of keys. An inner commit hands its writes to the outer transaction; only the outermost commit makes them final. Revealable by asking whether callers need to group writes.

**Change Storm 2, prefix listing:** `keysWithPrefix` returns live keys in ascending order, honouring expiry and uncommitted writes.

## Reference design
- `Entry` is the plain data for one key: value plus an optional absolute expiry.
- `EntryTable` holds entries in key order and knows nothing about time.
- `ExpiryRule` owns the `Clock` and the single definition of "live". Every read, count and listing asks it.
- `UndoJournal` keeps one frame of undo records per open transaction. A record is the key and the whole entry it held before the write (or nothing).
- `StoreImpl` is the facade. A write is: record what was there, then store. It has no rule of its own about time or transactions.

**Storm 1 in the reference:** one new class (`UndoJournal`), one call in the write path (`journal_.record`) and four thin methods. The table and the expiry rule are untouched. Rollback needs no case analysis: set, erase and set-with-ttl all undo as "put the recorded entry back, or remove the key if there was none".

**Storm 2 in the reference:** one new method on the facade. The table already keeps keys in order (a `std::map`), so a prefix is `lower_bound` plus a walk, and the liveness filter is the same `ExpiryRule` the other reads use. A first draft built on `unordered_map` pays here: the container changes inside `EntryTable` and nothing else, if the table was a real seam.

## Alternatives
- **One class with a map, a clock call in each method and a vector of snapshots for transactions** is a fine base answer and what many candidates write first. It makes the storms hurt: "is it live?" is repeated in every read path, and a full-copy snapshot per `begin` costs O(n) and still must cope with nested commit.
- **Full-copy snapshots (Memento of the whole table)** are the shortest correct transaction code: `begin` copies, `rollback` swaps back. Cost is O(n) memory and time per `begin`; fine for a hundred keys, wrong for a million. Say it, then offer the undo journal.
- **A copy-on-write overlay per transaction** makes rollback free and reads slower (walk the overlay stack); scans must merge sorted views. It wins when rollbacks are frequent.
- **Operation log with inverse operations (Command objects with `undo()`)** is the textbook form. Storing the previous entry instead of an inverse operation keeps the journal a single record type and removes per-operation undo code, at the cost of copying the old value.
- **Active expiry with a timer thread** deletes keys on time but drags in threads, locks and a non-deterministic test. Lazy checks on read plus an amortised sweep keep the store deterministic under a fake clock.
- **Relative ttl counting down** needs a tick to decrement and drifts; absolute expiry is one comparison and survives rollback unchanged.
- **Hash map table** gives O(1) point operations but no ordered listing; the ordered map gives O(log n) and a free prefix range. A hash map plus a sorted index is possible when point reads dominate.

## Trade-offs
Absolute expiry plus lazy checks keeps reads cheap and the store deterministic, and costs memory for expired entries until something touches or sweeps them; `size()` is O(n) here because there is no live counter. The undo journal makes the common path (commit) cheap and rollback proportional to the work done, and gives no isolation between callers. Recording the whole previous entry copies values (strings here) and in return makes undo uniform and future-proof against new fields. An ordered table makes prefix scans natural and every point operation O(log n) instead of O(1); a good answer names this price rather than hiding it.

## What breaks at 10x
At 10x the keys the expired-but-unreclaimed entries dominate memory, so you add a sweep (expiry heap or timer wheel with stale-entry checks), a live counter for `size()`, and move from `std::map` nodes to a flat or radix structure. At 10x the write rate the journal's record per write becomes allocation traffic: reuse frames, store views, and cap transaction length. At 10x the callers a single transaction scope is no longer enough: you need per-connection transactions, versioned values or locks, and conflict handling, and then you are building a database. At 10x the data one machine is not enough, and the prefix scan stops being free the moment the partitioning is by hash (the sharding chapter).

## Level signals
- **SDE2:** correct boundary (gone at set + ttl), overwrite replaces the expiry, expired keys behave as absent in every operation, a clear idea of how rollback works even if it is a full copy.
- **Senior:** asks about boundary, overwrite and expired-key semantics before coding; one place decides liveness; journal records whole previous entries and handles new keys, nested commit and reverse replay; states why `size()` is O(n) and how to fix it; injects the clock.
- **Staff:** reasons about reclaiming memory (heap or wheel with stale checks), compares undo log, overlay and snapshots by workload, separates atomicity from isolation and durability, and sketches per-connection transactions with optimistic or pessimistic concurrency and the consequences for scans.
