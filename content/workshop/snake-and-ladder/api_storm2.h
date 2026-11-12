#pragma once
// Change Storm 2 lets players leave. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace snl {

class ResignableGame : public Game {
 public:
  // The player leaves the game. Their piece stays where it is and is never moved again, and the turn order skips
  // them from now on. If it was their turn (including a bonus roll after a six), the turn passes to the next
  // player still in the game. When only one player is left in, that player wins at once.
  // Returns false and changes nothing if the game is over, the index is not a player, or the player already left.
  virtual bool resign(int player) = 0;
  // True while the player is still in the game; false once they resigned (or if there is no such player).
  virtual bool isActive(int player) const = 0;
};

// Same rules and the same nullptr cases as makeGameWithRules().
std::unique_ptr<ResignableGame> makeResignableGame(int players, int boardSize, std::vector<Link> links, Rules rules,
                                                   std::unique_ptr<Dice> dice);

}  // namespace snl
