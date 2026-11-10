import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "strategy-ranker",
  title: "Strategy: a leaderboard whose ranking rule can be swapped at runtime",
  concepts: ["strategy", "polymorphism", "strict weak ordering", "stable sort", "ownership", "open/closed"],
  hints: [
    "The leaderboard should only know `RankingPolicy`. Store it in a `std::unique_ptr<RankingPolicy>` and never ask which concrete rule it is.",
    "`top(n)` works on a copy of the players: copy the vector, `std::stable_sort` it with a lambda that calls `policy_->before(a, b)`, then take the first `min(n, size)` names. `stable_sort` is what keeps tied players in insertion order.",
    "A policy's `before` must be a strict comparison (`>` or `<`, never `>=`/`<=`). Never let a null policy reach `top()`: the constructor falls back to `HighestScore`, and `setPolicy` ignores null so the old rule stays in place.",
  ],
  wrong: [
    { dir: "hardcoded_rule", failingTests: ["Leaderboard.AlphabeticalPolicyOrdersByName", "Leaderboard.SwappingThePolicyReordersTheSameData"], reason: "Ignores the policy and always sorts by score: the strategy object exists but the context never delegates to it." },
    { dir: "unstable_sort", failingTests: ["Leaderboard.TiedPlayersKeepInsertionOrder"], reason: "Uses std::sort, which is free to reorder equal elements: ties come out in an arbitrary order." },
    { dir: "non_strict_compare", failingTests: ["Leaderboard.TiedPlayersKeepInsertionOrder"], reason: "HighestScore uses >=, which is not a strict weak ordering: ties are reported as 'before' each other and the order of tied players is undefined." },
    { dir: "swap_ignored", failingTests: ["Leaderboard.SwappingThePolicyReordersTheSameData"], reason: "setPolicy stores the new rule but top() keeps using the one chosen at construction." },
    { dir: "null_accepted", failingTests: ["Leaderboard.NullPolicyFallsBackToHighestScore"], reason: "Stores a null policy and dereferences it later, or silently replaces a working rule with nothing." },
    { dir: "top_overruns", failingTests: ["Leaderboard.TopMoreThanSizeReturnsEveryone"], reason: "top(n) trusts n and indexes past the end when n exceeds the number of players." },
  ],
};
