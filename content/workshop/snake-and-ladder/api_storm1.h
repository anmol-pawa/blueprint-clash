#pragma once
// Change Storm 1 adds house rules. Everything from api.h still holds, and makeGame() keeps working as before.
// Only games made by makeGameWithRules() follow the options below.
#include "api.h"

namespace snl {

struct Rules {
  // Overshoot: instead of staying put, a roll past boardSize bounces back. The piece goes to the end and
  // counts the leftover squares backwards: it lands on boardSize - (position + roll - boardSize).
  // The square it bounces to is an ordinary landing, so a snake or ladder there still applies.
  bool bounceBack = false;
  // A six gives the same player another roll straight away (a game-winning six ends the game).
  // A third six in a row by the same player is not played: the player stays put, the turn passes to the
  // next player, and the count starts again. Any roll other than a six ends the run.
  bool sixRerolls = false;
};

// Returns nullptr in the cases makeGame() does, and also if bounceBack is set and boardSize < 6
// (a bounce could land below square 1).
std::unique_ptr<Game> makeGameWithRules(int players, int boardSize, std::vector<Link> links, Rules rules,
                                        std::unique_ptr<Dice> dice);

}  // namespace snl
