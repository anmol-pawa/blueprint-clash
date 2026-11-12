import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-board", text: "Knows the squares and the snakes and ladders, and where a stop on a square leads", phase: "base", owners: ["Board", "BoardLayout", "Squares", "Grid"] },
  { id: "res-turns", text: "Knows whose turn it is and who comes next", phase: "base", owners: ["TurnOrder", "Players", "PlayerQueue", "TurnTracker", "Rotation"] },
  { id: "res-facade", text: "Exposes the public operations and sequences roll, move, jump, win and pass the turn", phase: "base", owners: ["GameImpl", "SnakeAndLadder", "GameEngine", "GameSession", "Match"] },
  { id: "res-overshoot", text: "Decides where a roll past the last square leads, behind a seam the game does not branch on", phase: "storm1", owners: ["OvershootPolicy", "OvershootRule", "FinishRule", "EndRule", "BouncePolicy"] },
  { id: "res-sixes", text: "Owns the run of sixes: the bonus roll and the forfeit of the third six", phase: "storm1", owners: ["TurnOrder", "SixRule", "BonusRollRule", "TurnPolicy", "RollStreak"] },
  { id: "res-resign", text: "Removes a player from the rotation and decides when one is left", phase: "storm2", owners: ["TurnOrder", "Players", "Roster", "ActivePlayers", "PlayerQueue"] },
];
