#include <cstddef>
#include <initializer_list>
#include <utility>
#include <vector>

#include "api.h"
#include "bp_test.h"

using snl::Jump;
using snl::Link;
using snl::Turn;

namespace {
// The rolls a test wants, and how many have been used. The game owns the Dice, the test owns the script.
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
// On a 20-square board: a ladder 4 -> 14 and a snake 17 -> 7.
const std::vector<Link> kLinks = {{4, 14}, {17, 7}};

void rollAll(snl::Game& g, int times) {
  for (int i = 0; i < times; ++i) g.takeTurn();
}
}  // namespace

TEST(Turns, EveryoneStartsOffTheBoard) {
  Script s;
  auto g = snl::makeGame(3, 20, kLinks, diceFor(s));
  ASSERT_TRUE(g != nullptr);
  for (int p = 0; p < 3; ++p) EXPECT_EQ(g->positionOf(p), 0);
  EXPECT_EQ(g->currentPlayer(), 0);
  EXPECT_FALSE(g->finished());
  EXPECT_EQ(g->winner(), -1);
  EXPECT_EQ(g->turnsTaken(), 0);
}

TEST(Turns, ARollMovesTheCurrentPlayer) {
  Script s{{3}};
  auto g = snl::makeGame(2, 20, kNoLinks, diceFor(s));
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.player, 0);
  EXPECT_EQ(t.roll, 3);
  EXPECT_EQ(t.from, 0);
  EXPECT_EQ(t.to, 3);
  EXPECT_TRUE(t.jump == Jump::None);
  EXPECT_FALSE(t.won);
  EXPECT_EQ(g->positionOf(0), 3);
  EXPECT_EQ(g->positionOf(1), 0);
  EXPECT_EQ(g->turnsTaken(), 1);
}

TEST(Turns, PlayersTakeTurnsInOrderAndWrapAround) {
  Script s{{1, 2, 3, 4}};
  auto g = snl::makeGame(3, 50, kNoLinks, diceFor(s));
  EXPECT_EQ(g->takeTurn().player, 0);
  EXPECT_EQ(g->currentPlayer(), 1);
  EXPECT_EQ(g->takeTurn().player, 1);
  EXPECT_EQ(g->takeTurn().player, 2);
  EXPECT_EQ(g->currentPlayer(), 0);
  const Turn fourth = g->takeTurn();
  EXPECT_EQ(fourth.player, 0);
  EXPECT_EQ(fourth.from, 1);
  EXPECT_EQ(fourth.to, 5);
  EXPECT_EQ(g->positionOf(1), 2);
  EXPECT_EQ(g->positionOf(2), 3);
}

TEST(Turns, PlayersMayShareASquare) {
  Script s{{2, 2}};
  auto g = snl::makeGame(2, 20, kNoLinks, diceFor(s));
  rollAll(*g, 2);
  EXPECT_EQ(g->positionOf(0), 2);
  EXPECT_EQ(g->positionOf(1), 2);
}

TEST(Turns, PositionOfAnUnknownPlayerIsMinusOne) {
  Script s;
  auto g = snl::makeGame(2, 20, kNoLinks, diceFor(s));
  EXPECT_EQ(g->positionOf(-1), -1);
  EXPECT_EQ(g->positionOf(2), -1);
}

TEST(Links, ALadderCarriesThePieceUp) {
  Script s{{4}};
  auto g = snl::makeGame(2, 20, kLinks, diceFor(s));
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.from, 0);
  EXPECT_EQ(t.to, 14);
  EXPECT_TRUE(t.jump == Jump::Ladder);
  EXPECT_EQ(g->positionOf(0), 14);
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Links, ASnakeSlidesThePieceDown) {
  Script s{{6, 1, 6, 1, 5}};  // player 0 reaches 6, 12, then 17; player 1 shuffles along
  auto g = snl::makeGame(2, 20, kLinks, diceFor(s));
  rollAll(*g, 4);
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.player, 0);
  EXPECT_EQ(t.from, 12);
  EXPECT_EQ(t.to, 7);
  EXPECT_TRUE(t.jump == Jump::Snake);
  EXPECT_EQ(g->positionOf(0), 7);
}

TEST(Links, PassingOverALinkDoesNothing) {
  Script s{{3, 1, 3}};  // 0 -> 3, then 3 -> 6 steps over the ladder at 4
  auto g = snl::makeGame(2, 20, kLinks, diceFor(s));
  rollAll(*g, 3);
  EXPECT_EQ(g->positionOf(0), 6);
}

TEST(Links, ALinkOnlyAppliesToThePlayerWhoStoppedThere) {
  Script s{{4}};
  auto g = snl::makeGame(3, 20, kLinks, diceFor(s));
  g->takeTurn();
  EXPECT_EQ(g->positionOf(0), 14);
  EXPECT_EQ(g->positionOf(1), 0);
  EXPECT_EQ(g->positionOf(2), 0);
}

