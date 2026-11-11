#include <initializer_list>
#include <utility>

#include "api_storm1.h"
#include "bp_test.h"

using ttt::Outcome;
using ttt::Status;

namespace {
using Moves = std::initializer_list<std::pair<int, int>>;

void playAll(ttt::Game& g, Moves moves) {
  for (const auto& m : moves) g.play(m.first, m.second);
}
}  // namespace

TEST(Config, BadConfigurationsAreRejected) {
  EXPECT_TRUE(ttt::makeConfigurableGame(0, 3, 3) == nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(3, 0, 3) == nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(3, 3, 0) == nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(-1, 3, 3) == nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(3, 3, 4) == nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(2, 5, 6) == nullptr);
}

TEST(Config, LineLongerThanOneSideButFittingTheOtherIsAccepted) {
  auto g = ttt::makeConfigurableGame(1, 5, 5);
  EXPECT_TRUE(g != nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(2, 5, 5) != nullptr);
  EXPECT_TRUE(ttt::makeConfigurableGame(4, 4, 1) != nullptr);
}

TEST(Config, AccessorsReportTheConfiguration) {
  auto g = ttt::makeConfigurableGame(6, 7, 4);
  EXPECT_EQ(g->rows(), 6);
  EXPECT_EQ(g->cols(), 7);
  EXPECT_EQ(g->winLength(), 4);
}

TEST(Config, RectangularBoardKeepsCellsApart) {
  auto g = ttt::makeConfigurableGame(2, 5, 3);
  EXPECT_EQ(g->play(1, 0), Status::Ok);
  EXPECT_EQ(g->play(0, 2), Status::Ok);
  EXPECT_EQ(g->cellAt(1, 0), 'X');
  EXPECT_EQ(g->cellAt(0, 2), 'O');
  EXPECT_EQ(g->cellAt(1, 4), '.');
}

TEST(Config, BoundsFollowTheConfiguredSize) {
  auto g = ttt::makeConfigurableGame(2, 5, 3);
  EXPECT_EQ(g->play(2, 0), Status::OutOfBounds);
  EXPECT_EQ(g->play(0, 5), Status::OutOfBounds);
  EXPECT_EQ(g->play(1, 4), Status::Ok);
  EXPECT_EQ(g->cellAt(2, 0), '\0');
  EXPECT_EQ(g->cellAt(0, 5), '\0');
}

TEST(Lines, FourInARowOnASevenBySixBoard) {
  auto g = ttt::makeConfigurableGame(6, 7, 4);
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}, {1, 2}, {0, 3}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
  EXPECT_EQ(g->play(5, 5), Status::GameOver);
}

TEST(Lines, ThreeIsNotEnoughForFour) {
  auto g = ttt::makeConfigurableGame(6, 7, 4);
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
}

TEST(Lines, ColumnWinWithLengthFour) {
  auto g = ttt::makeConfigurableGame(5, 5, 4);
  playAll(*g, {{0, 0}, {0, 1}, {1, 0}, {1, 1}, {2, 0}, {2, 1}, {3, 0}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Lines, DiagonalOnARectangularBoard) {
  auto g = ttt::makeConfigurableGame(4, 6, 4);
  playAll(*g, {{0, 1}, {0, 0}, {1, 2}, {0, 3}, {2, 3}, {1, 0}, {3, 4}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Lines, AntiDiagonalOnARectangularBoard) {
  auto g = ttt::makeConfigurableGame(4, 6, 4);
  playAll(*g, {{0, 4}, {0, 0}, {1, 3}, {1, 0}, {2, 2}, {2, 0}, {3, 1}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Lines, JoiningTwoRunsStillWins) {
  auto g = ttt::makeConfigurableGame(3, 5, 3);
  // X holds (0,0) (0,1) and (0,3) (0,4); filling (0,2) makes a run of five.
  playAll(*g, {{0, 0}, {2, 0}, {0, 1}, {2, 2}, {0, 3}, {2, 4}, {0, 4}, {1, 2}, {0, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Lines, LengthOneWinsOnTheFirstMove) {
  auto g = ttt::makeConfigurableGame(4, 4, 1);
  EXPECT_EQ(g->play(2, 2), Status::Ok);
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Lines, SecondPlayerWinsOnABiggerBoard) {
  auto g = ttt::makeConfigurableGame(4, 4, 4);
  playAll(*g, {{0, 0}, {3, 0}, {0, 1}, {3, 1}, {1, 3}, {3, 2}, {2, 2}, {3, 3}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'O');
}

TEST(Draws, DrawUsesTheConfiguredBoardSize) {
  auto g = ttt::makeConfigurableGame(1, 2, 2);
  playAll(*g, {{0, 0}, {0, 1}});
  EXPECT_TRUE(g->outcome() == Outcome::Draw);
  EXPECT_EQ(g->movesPlayed(), 2);
  EXPECT_EQ(g->play(0, 0), Status::GameOver);
}

TEST(Draws, BoardNotFullIsNotADrawEvenAfterNineMoves) {
  auto g = ttt::makeConfigurableGame(4, 4, 4);
  playAll(*g, {{0, 0}, {0, 1}, {0, 2}, {1, 0}, {1, 1}, {1, 2}, {2, 0}, {2, 1}, {2, 2}});
  EXPECT_EQ(g->movesPlayed(), 9);
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
}

TEST(Classic, ThreeByThreeConfigurationBehavesLikeTheClassicGame) {
  auto g = ttt::makeConfigurableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
  EXPECT_EQ(g->nextPlayer(), '\0');
}
