#include <cstddef>
#include <utility>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using snl::Jump;
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

Rules bounce() {
  Rules r;
  r.bounceBack = true;
  return r;
}

Rules sixes() {
  Rules r;
  r.sixRerolls = true;
  return r;
}

void rollAll(snl::Game& g, int times) {
  for (int i = 0; i < times; ++i) g.takeTurn();
}
}  // namespace

TEST(Rules, DefaultRulesPlayLikeTheBasicGame) {
  Script s{{6, 6, 1, 6, 4}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, Rules{}, diceFor(s));
  ASSERT_TRUE(g != nullptr);
  g->takeTurn();
  EXPECT_EQ(g->currentPlayer(), 1);  // a six does not reroll
  rollAll(*g, 2);                    // player 1 rolls 6, player 0 rolls 1
  EXPECT_EQ(g->positionOf(1), 6);
  const Turn t = g->takeTurn();  // player 1 rolls 6 from 6: past the end, stays
  EXPECT_EQ(t.to, 6);
  EXPECT_FALSE(g->finished());
}

TEST(Rules, InvalidSetupsAreStillRejected) {
  Script s;
  EXPECT_TRUE(snl::makeGameWithRules(1, 20, kNoLinks, sixes(), diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGameWithRules(2, 20, {{3, 8}, {8, 12}}, sixes(), diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGameWithRules(2, 20, kNoLinks, sixes(), nullptr) == nullptr);
}

TEST(Rules, BouncingNeedsABoardOfAtLeastSix) {
  Script s;
  EXPECT_TRUE(snl::makeGameWithRules(2, 5, kNoLinks, bounce(), diceFor(s)) == nullptr);
  EXPECT_TRUE(snl::makeGameWithRules(2, 6, kNoLinks, bounce(), diceFor(s)) != nullptr);
  EXPECT_TRUE(snl::makeGameWithRules(2, 2, kNoLinks, sixes(), diceFor(s)) != nullptr);
}

TEST(Bounce, AnOvershootBouncesOffTheLastSquare) {
  Script s{{6, 1, 6}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, bounce(), diceFor(s));
  rollAll(*g, 2);
  const Turn t = g->takeTurn();  // 6 + 6 = 12, two past the end: back to 8
  EXPECT_EQ(t.from, 6);
  EXPECT_EQ(t.to, 8);
  EXPECT_EQ(g->positionOf(0), 8);
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Bounce, TheLeftoverCountsBackwards) {
  Script s{{6, 1, 3, 1, 6}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, bounce(), diceFor(s));
  rollAll(*g, 4);
  EXPECT_EQ(g->positionOf(0), 9);
  const Turn t = g->takeTurn();  // 9 + 6 = 15, five past the end: back to 5
  EXPECT_EQ(t.to, 5);
}

TEST(Bounce, AnExactRollStillWins) {
  Script s{{6, 1, 4}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, bounce(), diceFor(s));
  rollAll(*g, 2);
  EXPECT_TRUE(g->takeTurn().won);
  EXPECT_EQ(g->winner(), 0);
}

TEST(Bounce, TheBounceSquareCanHoldASnake) {
  Script s{{6, 1, 6}};
  auto g = snl::makeGameWithRules(2, 10, {{8, 3}}, bounce(), diceFor(s));
  rollAll(*g, 2);
  const Turn t = g->takeTurn();  // bounces to 8, where a snake waits
  EXPECT_TRUE(t.jump == Jump::Snake);
  EXPECT_EQ(t.to, 3);
  EXPECT_EQ(g->positionOf(0), 3);
}

TEST(Bounce, TheBounceSquareCanHoldAWinningLadder) {
  Script s{{6, 1, 6}};
  auto g = snl::makeGameWithRules(2, 10, {{8, 10}}, bounce(), diceFor(s));
  rollAll(*g, 2);
  const Turn t = g->takeTurn();
  EXPECT_TRUE(t.jump == Jump::Ladder);
  EXPECT_TRUE(t.won);
  EXPECT_EQ(g->winner(), 0);
}

TEST(Bounce, WithoutTheOptionOvershootStillStays) {
  Script s{{6, 1, 6}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, Rules{}, diceFor(s));
  rollAll(*g, 2);
  EXPECT_EQ(g->takeTurn().to, 6);
}

TEST(Sixes, ASixGivesTheSamePlayerAnotherRoll) {
  Script s{{6, 2}};
  auto g = snl::makeGameWithRules(2, 30, kNoLinks, sixes(), diceFor(s));
  const Turn first = g->takeTurn();
  EXPECT_EQ(first.to, 6);
  EXPECT_EQ(g->currentPlayer(), 0);
  const Turn second = g->takeTurn();
  EXPECT_EQ(second.player, 0);
  EXPECT_EQ(second.to, 8);
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Sixes, EveryPlayerGetsTheBonus) {
  Script s{{2, 6, 3}};
  auto g = snl::makeGameWithRules(2, 30, kNoLinks, sixes(), diceFor(s));
  g->takeTurn();
  g->takeTurn();
  EXPECT_EQ(g->currentPlayer(), 1);
  EXPECT_EQ(g->takeTurn().player, 1);
  EXPECT_EQ(g->currentPlayer(), 0);
}

TEST(Sixes, TwoSixesInARowAreBothPlayed) {
  Script s{{6, 6, 1, 6}};
  auto g = snl::makeGameWithRules(2, 18, kNoLinks, sixes(), diceFor(s));
  rollAll(*g, 2);  // player 0: 6, 12 (both sixes), still player 0
  EXPECT_EQ(g->currentPlayer(), 0);
  g->takeTurn();  // roll 1: 13, turn passes
  g->takeTurn();  // player 1 rolls 6 from 0 and rolls again
  EXPECT_EQ(g->currentPlayer(), 1);
  EXPECT_EQ(g->positionOf(1), 6);
}

TEST(Sixes, AWinningSixEndsTheGameWithoutAnotherRoll) {
  Script s{{6, 6, 6, 3, 6}};
  auto g = snl::makeGameWithRules(2, 12, kNoLinks, sixes(), diceFor(s));
  g->takeTurn();  // player 0: 6
  g->takeTurn();  // player 0: 12, wins
  EXPECT_TRUE(g->finished());
  EXPECT_EQ(g->winner(), 0);
  EXPECT_EQ(g->currentPlayer(), -1);
  const std::size_t used = s.next;
  g->takeTurn();
  EXPECT_EQ(s.next, used);
}

TEST(Sixes, ABlockedSixStillCountsAsASix) {
  Script s{{6, 6, 4}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, sixes(), diceFor(s));
  g->takeTurn();  // 6
  const Turn blocked = g->takeTurn();  // 12 is past the end: stays on 6, rolls again
  EXPECT_EQ(blocked.to, 6);
  EXPECT_EQ(g->currentPlayer(), 0);
  EXPECT_TRUE(g->takeTurn().won);
}

TEST(Sixes, ASixLandingOnASnakeStillRollsAgain) {
  Script s{{6, 3}};
  auto g = snl::makeGameWithRules(2, 30, {{6, 2}}, sixes(), diceFor(s));
  const Turn t = g->takeTurn();
  EXPECT_TRUE(t.jump == Jump::Snake);
  EXPECT_EQ(g->positionOf(0), 2);
  EXPECT_EQ(g->currentPlayer(), 0);
}

TEST(Sixes, TheThirdSixInARowIsNotPlayed) {
  Script s{{6, 6, 6}};
  auto g = snl::makeGameWithRules(2, 40, kNoLinks, sixes(), diceFor(s));
  rollAll(*g, 2);
  EXPECT_EQ(g->positionOf(0), 12);
  const Turn t = g->takeTurn();
  EXPECT_EQ(t.player, 0);
  EXPECT_EQ(t.roll, 6);
  EXPECT_EQ(t.from, 12);
  EXPECT_EQ(t.to, 12);
  EXPECT_TRUE(t.jump == Jump::None);
  EXPECT_EQ(g->positionOf(0), 12);
  EXPECT_EQ(g->currentPlayer(), 1);
  EXPECT_EQ(g->turnsTaken(), 3);
}

TEST(Sixes, TheRunStartsAgainAfterAForfeit) {
  Script s{{6, 6, 6, 2, 6, 5}};
  auto g = snl::makeGameWithRules(2, 40, kNoLinks, sixes(), diceFor(s));
  rollAll(*g, 4);  // player 0 forfeits the third six, player 1 rolls 2
  EXPECT_EQ(g->currentPlayer(), 0);
  g->takeTurn();  // a fresh six: moves and keeps the turn
  EXPECT_EQ(g->positionOf(0), 18);
  EXPECT_EQ(g->currentPlayer(), 0);
}

TEST(Sixes, AnyOtherRollBreaksTheRun) {
  Script s{{6, 6, 3, 1, 6}};
  auto g = snl::makeGameWithRules(2, 40, kNoLinks, sixes(), diceFor(s));
  rollAll(*g, 4);  // player 0: 6, 6, 3 (turn passes), player 1: 1
  EXPECT_EQ(g->positionOf(0), 15);
  g->takeTurn();  // player 0 rolls a six: a run of one, so it is played
  EXPECT_EQ(g->positionOf(0), 21);
  EXPECT_EQ(g->currentPlayer(), 0);
}

TEST(Sixes, EachPlayerKeepsTheirOwnRun) {
  Script s{{6, 6, 2, 6, 6, 2}};
  auto g = snl::makeGameWithRules(2, 60, kNoLinks, sixes(), diceFor(s));
  rollAll(*g, 6);
  EXPECT_EQ(g->positionOf(0), 14);
  EXPECT_EQ(g->positionOf(1), 14);
}

TEST(Sixes, WithoutTheOptionASixPassesTheTurn) {
  Script s{{6, 2}};
  auto g = snl::makeGameWithRules(2, 30, kNoLinks, Rules{}, diceFor(s));
  g->takeTurn();
  EXPECT_EQ(g->currentPlayer(), 1);
}

TEST(Combined, BounceAndSixesWorkTogether) {
  Rules both;
  both.bounceBack = true;
  both.sixRerolls = true;
  Script s{{6, 6, 3}};
  auto g = snl::makeGameWithRules(2, 10, kNoLinks, both, diceFor(s));
  g->takeTurn();  // 6
  const Turn t = g->takeTurn();  // 12 bounces to 8, and the six still rolls again
  EXPECT_EQ(t.to, 8);
  EXPECT_EQ(g->currentPlayer(), 0);
  g->takeTurn();  // 8 + 3 = 11, bounces to 9
  EXPECT_EQ(g->positionOf(0), 9);
  EXPECT_EQ(g->currentPlayer(), 1);
}
