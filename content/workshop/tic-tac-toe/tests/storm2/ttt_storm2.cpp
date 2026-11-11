#include <initializer_list>
#include <utility>

#include "api_storm2.h"
#include "bp_test.h"

using ttt::Outcome;
using ttt::Status;

namespace {
using Moves = std::initializer_list<std::pair<int, int>>;

void playAll(ttt::Game& g, Moves moves) {
  for (const auto& m : moves) g.play(m.first, m.second);
}
}  // namespace

TEST(Undo, InvalidConfigurationsAreRejected) {
  EXPECT_TRUE(ttt::makeUndoableGame(3, 3, 4) == nullptr);
  EXPECT_TRUE(ttt::makeUndoableGame(0, 3, 3) == nullptr);
}

TEST(Undo, NothingToUndoReturnsFalse) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  EXPECT_FALSE(g->undo());
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->movesPlayed(), 0);
}

TEST(Undo, TakesBackTheLastMark) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {1, 1}});
  EXPECT_TRUE(g->undo());
  EXPECT_EQ(g->cellAt(1, 1), '.');
  EXPECT_EQ(g->cellAt(0, 0), 'X');
  EXPECT_EQ(g->movesPlayed(), 1);
}

TEST(Undo, GivesTheTurnBack) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {1, 1}, {2, 2}});
  EXPECT_EQ(g->nextPlayer(), 'O');
  EXPECT_TRUE(g->undo());
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_TRUE(g->undo());
  EXPECT_EQ(g->nextPlayer(), 'O');
}

TEST(Undo, CanUndoAllTheWayBack) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {1, 1}, {2, 2}});
  EXPECT_TRUE(g->undo());
  EXPECT_TRUE(g->undo());
  EXPECT_TRUE(g->undo());
  EXPECT_FALSE(g->undo());
  EXPECT_EQ(g->movesPlayed(), 0);
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->cellAt(0, 0), '.');
}

TEST(Undo, ReopensAWonGame) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_TRUE(g->undo());
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
  EXPECT_EQ(g->winner(), '\0');
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_EQ(g->play(2, 2), Status::Ok);
}

TEST(Undo, TheSameWinningMoveWinsAgain) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}});
  g->undo();
  EXPECT_EQ(g->play(0, 2), Status::Ok);
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_EQ(g->winner(), 'X');
}

TEST(Undo, ReopensADrawnGame) {
  auto g = ttt::makeUndoableGame(1, 2, 2);
  playAll(*g, {{0, 0}, {0, 1}});
  EXPECT_TRUE(g->outcome() == Outcome::Draw);
  EXPECT_TRUE(g->undo());
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
  EXPECT_EQ(g->nextPlayer(), 'O');
  EXPECT_EQ(g->play(0, 1), Status::Ok);
}

TEST(Undo, RefusedMovesAreNotRecorded) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  g->play(1, 1);
  EXPECT_EQ(g->play(1, 1), Status::CellTaken);
  EXPECT_EQ(g->play(7, 7), Status::OutOfBounds);
  EXPECT_TRUE(g->undo());
  EXPECT_EQ(g->cellAt(1, 1), '.');
  EXPECT_EQ(g->nextPlayer(), 'X');
  EXPECT_FALSE(g->undo());
}

TEST(Undo, PlayDifferentlyAfterUndo) {
  auto g = ttt::makeUndoableGame(3, 3, 3);
  playAll(*g, {{0, 0}, {0, 1}});
  g->undo();
  EXPECT_EQ(g->play(2, 2), Status::Ok);
  EXPECT_EQ(g->cellAt(2, 2), 'O');
  EXPECT_EQ(g->cellAt(0, 1), '.');
  EXPECT_EQ(g->movesPlayed(), 2);
}

TEST(Undo, WorksOnLargerBoards) {
  auto g = ttt::makeUndoableGame(6, 7, 4);
  playAll(*g, {{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0, 2}, {1, 2}, {0, 3}});
  EXPECT_TRUE(g->outcome() == Outcome::Won);
  EXPECT_TRUE(g->undo());
  EXPECT_TRUE(g->outcome() == Outcome::InProgress);
  EXPECT_EQ(g->cellAt(0, 3), '.');
  EXPECT_EQ(g->movesPlayed(), 6);
}
