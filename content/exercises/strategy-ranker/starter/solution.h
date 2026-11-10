#pragma once
#include <algorithm>
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// TODO: higher score first.
class HighestScore final : public RankingPolicy {
 public:
  bool before(const Player&, const Player&) const override { return false; }
};

// TODO: smaller name first.
class Alphabetical final : public RankingPolicy {
 public:
  bool before(const Player&, const Player&) const override { return false; }
};

// TODO: hold a RankingPolicy, delegate ordering to it, keep ties in insertion order.
class Leaderboard {
 public:
  explicit Leaderboard(std::unique_ptr<RankingPolicy>) {}
  void add(Player) {}
  void setPolicy(std::unique_ptr<RankingPolicy>) {}
  std::vector<std::string> top(std::size_t) const { return {}; }
};
