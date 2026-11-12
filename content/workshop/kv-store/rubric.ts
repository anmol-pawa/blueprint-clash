import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations and sequences table, expiry rule and journal in the right order", phase: "base", owners: ["StoreImpl", "KvStore", "StoreFacade", "StoreCore", "InMemoryStore"] },
  { id: "res-table", text: "Holds the entries (value and absolute expiry) with no idea what time it is", phase: "base", owners: ["EntryTable", "Table", "Storage", "EntryMap", "KeyValueTable"] },
  { id: "res-expiry", text: "Owns the clock and the one definition of 'expired'; every read, count and listing asks it", phase: "base", owners: ["ExpiryRule", "ExpiryPolicy", "TtlPolicy", "Expirer", "LivenessRule"] },
  { id: "res-journal", text: "Remembers how to undo each write, per open transaction, and merges or replays it on commit and rollback", phase: "storm1", owners: ["UndoJournal", "TransactionLog", "TransactionStack", "UndoLog", "TxnManager"] },
  { id: "res-order", text: "Keeps keys in order so that a prefix is a contiguous range and the listing is sorted", phase: "storm2", owners: ["EntryTable", "KeyIndex", "OrderedIndex", "SortedIndex", "Table"] },
];
