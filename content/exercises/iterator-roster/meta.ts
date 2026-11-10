import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "iterator-roster",
  title: "Iterator: hide the tombstones behind begin() and end()",
  concepts: ["iterator", "tombstones", "forward iterator requirements", "const-correctness", "encapsulation"],
  hints: [
    "The iterator needs two things: a pointer to the slots (`const std::vector<Slot>*`) and an index. `begin()` and `end()` build one each; `end()` is index `slots_.size()`.",
    "Write one private helper, `skipDead()`: `while (index_ < slots_->size() && !(*slots_)[index_].live) ++index_;`. Call it from the constructor (so `begin()` skips leading tombstones) and from `operator++` (so runs of tombstones and trailing ones are skipped).",
    "Return `const std::string&` from `operator*`. Post-increment copies `*this`, calls pre-increment, and returns the copy. Add the five typedefs (`iterator_category = std::forward_iterator_tag`, `value_type`, `difference_type`, `pointer`, `reference`) so `std::count_if` and `std::distance` accept it. Keep a separate `live_` counter for `size()`.",
  ],
  wrong: [
    { dir: "skip_one_only", failingTests: ["Roster.SkipsSeveralDeadEntriesInARow", "Roster.TrailingDeadEntriesAreNotVisited"], reason: "Skips a single dead slot with an if instead of a loop: two tombstones in a row leak a removed name to the caller." },
    { dir: "no_skip_in_begin", failingTests: ["Roster.SkipsDeadEntriesAtTheStart"], reason: "Only operator++ skips, so begin() lands on a leading tombstone and the first element visited is a removed one." },
    { dir: "no_skip_after_increment", failingTests: ["Roster.SkipsSeveralDeadEntriesInARow", "Roster.TrailingDeadEntriesAreNotVisited"], reason: "Skips tombstones only when the iterator is created, not when it advances, so dead entries in the middle and at the tail are visited." },
    { dir: "size_counts_slots", failingTests: ["Roster.SizeCountsOnlyLiveEntries"], reason: "size() returns the number of slots including tombstones, so it disagrees with what iteration shows." },
    { dir: "post_increment_returns_new", failingTests: ["Roster.PostIncrementReturnsThePreviousPosition"], reason: "it++ returns the already-advanced iterator, the classic post-increment bug that breaks `*it++` idioms." },
    { dir: "deref_by_value", failingTests: [], rejects: "compile", reason: "operator* returns a std::string by value: every dereference copies, `it->` has nothing stable to point at, and the iterator no longer models a reference-returning forward iterator." },
    { dir: "no_iterator_typedefs", failingTests: [], rejects: "compile", reason: "Omits the five iterator typedefs, so std::count_if, std::find and std::distance cannot use it: it only works in a hand-written loop." },
  ],
};
