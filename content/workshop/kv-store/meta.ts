import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "kv-store",
  title: "Key-value store with TTL and transactions",
  level: "Senior",
  parMinutes: 55,
  patterns: ["Command", "Memento"],
  requirements: [
    { id: "R-ttl", text: "Time comes from an injected Clock. setWithTtl(key, value, ttl) makes the key readable while now() < setTime + ttl and gone from setTime + ttl onwards. A ttl of zero or less returns false and changes nothing. makeStore() returns nullptr for a null clock.", phase: "base", hidden: true },
    { id: "R-live", text: "set() and setWithTtl() replace both the value and the expiry (a plain set clears an earlier expiry). An expired key is absent everywhere: get() is empty, size() does not count it, erase() returns false, ttlRemaining() is empty. ttlRemaining() is empty for absent and non-expiring keys and never changes the expiry.", phase: "base", hidden: true },
    { id: "R-txn", text: "Storm 1: begin/commit/rollback nest. Reads see uncommitted writes. rollback() restores values, expiries and the presence of keys, undoing writes in reverse; an expiry that passes during the transaction stays passed. An inner commit hands its writes to the enclosing transaction, so an outer rollback undoes them; only the outermost commit makes them final. commit() and rollback() return false with no open transaction.", phase: "storm1", hidden: true },
    { id: "R-scan", text: "Storm 2: keysWithPrefix(prefix) lists live keys that start with the prefix, ascending by std::string order, each once. The empty prefix lists everything live. Expired keys are not listed, uncommitted writes are visible and a rollback hides or restores them.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "ttl_inclusive",
      failsPhase: "base",
      failingTests: ["Ttl.AKeyLivesUntilItsLastTickAndIsGoneAtTheExpiryTick", "Ttl.TheTimeToLiveCountsFromTheMomentOfTheSet"],
      reason: "The liveness check uses <= instead of <, so a key set with a ttl of 10 survives 11 ticks. Off-by-one at the boundary is the classic expiry bug, and it is easy to ship because production clocks are fine-grained enough to hide it. Writing the interval down (readable while now < setTime + ttl) and keeping the comparison in one function makes it testable at the exact tick.",
    },
    {
      dir: "overwrite_keeps_ttl",
      failsPhase: "base",
      failingTests: ["Overwrite.PlainSetClearsAnEarlierExpiry"],
      reason: "A plain set() on a key that has an expiry keeps the old expiry, so a value the caller meant to keep forever disappears later. Whether overwrite clears or keeps the expiry is a real product decision (Redis clears it; some stores offer a KEEPTTL option), which is exactly why it belongs on the clarification menu.",
    },
    {
      dir: "size_counts_expired",
      failsPhase: "base",
      failingTests: ["Size.ExpiredKeysAreNotCounted", "Ttl.KeysExpireIndependently"],
      reason: "size() returns the number of stored entries, including expired ones nobody has touched yet. The store has several ways to ask about a key and each one re-implemented 'is it live?' (or forgot to). One ExpiryRule that every read path consults is the cure; it also keeps the lazy-deletion decision in one place.",
    },
    {
      dir: "erase_expired_true",
      failsPhase: "base",
      failingTests: ["Erase.AnExpiredKeyCountsAsAbsent"],
      reason: "erase() reports true for a key that had already expired, because the entry was still physically in the table. The return value is part of the contract: a caller using it to know whether it released a lock would believe it still held one.",
    },
    {
      dir: "ttl_zero_accepted",
      failsPhase: "base",
      failingTests: ["Ttl.ANonPositiveTtlIsRefusedAndChangesNothing"],
      reason: "A ttl of zero or less is stored as an entry that is already expired, and the call reports success. That silently deletes whatever value the key held before. Validating at the boundary and refusing without side effects is cheaper than explaining a vanished value later.",
    },
    {
      dir: "rollback_keeps_new_key",
      failsPhase: "storm1",
      failingTests: ["Rollback.RemovesKeysTheTransactionCreated", "Nested.InnerRollbackLeavesTheOuterWritesAlone"],
      reason: "rollback() restores the old value of keys that had one but leaves behind the keys the transaction created, because 'the previous state' was modelled as a value and a new key has none. The journal must record 'there was nothing here' as a state of its own (an empty optional), so that undo is always 'put this back', never a case analysis.",
    },
    {
      dir: "rollback_loses_ttl",
      failsPhase: "storm1",
      failingTests: ["Rollback.RestoresTheExpiryAsWellAsTheValue"],
      reason: "The journal remembers the old value but not the old expiry, so a rolled-back key comes back immortal. State to undo is the whole entry, not a field of it. A Memento that captures a part of the object is the usual way an undo feature rots as the object grows a new field.",
    },
    {
      dir: "inner_commit_final",
      failsPhase: "storm1",
      failingTests: ["Nested.AnInnerCommitIsUndoneByTheOuterRollback"],
      reason: "Committing an inner transaction throws its undo records away, so the outer rollback can no longer undo those writes. In nested transactions a commit means 'now part of my parent', not 'permanent'. Only the outermost commit may forget.",
    },
    {
      dir: "rollback_forward_order",
      failsPhase: "storm1",
      failingTests: ["Rollback.RestoresOverwrittenValues", "Rollback.UndoesWritesInReverseSoTheOldestStateWins"],
      reason: "The records are replayed oldest first, so a key written twice ends up in the state between the two writes. Undo is a stack: the newest write must be undone first so that the oldest 'before' is the last one applied.",
    },
    {
      dir: "rollback_without_txn_true",
      failsPhase: "storm1",
      failingTests: ["Txn.WithoutATransactionCommitAndRollbackReturnFalse", "Nested.AnInnerCommitIsFinalOnlyWhenTheOutermostCommits"],
      reason: "commit() and rollback() report success even when no transaction is open. Callers use the result to find unbalanced begin/commit pairs; a store that says yes to everything hides the bug until data is lost.",
    },
    {
      dir: "scan_substring",
      failsPhase: "storm2",
      failingTests: ["Scan.ThePrefixMustBeAtTheStartNotAnywhere"],
      reason: "The listing matches the text anywhere in the key (find) instead of at the start. A prefix is a range in an ordered structure, and the right data structure makes the right comparison natural; here the scan is O(n) and also wrong.",
    },
    {
      dir: "scan_includes_expired",
      failsPhase: "storm2",
      failingTests: ["Scan.ExpiredKeysAreNotListed"],
      reason: "The listing walks the table without asking the expiry rule, so expired keys show up. A new read path is the moment a duplicated 'is it live?' check goes missing; one rule consulted by every read path prevents it.",
    },
    {
      dir: "scan_unsorted",
      failsPhase: "storm2",
      failingTests: ["Scan.ResultsAreInAscendingOrderWhateverTheInsertionOrder"],
      reason: "The table is a hash map, so the listing comes back in hash order. An ordered listing needs an ordered structure (or a sort at read time, O(n log n)); swapping the structure is a change confined to the table class when the storage is already behind a seam.",
    },
  ],
};
