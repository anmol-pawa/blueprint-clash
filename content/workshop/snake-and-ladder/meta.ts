import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "snake-and-ladder",
  title: "Snake and Ladder",
  level: "SDE2",
  parMinutes: 45,
  patterns: ["Strategy", "Dependency Injection"],
  requirements: [
    { id: "R-turns", text: "Everyone starts on square 0. Player 0 rolls first and the turn passes in index order, wrapping round. takeTurn() rolls the given Dice for the current player, moves the piece forward that many squares and returns a Turn describing it. Pieces may share a square.", phase: "base", hidden: false },
    { id: "R-links", text: "A player who stops on the start of a ladder (to > from) or a snake (to < from) is moved to its end, once; the Turn reports the Jump. Passing over the start of a link does nothing, and a link applies only to the player who stopped there.", phase: "base", hidden: true },
    { id: "R-finish", text: "The first player to land exactly on the last square wins, including by a ladder that ends there. A roll that would go past the last square is not played: the piece stays, the roll still counts as a turn, and the turn passes.", phase: "base", hidden: true },
    { id: "R-over", text: "Once someone has won, takeTurn() does nothing: it returns a Turn with player -1 and roll 0, does not roll the dice and does not count a turn.", phase: "base", hidden: true },
    { id: "R-setup", text: "makeGame() returns nullptr unless there are at least 2 players, the board has at least 2 squares, the dice is not null, and the links are valid: all squares on the board, from != to, no two links share a start, no link starts on the last square, and no link ends where another begins. A link may end on the last square.", phase: "base", hidden: true },
    { id: "R-bounce", text: "Storm 1: with Rules::bounceBack, a roll past the last square bounces: the piece lands on boardSize - (position + roll - boardSize), and a snake or ladder on that square applies. makeGameWithRules() refuses bounce on boards smaller than 6 squares.", phase: "storm1", hidden: true },
    { id: "R-sixes", text: "Storm 1: with Rules::sixRerolls, a six gives the same player another roll (a six that wins ends the game; a six blocked by the end or sent down a snake still gives the bonus roll). A third six in a row by one player is not played: the piece stays, the turn passes, and the count starts again. Any other roll ends the run, and each run belongs to one player.", phase: "storm1", hidden: true },
    { id: "R-resign", text: "Storm 2: resign(player) removes a player from the game: the piece stays where it is, the rotation skips them, and if it was their turn (even a bonus roll) the turn passes to the next active player with a fresh run of sixes. When one player is left they win at once. resign() returns false for a finished game, an unknown player or one who already left.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "overshoot_wins",
      failsPhase: "base",
      failingTests: ["Finish.OvershootingStaysPutAndPassesTheTurn"],
      reason: "A roll past the last square is clamped to it, so any big roll near the end wins. 'Exactly on the last square' is the whole difficulty of the endgame, and the clamp turns it into a coin toss for the player who happens to roll high.",
    },
    {
      dir: "snake_ignored",
      failsPhase: "base",
      failingTests: ["Links.ASnakeSlidesThePieceDown", "Links.ASnakeCanSendYouBackToSquareOne"],
      reason: "Links are stored as one map but applied under a hidden assumption that the destination is higher. The ladder test passes, which is why the direction of a link should be tested both ways, and why the board class should own the 'ladder or snake' judgement in one place.",
    },
    {
      dir: "rolls_after_win",
      failsPhase: "base",
      failingTests: ["Finish.NothingHappensAfterTheGameIsOver"],
      reason: "The finished-game guard returns an empty Turn but still rolls the dice and counts the turn. With a real random dice that quietly burns the sequence of a replayable game; with a scripted dice the test sees the consumed roll.",
    },
    {
      dir: "links_unchecked",
      failsPhase: "base",
      failingTests: ["Setup.TheLastSquareCannotStartALink", "Setup.TwoLinksCannotStartOnTheSameSquare", "Setup.ALinkCannotEndWhereAnotherBegins"],
      reason: "Links are only checked to be on the board. A snake to a ladder's foot builds a loop, and two links on one square make the second silently win. Validation belongs in one place that runs before the first turn.",
    },
    {
      dir: "bounce_off_by_one",
      failsPhase: "storm1",
      failingTests: ["Bounce.AnOvershootBouncesOffTheLastSquare", "Bounce.TheLeftoverCountsBackwards", "Bounce.TheBounceSquareCanHoldASnake"],
      reason: "The bounce arithmetic is typed inline and is one square short. Putting the formula in a small OvershootPolicy class gives it a name, a home and a single test target.",
    },
    {
      dir: "bounce_skips_links",
      failsPhase: "storm1",
      failingTests: ["Bounce.TheBounceSquareCanHoldASnake", "Bounce.TheBounceSquareCanHoldAWinningLadder"],
      reason: "The bounce branch computes the square but never asks the board what is on it, because the link lookup was written inside the 'normal' branch. In the reference the policy only decides the square and every landing goes through the same board lookup.",
    },
    {
      dir: "sixes_not_reset",
      failsPhase: "storm1",
      failingTests: ["Sixes.AnyOtherRollBreaksTheRun"],
      reason: "The counter is cleared on a forfeit but not when a different number is rolled, so sixes add up across turns and an innocent six is forfeited. 'Three in a row' is the rule; a counter without a reset rule is 'three in total'.",
    },
    {
      dir: "resigned_still_play",
      failsPhase: "storm2",
      failingTests: ["Resign.LeavingOnYourTurnPassesTheTurn", "Resign.TheTurnOrderSkipsPlayersWhoLeft", "Resign.TheLastIndexWrapsRoundToTheFirst", "Resign.LeavingDuringABonusRollPassesTheTurn"],
      reason: "A flag marks the player as gone but the rotation is a plain modulo that never looks at it. The turn order must be the one object that knows who is still in, so skipping is not repeated at call sites.",
    },
    {
      dir: "last_player_no_win",
      failsPhase: "storm2",
      failingTests: ["Resign.AGameWithOnePlayerLeftIsWon", "Resign.ThreePlayersNeedTwoDepartures", "Resign.NothingHappensAfterTheGameIsWonByDefault"],
      reason: "Leaving never ends the game, so the last player is left rolling alone until they reach the end. 'One player left' is a win condition that belongs to the same place as 'someone reached the last square'.",
    },
    {
      dir: "resign_keeps_run",
      failsPhase: "storm2",
      failingTests: ["Resign.TheNextPlayerStartsWithAFreshRunOfSixes"],
      reason: "The run of sixes is global state that is cleared when a turn passes in takeTurn() but not when resign() passes it. Two code paths that pass the turn must share one method.",
    },
  ],
};
