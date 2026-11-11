#include <initializer_list>
#include <utility>

#include "api.h"
#include "bp_test.h"

using ttt::Outcome;
using ttt::Status;

namespace {
using Moves = std::initializer_list<std::pair<int, int>>;

void playAll(ttt::Game& g, Moves moves) {
  for (const auto& m : moves) g.play(m.first, m.second);
}

// X wins the top row; O has (1,0) and (1,1).
void xWinsTopRow(ttt::Game& g) { playAll(g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}}); }
}  // namespace

TEST(Turns, XStartsAndPlayersAlternate) {
  auto g = ttt::makeGame();
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->play(0, 0), Status::Ok);
  EXPECT_EQ(g->nextPlayer(), 'O');
  EXPECT_EQ(g->play(1, 1), Status::Ok);
  EXPECT_EQ(g->nextPlayer(), 'X');
}

TEST(Turns, MarksAreRecordedPerPlayer) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {1, 1}, {2, 2}});
  EXPECT_EQ(g->cellAt(0, 0), 'X');
  EXPECT_EQ(g->cellAt(1, 1), 'O');
  EXPECT_EQ(g->cellAt(2, 2), 'X');
  EXPECT_EQ(g->cellAt(0, 1), '.');
}

TEST(Board, StartsEmptyAndInProgress) {
  auto g = ttt::makeGame();
  for (int r = 0; r < 3; ++r)
    for (int c = 0; c < 3; ++c) EXPECT_EQ(g->cellAt(r, c), '.');
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
  EXPECT_EQ(g->winner(), '\0');
  EXPECT_EQ(g->movesPlayed(), 0);
}

TEST(Board, CellAtOffTheBoardIsNul) {
  auto g = ttt::makeGame();
  EXPECT_EQ(g->cellAt(-1, 0), '\0');
  EXPECT_EQ(g->cellAt(0, -1), '\0');
  EXPECT_EQ(g->cellAt(3, 0), '\0');
  EXPECT_EQ(g->cellAt(0, 3), '\0');
}

TEST(Board, GamesAreIndependent) {
  auto a = ttt::makeGame();
  auto b = ttt::makeGame();
  a->play(1, 1);
  EXPECT_EQ(b->cellAt(1, 1), '.');
  EXPECT_EQ(b->nextPlayer(), 'X');
}

TEST(Moves, MovesPlayedCountsSuccessfulMovesOnly) {
  auto g = ttt::makeGame();
  g->play(0, 0);
  g->play(0, 0);
  g->play(5, 5);
  g->play(1, 1);
  EXPECT_EQ(g->movesPlayed(), 2);
}

TEST(Winning, RowWin) {
  auto g = ttt::makeGame();
  xWinsTopRow(*g);
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Winning, ColumnWin) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 2}, {0, 0}, {1, 2}, {0, 1}, {2, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Winning, MainDiagonalWin) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {0, 1}, {1, 1}, {0, 2}, {2, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Winning, AntiDiagonalWin) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 2}, {0, 0}, {1, 1}, {0, 1}, {2, 0}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Winning, SecondPlayerCanWin) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {2, 2}, {1, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'O');
}

TEST(Winning, TwoInARowIsNotEnough) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}});
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
  EXPECT_EQ(g->winner(), '\0');
}

TEST(Winning, MixedMarksDoNotMakeALine) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {0, 1}, {0, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
}

TEST(Winning, NoNextPlayerAfterAWin) {
  auto g = ttt::makeGame();
  xWinsTopRow(*g);
  EXPECT_EQ(g->nextPlayer(), '\0');
}

TEST(Draws, FullBoardWithoutALineIsADraw) {
  auto g = ttt::makeGame();
  // X O X / X O O / O X X
  playAll(*g, {{0, 0}, {0, 1}, {0, 2}, {1, 1}, {1, 0}, {1, 2}, {2, 1}, {2, 0}, {2, 2}});
  EXPECT_EQ(g->movesPlayed(), 9);
  EXPECT_TRUE(g->outcome() == Outcome::Draw);
  EXPECT_EQ(g->winner(), '\0');
  EXPECT_EQ(g->nextPlayer(), '\0');
}

TEST(Draws, NotADrawBeforeTheBoardIsFull) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {0, 1}, {0, 2}, {1, 1}, {1, 0}, {1, 2}, {2, 1}, {2, 0}});
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
}

TEST(Draws, WinningOnTheLastCellIsAWinNotADraw) {
  auto g = ttt::makeGame();
  // X O X / X O O / X X O: X completes column 0 with the ninth move.
  playAll(*g, {{0, 0}, {0, 1}, {0, 2}, {1, 1}, {1, 0}, {1, 2}, {2, 1}, {2, 2}, {2, 0}});
  EXPECT_EQ(g->movesPlayed(), 9);
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Refusals, OutOfBoundsChangesNothing) {
  auto g = ttt::makeGame();
  EXPECT_EQ(g->play(-1, 0), Status::OutOfBounds);
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->play(0, -1), Status::OutOfBounds);
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->play(3, 0), Status::OutOfBounds);
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->play(0, 3), Status::OutOfBounds);
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->movesPlayed(), 0);
}

TEST(Refusals, TakenCellKeepsTheTurn) {
  auto g = ttt::makeGame();
  g->play(1, 1);
  EXPECT_EQ(g->play(1, 1), Status::CellTaken);
  EXPECT_EQ(g->nextPlayer(), 'O');
  EXPECT_EQ(g->cellAt(1, 1), 'X');
  EXPECT_EQ(g->movesPlayed(), 1);
  EXPECT_EQ(g->play(0, 0), Status::Ok);
  EXPECT_EQ(g->cellAt(0, 0), 'O');
}

TEST(Refusals, PlayingYourOwnCellIsAlsoTaken) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {1, 1}});
  EXPECT_EQ(g->play(0, 0), Status::CellTaken);
  EXPECT_EQ(g->nextPlayer(), 'X');
}

TEST(GameOver, PlayAfterAWinIsRefused) {
  auto g = ttt::makeGame();
  xWinsTopRow(*g);
  EXPECT_EQ(g->play(2, 2), Status::GameOver);
  EXPECT_EQ(g->cellAt(2, 2), '.');
  EXPECT_EQ(g->movesPlayed(), 5);
  EXPECT_EQ(g->winner(), 'X');
  EXPECT_TRUE(g->outcome() == Outcome::Won);
}

TEST(GameOver, GameOverBeatsOtherRefusals) {
  auto g = ttt::makeGame();
  xWinsTopRow(*g);
  EXPECT_EQ(g->play(9, 9), Status::GameOver);
  EXPECT_EQ(g->play(0, 0), Status::GameOver);
}

TEST(GameOver, PlayAfterADrawIsRefused) {
  auto g = ttt::makeGame();
  playAll(*g, {{0, 0}, {0, 1}, {0, 2}, {1, 1}, {1, 0}, {1, 2}, {2, 1}, {2, 0}, {2, 2}});
  EXPECT_EQ(g->play(0, 0), Status::GameOver);
  EXPECT_TRUE(g->outcome() == Outcome::Draw);
}
