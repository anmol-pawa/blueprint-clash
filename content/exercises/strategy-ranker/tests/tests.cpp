#include <memory>
#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
using Names = std::vector<std::string>;

Leaderboard sample(std::unique_ptr<RankingPolicy> policy) {
  Leaderboard board(std::move(policy));
  board.add({"mira", 50, 4});
  board.add({"ode", 90, 9});
  board.add({"bryn", 70, 2});
  return board;
}

// A rule defined by the test only: proves the leaderboard needs no edit for a new policy.
class FewestGames final : public RankingPolicy {
 public:
  bool before(const Player& a, const Player& b) const override { return a.games < b.games; }
};
}  // namespace

TEST(Leaderboard, HighestScoreComesFirst) {
  Leaderboard board = sample(std::make_unique<HighestScore>());
  EXPECT_TRUE(board.top(3) == (Names{"ode", "bryn", "mira"}));
}

TEST(Leaderboard, AlphabeticalPolicyOrdersByName) {
  Leaderboard board = sample(std::make_unique<Alphabetical>());
  EXPECT_TRUE(board.top(3) == (Names{"bryn", "mira", "ode"}));
}

TEST(Leaderboard, SwappingThePolicyReordersTheSameData) {
  Leaderboard board = sample(std::make_unique<HighestScore>());
  EXPECT_TRUE(board.top(1) == (Names{"ode"}));
  board.setPolicy(std::make_unique<Alphabetical>());
  EXPECT_TRUE(board.top(1) == (Names{"bryn"}));
  board.setPolicy(std::make_unique<HighestScore>());
  EXPECT_TRUE(board.top(2) == (Names{"ode", "bryn"}));
}

TEST(Leaderboard, ANewPolicyNeedsNoChangeToTheLeaderboard) {
  Leaderboard board = sample(std::make_unique<FewestGames>());
  EXPECT_TRUE(board.top(3) == (Names{"bryn", "mira", "ode"}));
}

TEST(Leaderboard, TiedPlayersKeepInsertionOrder) {
  Leaderboard board(std::make_unique<HighestScore>());
  Names expected;
  for (int i = 0; i < 60; ++i) {
    const std::string name = "p" + std::to_string(i);
    board.add({name, 10, 0});
    expected.push_back(name);
  }
  EXPECT_TRUE(board.top(60) == expected);
}

TEST(Leaderboard, TopLimitsTheResult) {
  Leaderboard board = sample(std::make_unique<HighestScore>());
  EXPECT_EQ(board.top(0).size(), static_cast<std::size_t>(0));
  EXPECT_TRUE(board.top(2) == (Names{"ode", "bryn"}));
}

TEST(Leaderboard, TopMoreThanSizeReturnsEveryone) {
  Leaderboard board = sample(std::make_unique<HighestScore>());
  EXPECT_EQ(board.top(100).size(), static_cast<std::size_t>(3));
  Leaderboard empty(std::make_unique<HighestScore>());
  EXPECT_EQ(empty.top(5).size(), static_cast<std::size_t>(0));
}

TEST(Leaderboard, TopDoesNotReorderTheStoredPlayers) {
  Leaderboard board = sample(std::make_unique<HighestScore>());
  board.top(3);
  board.setPolicy(std::make_unique<FewestGames>());
  // If top() had sorted in place, insertion order (the tie-breaker) would be lost.
  board.add({"zed", 0, 2});
  EXPECT_TRUE(board.top(4) == (Names{"bryn", "zed", "mira", "ode"}));
}

TEST(Leaderboard, NullPolicyFallsBackToHighestScore) {
  Leaderboard board = sample(nullptr);
  EXPECT_TRUE(board.top(2) == (Names{"ode", "bryn"}));
}

TEST(Leaderboard, NullSwapKeepsTheOldPolicy) {
  Leaderboard board = sample(std::make_unique<Alphabetical>());
  board.setPolicy(nullptr);
  EXPECT_TRUE(board.top(1) == (Names{"bryn"}));
}
