import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-board", text: "Knows the grid: its size, what each cell holds, and which coordinates are on it", phase: "base", owners: ["Board", "Grid", "BoardState"] },
  { id: "res-line", text: "Decides whether a move completes a winning line, in one place", phase: "base", owners: ["LineWinRule", "WinRule", "WinChecker", "LineChecker", "WinDetector"] },
  { id: "res-turn", text: "Knows whose turn it is and who moves next", phase: "base", owners: ["Players", "TurnOrder", "PlayerQueue", "TurnTracker"] },
  { id: "res-facade", text: "Exposes the public operations and sequences validate, place, judge and pass the turn", phase: "base", owners: ["GameImpl", "TicTacToe", "GameEngine", "GameSession", "MatchImpl"] },
  { id: "res-config", text: "Owns the board size and the winning length, and validates them, so no rule is written against 3", phase: "storm1", owners: ["GameConfig", "GameSettings", "Rules", "BoardConfig"] },
  { id: "res-history", text: "Remembers the successful moves in order so the last one can be taken back", phase: "storm2", owners: ["MoveHistory", "History", "MoveLog", "UndoStack"] },
];
