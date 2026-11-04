import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "proxy-cache",
  title: "Proxy: a caching proxy and a lazy proxy behind the same interface",
  concepts: ["proxy", "virtual proxy", "caching", "cache invalidation", "negative results", "ownership"],
  hints: [
    "Both proxies implement `Store`, so a client cannot tell them from the real one. Put the control logic (cache lookup, lazy creation) in the proxy and forward everything else untouched.",
    "For `CachingStore::get`: look in the map first; on a miss call the real store and only then insert. If the real store answers `std::nullopt`, return it without inserting: a miss must not be remembered. For `put`, write to the real store first, then update the cached copy so it is never stale.",
    "For `LazyStore`: keep a `std::unique_ptr<Store>`, null at first, and a private `real()` helper that builds it with `make_()` only when null. Every public method goes through `real()`; the constructor must not call `make_`.",
  ],
  wrong: [
    { dir: "caches_nothing", failingTests: ["Caching.SecondReadIsServedFromTheCache", "Caching.KeysAreCachedIndependently"], reason: "Forwards every get to the real store: the proxy has the right interface and none of the point." },
    { dir: "stale_after_put", failingTests: ["Caching.PutWritesThroughAndIsNeverStale"], reason: "Writes through but leaves the old value in the cache, so a read right after a write returns outdated data: the classic cache-invalidation bug." },
    { dir: "caches_failures", failingTests: ["Caching.MissingKeyIsReportedAndNotCached"], reason: "Turns 'missing' into an empty string and caches it: the caller can no longer tell absent from empty, and the wrong answer is served even after the key appears." },
    { dir: "lazy_is_eager", failingTests: ["Lazy.NothingIsCreatedUntilFirstUse"], reason: "Builds the real store in the constructor, which defeats a virtual proxy: the cost is paid even when the store is never used." },
    { dir: "lazy_creates_each_call", failingTests: ["Lazy.CreatesTheRealStoreExactlyOnce"], reason: "Rebuilds the real store on every call, discarding all state it held: lazy initialisation without the 'once'." },
  ],
};
