import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "lru-lfu-cache",
  title: "LRU / LFU Cache",
  level: "Senior",
  parMinutes: 50,
  patterns: ["Strategy", "Observer"],
  requirements: [
    { id: "R-lru", text: "put() of a new key into a full cache evicts the least recently used entry. A get() hit and a put() that replaces a value both count as a use of the key; a miss and contains() do not. Replacing a value never evicts.", phase: "base", hidden: true },
    { id: "R-capacity", text: "makeCache() returns nullptr for a capacity below 1. size() never exceeds the capacity. erase() returns whether the key was present, frees its room, and the evicted order must never name a key that is no longer stored.", phase: "base", hidden: true },
    { id: "R-stats", text: "stats() counts hits and misses from get() only (contains() and put() are not lookups), and evictions only for entries pushed out to make room, not for erase() and not for replacement.", phase: "base", hidden: true },
    { id: "R-policy", text: "Storm 1: the eviction rule is pluggable. makePolicyCache() takes an EvictionPolicy and calls exactly onInsert (new key stored), onAccess (get hit or replacement), onErase (any key leaving, including the victim) and chooseVictim (only when a new key finds the cache full). A miss, a peek and an erase of an absent key tell the policy nothing. A null policy or capacity below 1 gives nullptr.", phase: "storm1", hidden: true },
    { id: "R-listener", text: "Storm 2: an ObservableCache tells its RemovalListener about every entry that leaves (evicted or erased) with the key, the value it held and the reason. Replacing a value is not a removal. When the listener runs the entry is already gone (contains() is false, size() already dropped) and, for an eviction, the new key is not stored yet. A later setListener() replaces the earlier one; null switches notifications off.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "get_no_refresh",
      failsPhase: "base",
      failingTests: ["Recency.AHitMakesTheKeyTheMostRecentlyUsed", "Recency.SeveralUsesLeaveTheRightOrderBehind"],
      reason: "get() reads the value and never records the use, so the cache is really FIFO. It is the commonest first-draft bug: the read path looks harmless, but recency is a write that hides inside a read. Because get() mutates, a read-only cache cannot be an LRU, and that matters again the moment someone asks for thread safety.",
    },
    {
      dir: "overwrite_no_refresh",
      failsPhase: "base",
      failingTests: ["Recency.ReplacingAValueCountsAsAUse"],
      reason: "put() of an existing key updates the value but forgets to refresh the key, so a hot key that is only ever written can be evicted. Treating put-on-existing as a use is a one-line rule, but only if the design has a single place that records uses.",
    },
    {
      dir: "full_overwrite_evicts",
      failsPhase: "base",
      failingTests: ["Capacity.OverwritingAKeyNeverEvictsAnything", "StatsTest.EvictionsCountOnlyEntriesPushedOutForRoom"],
      reason: "put() checks 'is the cache full?' before checking 'is the key already here?', so replacing a value in a full cache throws an innocent entry out. The order of those two questions is the whole bug; naming the cases (replace, insert with room, insert when full) before coding removes it.",
    },
    {
      dir: "contains_touches",
      failsPhase: "base",
      failingTests: ["Recency.ContainsIsAPeekAndDoesNotRefresh"],
      reason: "contains() records a use, so a monitoring check that merely asks 'is it there?' keeps entries alive that nobody is reading. A peek that disturbs the thing it observes is the cache version of a Heisenbug; marking the method const makes the compiler argue for you.",
    },
    {
      dir: "erase_counts_eviction",
      failsPhase: "base",
      failingTests: ["StatsTest.EvictionsCountOnlyEntriesPushedOutForRoom"],
      reason: "erase() bumps the eviction counter. Operators read that counter as 'the cache is too small', so counting deliberate removals makes a healthy cache look starved. A counter belongs to one place that is told what happened, not to every method that removes something.",
    },
    {
      dir: "erase_leaves_ghost",
      failsPhase: "base",
      failingTests: ["Erase.AnErasedKeyIsNeverChosenAsAVictimLater"],
      reason: "erase() removes the entry from the map but not from the recency order, so the order keeps naming a key that is gone. Later the cache 'evicts' the ghost, frees nothing, and grows past its capacity. Two structures that must agree are the classic source of this bug: one owner that updates both, or a policy that is told about every removal, makes it impossible.",
    },
    {
      dir: "lru_baked_in",
      failsPhase: "storm1",
      failingTests: ["Policy.FifoEvictsTheOldestInsertEvenAfterAHit", "Policy.MruEvictsTheNewestKey", "Policy.LfuKeepsTheFrequentlyUsedKey"],
      reason: "makePolicyCache() accepts the policy and quietly uses its own LRU list anyway, the result of bolting a parameter onto a design that has recency logic inside the cache. The cache must hold no opinion on who goes: if the Strategy seam is real, deleting the built-in LRU class leaves the cache compiling.",
    },
    {
      dir: "overwrite_as_insert",
      failsPhase: "storm1",
      failingTests: ["Protocol.ANewKeyIsAnInsertAndAReplacementIsAnAccess"],
      reason: "A replacement is reported to the policy as a fresh insert. A policy that counts uses or keeps an insertion queue (FIFO, LFU) then sees the key twice and resets its history. The protocol is part of the contract: new key, insert; known key, access.",
    },
    {
      dir: "miss_counts_as_access",
      failsPhase: "storm1",
      failingTests: ["Protocol.AHitIsAnAccessAndAMissOrAPeekIsNothing"],
      reason: "A get() miss is forwarded to the policy as an access to a key the cache does not hold. A frequency-based policy would start to track phantom keys and could nominate one as a victim later. Tell the policy about hits only.",
    },
    {
      dir: "notify_before_removal",
      failsPhase: "storm2",
      failingTests: ["Listener.TheEntryIsGoneWhenTheListenerRunsForAnEviction"],
      reason: "The listener is called while the victim is still stored, so it sees contains() true and a size equal to the capacity. A listener that looks at the cache (to refill, to log occupancy) sees a half-finished state. Finish the state change, then announce it.",
    },
    {
      dir: "erase_silent",
      failsPhase: "storm2",
      failingTests: ["Listener.ErasingReportsTheValueItHeld", "Listener.EveryRemovalIsReportedOnceAndInOrder"],
      reason: "Only evictions are announced; an explicit erase() slips past. Removal has two exits, and a design that announces from one method instead of from one collaborator that every exit calls will miss the other. That is how write-back caches lose dirty data.",
    },
    {
      dir: "overwrite_notifies",
      failsPhase: "storm2",
      failingTests: ["Listener.ReplacingAValueIsNotARemoval", "Listener.TheValueReportedIsTheLatestOne"],
      reason: "Replacing a value is reported as a removal of the old one. The contract says an entry leaves when its key does; the key stayed. Whether replacement is reported (some libraries do, with a reason of its own) is a legitimate question for the interviewer, which is why the clarification menu has it.",
    },
  ],
};
