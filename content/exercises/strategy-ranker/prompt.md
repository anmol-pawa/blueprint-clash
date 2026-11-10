A leaderboard must be re-sortable by different rules (highest score, alphabetical, fewest games played) without the leaderboard knowing any of them. That is the **Strategy** pattern: the varying algorithm lives behind `RankingPolicy` (see `api.h`) and the context holds one and delegates to it.

Write in `solution.h`:

- `HighestScore`: a `RankingPolicy` where a higher `score` comes first.
- `Alphabetical`: a `RankingPolicy` where the lexicographically smaller `name` comes first.
- `Leaderboard`:
  - `explicit Leaderboard(std::unique_ptr<RankingPolicy> policy)` takes ownership. A null policy falls back to `HighestScore` (the judge builds without exceptions, so there is nothing to throw; a context should never hold a null strategy).
  - `void add(Player p)` records a player (names are unique; you do not need to check).
  - `void setPolicy(std::unique_ptr<RankingPolicy> policy)` swaps the rule at runtime (a null policy is ignored and the old policy stays in place).
  - `std::vector<std::string> top(std::size_t n) const` returns the names of the first `n` players under the current policy, or all of them if there are fewer. **Tied players keep the order in which they were added.**

`Leaderboard` must not contain any `if`/`switch` on which rule is active, and adding a new policy must not require editing it.
