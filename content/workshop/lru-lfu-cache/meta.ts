import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "lru-lfu-cache",
  title: "LRU / LFU Cache",
  level: "Senior",
  parMinutes: 55,
  patterns: ["Strategy", "Facade"],
  requirements: [
    { id: "R-basic", text: "put/get/contains/erase on string keys and int values. A miss returns false and leaves the output untouched. Any int, including 0 and negatives, is a legal value. Putting an existing key replaces its value and never grows the cache. makeCache(capacity < 1) returns nullptr; two caches share no state.", phase: "base", hidden: true },
    { id: "R-lru", text: "When full, a new key evicts the least recently used entry. A use is a get hit or a put of an existing key. contains() and a miss are not uses. Overwriting a key in a full cache evicts nothing. erase() frees a slot and a key stored again afterwards is brand new.", phase: "base", hidden: true },
    { id: "R-speed", text: "Every operation is O(1) expected, so a long run on a large cache stays fast.", phase: "base", hidden: false },
    { id: "R-lfu", text: "Storm 1: makePolicyCache(capacity, Policy::Lfu) evicts the least frequently used entry. A key starts at 1 use; every get hit and every put of an existing key adds 1; contains() and misses add nothing. Ties go to the least recently used among the lowest count. An evicted or erased key forgets its count. The entry being stored never evicts itself. Policy::Lru behaves exactly like makeCache.", phase: "storm1", hidden: true },
    { id: "R-ttl", text: "Storm 2: putFor(key, value, ttl) stores an entry that is alive while now() < T + ttl (T = the clock when stored), measured on an injected Clock. Expired entries behave as absent for get, contains, erase and size. They are dropped before any live entry is evicted. A plain put() never expires and replaces an earlier ttl; get() does not extend life; putFor with ttl <= 0 stores nothing and removes the key. A huge ttl must not overflow. The rules above hold for both policies; a re-stored expired key is a fresh entry (use count 1).", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "get_no_refresh",
      failsPhase: "base",
      failingTests: ["Recency.AGetRefreshesTheKey", "Recency.EvictionOrderFollowsUseNotInsertion"],
      reason: "A get leaves the order alone, so the cache is a FIFO queue wearing an LRU name. The tell is that every test of insertion order still passes. Making 'record a use' one method that get() and put() both call keeps the rule in a single place.",
    },
    {
      dir: "put_existing_no_refresh",
      failsPhase: "base",
      failingTests: ["Recency.APutOfAnExistingKeyRefreshesIt"],
      reason: "The overwrite branch updates the value and returns early, skipping the recency update that the insert branch does. Two paths into the same state change is where one of them forgets a step; the reference sends both through one insert() and one policy hook.",
    },
    {
      dir: "contains_refreshes",
      failsPhase: "base",
      failingTests: ["Recency.ContainsDoesNotRefresh"],
      reason: "contains() is implemented by calling get(), so asking whether a key is there makes it look recently used. A const query that mutates is a signal: the design has no read-only path to the data. Keeping the values in their own map gives contains() something honest to look at.",
    },
    {
      dir: "overwrite_evicts",
      failsPhase: "base",
      failingTests: ["Recency.OverwritingAtCapacityEvictsNothing"],
      reason: "The capacity check runs before the lookup, so updating a key that is already there in a full cache throws out a bystander. Look the key up first: only a genuinely new key needs a free slot.",
    },
    {
      dir: "zero_is_missing",
      failsPhase: "base",
      failingTests: ["Basics.ZeroAndNegativeValuesAreRealValues"],
      reason: "A stored 0 is read as 'not found'. The interface already separates 'found' (the return value) from 'what was found' (the out parameter); using a value as the miss marker puts the two back together and loses a legal answer. Real caches hit this with counters that are legitimately zero.",
    },
    {
      dir: "lfu_tie_newest",
      failsPhase: "storm1",
      failingTests: ["Lfu.TiesGoToTheLeastRecentlyUsed", "Lfu.TheTieBreakFollowsRecentUseNotInsertion"],
      reason: "Among equally used entries the newest goes, which is the reverse of the rule. It is a plausible slip, and a nasty one: with a stream of one-hit keys, every new key evicts the previous one and the cache never keeps anything but the hot set plus one slot. Ordering each count bucket by recency makes the tie-break structural.",
    },
    {
      dir: "lfu_put_not_counted",
      failsPhase: "storm1",
      failingTests: ["Lfu.AnOverwriteCountsAsAUse"],
      reason: "Only get() bumps the use count; a put of an existing key just refreshes recency. A key that is written often looks cold and gets evicted. Whether a write is a use is a requirement to ask about, and the answer here is yes; the policy hook (onAccess) is called from both paths.",
    },
    {
      dir: "lfu_count_survives",
      failsPhase: "storm1",
      failingTests: ["Lfu.AnEvictedKeyStartsOverAtOne"],
      reason: "Counts live in a side table that is never cleaned, so an evicted or erased key returns with its old popularity. That is a different algorithm (it is sometimes wanted: LFU with history) but the contract says a leaving key forgets. Keeping the count inside the policy's per-key slot, removed on onRemove, makes forgetting automatic.",
    },
    {
      dir: "lfu_evicts_newcomer",
      failsPhase: "storm1",
      failingTests: ["Lfu.ANewcomerSurvivesItsOwnInsertion"],
      reason: "The new entry is inserted first and the victim picked afterwards. Its count is 1, the lowest, so it evicts itself and the cache can never admit a new key once everything else has been used twice. Make room first, then insert.",
    },
    {
      dir: "put_keeps_old_ttl",
      failsPhase: "storm2",
      failingTests: ["Ttl.PlainPutRemovesAnEarlierTtl"],
      reason: "A plain put() of a key that had a ttl replaces the value but keeps the old deadline, so a value the caller stored 'forever' disappears. Writing the expiry is part of every store: put() clears it, putFor() sets it.",
    },
    {
      dir: "expired_blocks_space",
      failsPhase: "storm2",
      failingTests: ["Expired.DeadEntriesAreDroppedBeforeAnyLiveOneIsEvicted"],
      reason: "Dead entries are only discarded when a get notices them, so a put into a 'full' cache evicts a live entry while a corpse still holds a slot. Sweeping at the start of every mutating call (or at least before choosing a victim) is what keeps capacity meaning live entries.",
    },
    {
      dir: "boundary_off_by_one",
      failsPhase: "storm2",
      failingTests: ["Ttl.AnEntryIsDeadExactlyAtItsTtl", "Ttl.TheTtlCountsFromTheTimeOfTheStore"],
      reason: "The entry is still alive at exactly store time plus ttl, so a ttl of N gives N+1 ticks of life. Pick one convention, state it in the interface (alive while now < T + ttl), and use it in exactly one function.",
    },
    {
      dir: "contains_sees_expired",
      failsPhase: "storm2",
      failingTests: ["Expired.SizeAndContainsIgnoreExpiredEntriesWithoutAnyOtherCall"],
      reason: "contains() and size() trust the map, so a dead entry still counts until some mutating call sweeps it. Const queries cannot sweep, so they have to ask the expiry rule themselves; the reference's ExpiryIndex answers isExpired() and expiredCount() without changing anything.",
    },
  ],
};