TEST(Links, ASnakeCanSendYouBackToSquareOne) {
  Script s{{3, 1, 1}};
  auto g = snl::makeGame(2, 20, {{4, 1}}, diceFor(s));
  rollAll(*g, 2);  // player 0 on 3, player 1 on 1
  const Turn t = g->takeTurn();  // player 0 rolls 1 and stops on the snake's head at 4
  EXPECT_TRUE(t.jump == Jump::Snake);
  EXPECT_EQ(g->positionOf(0), 1);
}

TEST(Finish, AnExactRollWins) {
  Script s{{6, 1, 4}};
  auto g = snl::makeGame(2, 10, kNoLinks, diceFor(s));
  rollAll(*g, 2);
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.to, 10);
  EXPECT_TRUE(t.won);
  EXPECT_TRUE(g->finished());
  EXPECT_EQ(g->winner(), 0);
  EXPECT_EQ(g->currentPlayer(), -1);
  EXPECT_EQ(g->positionOf(0), 10);
}

TEST(Finish, OvershootingStaysPutAndPassesTheTurn) {
  Script s{{6, 1, 6}};
  auto g = snl::makeGame(2, 10, kNoLinks, diceFor(s));
  rollAll(*g, 2);
  const Turn t = g->takeTurn();  // 6 + 6 = 12, past the last square
  EXPECT_EQ(t.from, 6);
  EXPECT_EQ(t.to, 6);
  EXPECT_FALSE(t.won);
  EXPECT_EQ(g->positionOf(0), 6);
  EXPECT_FALSE(g->finished());
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Finish, ALadderToTheLastSquareWins) {
  Script s{{5}};
  auto g = snl::makeGame(2, 20, {{5, 20}}, diceFor(s));
  const Turn t = g->takeTurn();
  EXPECT_TRUE(t.jump == Jump::Ladder);
  EXPECT_TRUE(t.won);
  EXPECT_EQ(g->winner(), 0);
}

TEST(Finish, TheSecondPlayerCanWin) {
  Script s{{1, 6, 2, 4}};
  auto g = snl::makeGame(2, 10, kNoLinks, diceFor(s));
  rollAll(*g, 3);  // player 0 on 3, player 1 on 6
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.player, 1);
  EXPECT_TRUE(t.won);
  EXPECT_EQ(g->winner(), 1);
}

TEST(Finish, NothingHappensAfterTheGameIsOver) {
  Script s{{6, 1, 4, 3, 3}};
  auto g = snl::makeGame(2, 10, kNoLinks, diceFor(s));
  rollAll(*g, 3);
  ASSERT_TRUE(g->finished());
  const std::size_t used = s.next;
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.player, -1);
  EXPECT_EQ(t.roll, 0);
  EXPECT_FALSE(t.won);
  EXPECT_EQ(s.next, used);  // the dice was not rolled
  EXPECT_EQ(g->turnsTaken(), 3);
  EXPECT_EQ(g->positionOf(1), 1);
  EXPECT_EQ(g->winner(), 0);
}

TEST(Finish, ABlockedRollStillCountsAsATurn) {
  Script s{{6, 1, 6}};
  auto g = snl::makeGame(2, 10, kNoLinks, diceFor(s));
  rollAll(*g, 3);
  EXPECT_EQ(g->turnsTaken(), 3);
}

TEST(Setup, NeedsAtLeastTwoPlayers) {
  Script s;
  EXPECT_TRUE(snl::makeGame(1, 20, kNoLinks, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(0, 20, kNoLinks, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(2, 20, kNoLinks, diceFor(s)) != nullptr);
}

TEST(Setup, NeedsABoardAndADice) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 1, kNoLinks, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(2, 2, kNoLinks, diceFor(s)) != nullptr);
  EXPECT_TRUE(snl::makeGame(2, 20, kNoLinks, nullptr) == nullptr);
}

TEST(Setup, LinksMustBeOnTheBoard) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{0, 5}}, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(2, 20, {{5, 21}}, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(2, 20, {{-3, 5}}, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(2, 20, {{5, 0}}, diceFor(s)) == nullptr);
}

TEST(Setup, ALinkMustGoSomewhere) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{5, 5}}, diceFor(s)) == nullptr);
}

TEST(Setup, TheLastSquareCannotStartALink) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{20, 3}}, diceFor(s)) == nullptr);
}

TEST(Setup, TwoLinksCannotStartOnTheSameSquare) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{5, 9}, {5, 2}}, diceFor(s)) == nullptr);
}

TEST(Setup, ALinkCannotEndWhereAnotherBegins) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{3, 8}, {8, 12}}, diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGame(2, 20, {{9, 3}, {3, 12}}, diceFor(s)) == nullptr);
}

TEST(Setup, TwoLinksMayShareAnEnd) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{3, 12}, {9, 12}, {16, 12}}, diceFor(s)) != nullptr);
}

TEST(Setup, ALinkMayEndOnTheLastSquare) {
  Script s;
  EXPECT_TRUE(snl::makeGame(2, 20, {{3, 20}}, diceFor(s)) != nullptr);
}
