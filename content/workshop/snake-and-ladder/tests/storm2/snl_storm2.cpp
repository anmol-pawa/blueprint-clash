#include <cstddef>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

using snl::Link;
using snl::Rules;
using snl::Turn;

namespace {
struct Script {
  std::vector<int> rolls;
  std::size_t next = 0;
};

class ScriptedDice : public snl::Dice {
 public:
  explicit ScriptedDice(Script* script) : script_(script) {}
  int roll() override { return script_->next < script_->rolls.size() ? script_->rolls[script_->next++] : 1; }

 private:
  Script* script_;
};

std::unique_ptr<snl::Dice> diceFor(Script& s) { return std::make_unique<ScriptedDice>(&s); }

const std::vector<Link> kNoLinks;

Rules sixes() {
  Rules r;
  r.sixRerolls = true;
  return r;
}

std::unique_ptr<snl::ResignableGame> gameOf(int players, int size, Script& s, Rules rules = Rules{}) {
  return snl::makeResignableGame(players, size, kNoLinks, rules, diceFor(s));
}
}  // namespace

TEST(Resign, InvalidSetupsAreRejected) {
  Script s;
  EXPECT_TRUE(gameOf(1, 20, s) == nullptr);
  EXPECT_TRUE(snl::makeResignableGame(2, 20, kNoLinks, Rules{}, nullptr) == nullptr);
  EXPECT_TRUE(snl::makeResignableGame(2, 20, {{3, 8}, {8, 12}}, Rules{}, diceFor(s)) == nullptr);
}

TEST(Resign, PlaysLikeTheOtherGamesUntilSomeoneLeaves) {
  Script s{{4, 5}};
  auto g = gameOf(2, 20, s);
  ASSERT_TRUE(g != nullptr);
  EXPECT_EQ(g->takeTurn().to, 4);
  EXPECT_EQ(g->takeTurn().to, 5);
  EXPECT_TRUE(g->isActive(0));
  EXPECT_TRUE(g->isActive(1));
}

TEST(Resign, LeavingWorksOnceAndOnlyForRealPlayers) {
  Script s;
  auto g = gameOf(3, 20, s);
  EXPECT_TRUE(g->resign(1));
  EXPECT_FALSE(g->isActive(1));
  EXPECT_TRUE(g->isActive(0));
  EXPECT_FALSE(g->resign(1));
  EXPECT_FALSE(g->resign(3));
  EXPECT_FALSE(g->resign(-1));
  EXPECT_FALSE(g->isActive(3));
  EXPECT_FALSE(g->isActive(-1));
}

TEST(Resign, LeavingOutOfTurnKeepsTheTurnWhereItIs) {
  Script s{{1, 1, 1}};
  auto g = gameOf(3, 50, s);
  EXPECT_TRUE(g->resign(2));
  EXPECT_EQ(g->currentPlayer(), 0);
  g->takeTurn();
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Resign, LeavingOnYourTurnPassesTheTurn) {
  Script s;
  auto g = gameOf(3, 50, s);
  EXPECT_TRUE(g->resign(0));
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Resign, TheLastIndexWrapsRoundToTheFirst) {
  Script s{{1, 1}};
  auto g = gameOf(3, 50, s);
  g->takeTurn();
  g->takeTurn();
  EXPECT_EQ(g->currentPlayer(), 2);
  EXPECT_TRUE(g->resign(2));
  EXPECT_EQ(g->currentPlayer(), 0);
}

TEST(Resign, TheTurnOrderSkipsPlayersWhoLeft) {
  Script s{{1, 2, 3, 4}};
  auto g = gameOf(3, 50, s);
  g->resign(1);
  EXPECT_EQ(g->takeTurn().player, 0);
  EXPECT_EQ(g->takeTurn().player, 2);
  EXPECT_EQ(g->takeTurn().player, 0);
  EXPECT_EQ(g->takeTurn().player, 2);
}

TEST(Resign, AGameWithOnePlayerLeftIsWon) {
  Script s;
  auto g = gameOf(2, 20, s);
  EXPECT_TRUE(g->resign(0));
  EXPECT_TRUE(g->finished());
  EXPECT_EQ(g->winner(), 1);
  EXPECT_EQ(g->currentPlayer(), -1);
}

TEST(Resign, ThreePlayersNeedTwoDepartures) {
  Script s;
  auto g = gameOf(3, 20, s);
  EXPECT_TRUE(g->resign(0));
  EXPECT_FALSE(g->finished());
  EXPECT_EQ(g->winner(), -1);
  EXPECT_TRUE(g->resign(1));
  EXPECT_TRUE(g->finished());
  EXPECT_EQ(g->winner(), 2);
}

TEST(Resign, NothingHappensAfterTheGameIsWonByDefault) {
  Script s{{3, 3}};
  auto g = gameOf(2, 20, s);
  g->resign(1);
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.player, -1);
  EXPECT_EQ(s.next, 0u);
  EXPECT_EQ(g->turnsTaken(), 0);
}

TEST(Resign, YouCannotLeaveAFinishedGame) {
  Script s{{6, 1, 4}};
  auto g = gameOf(2, 10, s);
  g->takeTurn();
  g->takeTurn();
  g->takeTurn();
  ASSERT_TRUE(g->finished());
  EXPECT_FALSE(g->resign(1));
  EXPECT_EQ(g->winner(), 0);
  EXPECT_TRUE(g->isActive(1));
}

TEST(Resign, ThePieceStaysWhereItWas) {
  Script s{{2, 5}};
  auto g = gameOf(3, 50, s);
  g->takeTurn();
  g->takeTurn();
  g->resign(1);
  EXPECT_EQ(g->positionOf(1), 5);
}

TEST(Resign, TheRemainingPlayersFinishTheRace) {
  Script s{{3, 3, 5, 4, 3, 5}};
  auto g = gameOf(3, 12, s);
  g->takeTurn();  // player 0: 3
  g->resign(1);
  g->takeTurn();  // player 2: 3
  g->takeTurn();  // player 0: 8
  g->takeTurn();  // player 2: 7
  g->takeTurn();  // player 0: 11
  const Turn t = g->takeTurn();  // player 2 rolls 5: exactly 12
  EXPECT_EQ(t.player, 2);
  EXPECT_TRUE(t.won);
  EXPECT_EQ(g->winner(), 2);
}

TEST(Resign, LeavingDuringABonusRollPassesTheTurn) {
  Script s{{6}};
  auto g = gameOf(3, 50, s, sixes());
  g->takeTurn();
  EXPECT_EQ(g->currentPlayer(), 0);  // the six earned another roll
  EXPECT_TRUE(g->resign(0));
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Resign, TheNextPlayerStartsWithAFreshRunOfSixes) {
  Script s{{6, 6, 6, 4}};
  auto g = gameOf(3, 60, s, sixes());
  g->takeTurn();
  g->takeTurn();  // player 0 has rolled two sixes in a row
  g->resign(0);
  const Turn t = g->takeTurn();  // player 1 rolls a six: the first of their run, so it is played
  EXPECT_EQ(t.player, 1);
  EXPECT_EQ(t.to, 6);
  EXPECT_EQ(g->currentPlayer(), 1);
}
