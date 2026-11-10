#pragma once
#include <algorithm>
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

class HighestScore final : public RankingPolicy {
 public:
  bool before(const Player& a, const Player& b) const override { return a.score > b.score; }
};

class Alphabetical final : public RankingPolicy {
 public:
  bool before(const Player& a, const Player& b) const override { return a.name < b.name; }
};

// Context: it knows the RankingPolicy interface and nothing about any concrete rule.
class Leaderboard {
 public:
  explicit Leaderboard(std::unique_ptr<RankingPolicy> policy)
      : policy_(policy ? std::move(policy) : std::make_unique<HighestScore>()) {}

  void add(Player p) { players_.push_back(std::move(p)); }

  void setPolicy(std::unique_ptr<RankingPolicy> policy) {
    (void)policy;
  }

  std::vector<std::string> top(std::size_t n) const {
    std::vector<Player> ranked = players_;
    // stable_sort keeps tied players in the order they were added.
    std::stable_sort(ranked.begin(), ranked.end(),
                     [this](const Player& a, const Player& b) { return policy_->before(a, b); });
    std::vector<std::string> names;
    const std::size_t count = std::min(n, ranked.size());
    names.reserve(count);
    for (std::size_t i = 0; i < count; ++i) names.push_back(ranked[i].name);
    return names;
  }

 private:
  std::unique_ptr<RankingPolicy> policy_;
  std::vector<Player> players_;
};
