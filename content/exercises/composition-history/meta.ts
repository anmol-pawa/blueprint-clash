import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "composition-history",
  title: "Command history: has-a container, not is-a container",
  concepts: ["composition over inheritance", "narrow interface", "class invariant", "std::deque"],
  hints: [
    "Does a history *behave like* a vector everywhere a vector is used? What would `history.insert(history.begin(), x)` do to the capacity rule?",
    "Hold a `std::deque<std::string>` as a private member and expose only the five operations in the prompt. The invariant `size() <= capacity` can then only be broken inside the class.",
    "`add`: `if (capacity_ == 0) return; if (items_.size() == capacity_) items_.pop_front(); items_.push_back(entry);`. `latest`: `items_.empty() ? std::string() : items_.back()`.",
  ],
  wrong: [
    { dir: "inherits_vector", failingTests: ["Design.NotDerivedFromVector", "Design.NoPushBack"], reason: "Publicly derives from std::vector<std::string>: the behaviour tests pass but any caller can push_back, insert or clear and break the capacity invariant (is-a chosen for code reuse)." },
    { dir: "no_eviction", failingTests: ["History.DropsTheOldestWhenFull"], reason: "Never evicts, so the history grows without bound." },
    { dir: "evicts_newest", failingTests: ["History.DropsTheOldestWhenFull", "History.LatestIsTheNewestEntry"], reason: "When full it discards the new entry instead of the oldest, so the history freezes at the first N commands." },
  ],
};
