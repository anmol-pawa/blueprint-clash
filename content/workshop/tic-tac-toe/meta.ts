import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "tic-tac-toe",
  title: "Tic-tac-toe to Connect-N",
  level: "SDE2",
  parMinutes: 45,
  patterns: ["Strategy", "Memento"],
  requirements: [
    { id: "R-turns", text: "X moves first and players alternate. play(row, col) marks the cell for the player to move; cellAt() reads it ('.' when empty, '\\0' off the board) and movesPlayed() counts successful moves.", phase: "base", hidden: false },
    { id: "R-win", text: "Three of the same mark in a row, a column or either diagonal wins. Two in a row, or a line of mixed marks, does not. After a win nextPlayer() is '\\0' and winner() is the winning mark.", phase: "base", hidden: true },
    { id: "R-draw", text: "A full board with no winning line is a Draw. If the move that fills the last cell completes a line, it is a Win, not a Draw.", phase: "base", hidden: true },
    { id: "R-refusal", text: "A move off the board returns OutOfBounds and a move on an occupied cell returns CellTaken. Neither changes anything: the same player is still to move and movesPlayed() does not change.", phase: "base", hidden: true },
    { id: "R-over", text: "Once the game is won or drawn, every play() returns GameOver (checked before OutOfBounds and CellTaken) and changes nothing.", phase: "base", hidden: true },
    { id: "R-config", text: "Storm 1: makeConfigurableGame(rows, cols, winLength) builds a Connect-N style game on any board. It returns nullptr unless rows, cols and winLength are at least 1 and winLength fits on the longer side. A line of winLength or more of one mark in a row, column or diagonal wins, on any board shape, including a run formed by joining two shorter ones. A draw is a full board of the configured size.", phase: "storm1", hidden: true },
    { id: "R-undo", text: "Storm 2: undo() takes back the most recent successful play() and returns true; with nothing to take back it returns false and changes nothing. The mark is removed, the turn goes back to that player, and a finished game (won or drawn) is reopened. Refused moves are not recorded, so they are never undone.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "turn_on_refusal",
      failsPhase: "base",
      failingTests: ["Refusals.OutOfBoundsChangesNothing", "Refusals.TakenCellKeepsTheTurn", "Refusals.PlayingYourOwnCellIsAlsoTaken"],
      reason: "The turn is flipped in the shared tail of play() and again in each refusal branch, so an illegal move costs the player their turn. A move should validate everything first, mutate last, and only then pass the turn.",
    },
    {
      dir: "draw_beats_win",
      failsPhase: "base",
      failingTests: ["Draws.WinningOnTheLastCellIsAWinNotADraw"],
      reason: "The 'board is full' check comes before the 'does this move win' check, so the ninth move that completes a line is reported as a draw. The order of the two judgements is a rule, and it belongs next to a test that pins it.",
    },
    {
      dir: "anti_diagonal_missed",
      failsPhase: "base",
      failingTests: ["Winning.AntiDiagonalWin"],
      reason: "The win scan is a hand-written list of directions and one is missing. A scan written as 'the four line directions through the last move' in one small class is easy to review; this one hides the gap in an array literal.",
    },
    {
      dir: "swapped_stride",
      failsPhase: "storm1",
      failingTests: ["Config.RectangularBoardKeepsCellsApart", "Lines.AntiDiagonalOnARectangularBoard"],
      reason: "Cells are stored in a flat array and the index uses rows as the stride. Square boards hide the mistake (rows == cols), so the 3x3 game passes, and any other shape makes different cells alias each other. A Board class that owns the index formula in one place makes this a one-line review.",
    },
    {
      dir: "exact_run",
      failsPhase: "storm1",
      failingTests: ["Lines.JoiningTwoRunsStillWins"],
      reason: "The scan asks for a run of exactly winLength. On a 3x3 board a run longer than three is impossible, so nobody noticed; on larger boards one move can join two runs into a longer one, and the line must still count.",
    },
    {
      dir: "undo_keeps_turn",
      failsPhase: "storm2",
      failingTests: ["Undo.GivesTheTurnBack", "Undo.CanUndoAllTheWayBack", "Undo.ReopensAWonGame", "Undo.TheSameWinningMoveWinsAgain", "Undo.ReopensADrawnGame", "Undo.RefusedMovesAreNotRecorded", "Undo.PlayDifferentlyAfterUndo"],
      reason: "Undo clears the cell but the turn is a separate piece of state that nobody told. When the facade owns the sequence 'remove mark, rewind the turn, reopen the game' in one method, there is one place to keep in step with play().",
    },
    {
      dir: "undo_keeps_result",
      failsPhase: "storm2",
      failingTests: ["Undo.ReopensAWonGame", "Undo.TheSameWinningMoveWinsAgain", "Undo.ReopensADrawnGame", "Undo.WorksOnLargerBoards"],
      reason: "Undo restores the board and the turn but leaves the game flagged as finished, so a game that was won stays unplayable (and keeps its winner) after the winning move is taken back.",
    },
  ],
};
