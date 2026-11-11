import type { ClarifyQuestion } from "@/lib/workshop/types";

export const clarify: ClarifyQuestion[] = [
  { id: "q-lines", text: "What counts as three in a row: rows, columns, both diagonals?", answer: "All of them: any row, any column and both diagonals. Two in a row is not enough, and the line must be all one player's mark.", reveals: ["R-win"], quality: "essential" },
  { id: "q-draw", text: "When is the game a draw, and what if the last cell completes a line?", answer: "A draw is a full board with no winning line. If the move that fills the last cell also completes a line, that player wins; it is not a draw.", reveals: ["R-draw"], quality: "essential" },
  { id: "q-refusal", text: "What happens on an illegal move (off the board, or a cell already taken)? Does the turn pass?", answer: "OutOfBounds or CellTaken, nothing changes and the same player is still to move.", reveals: ["R-refusal"], quality: "essential" },
  { id: "q-after", text: "What if someone plays after the game has ended?", answer: "GameOver, whatever the cell, even one that is off the board. Nothing changes, and nextPlayer() is '\\0'.", reveals: ["R-over"], quality: "essential" },
  { id: "q-future", text: "Will the board always be 3x3 with three in a row? Do the rules or the number of players change?", answer: "Good question. Product wants a Connect-N family (bigger boards, longer lines) soon, and a way to take moves back. Details arrive with the change.", reveals: ["R-config", "R-undo"], quality: "essential" },
  { id: "q-cell", text: "How does the caller read the board, and what does cellAt() return off the board?", answer: "cellAt() returns 'X', 'O' or '.' for an empty cell, and '\\0' off the board.", reveals: [], quality: "useful" },
  { id: "q-start", text: "Who starts, and can that be chosen?", answer: "X always starts. Not configurable.", reveals: [], quality: "useful" },
  { id: "q-count", text: "Does movesPlayed() count refused moves?", answer: "No, only successful ones.", reveals: [], quality: "useful" },
  { id: "q-ai", text: "Should there be a computer opponent?", answer: "Not now. The engine only validates and records moves. A bot would sit on top of the same interface.", reveals: [], quality: "useful" },
  { id: "q-ui", text: "Is there a screen, animation or sound to design?", answer: "No UI. Only the interface in api.h is tested.", reveals: [], quality: "noise" },
  { id: "q-net", text: "Is it played over a network, and do we need accounts or ratings?", answer: "No. In memory, one process, no accounts.", reveals: [], quality: "noise" },
];
