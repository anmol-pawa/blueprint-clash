#pragma once
#include <cstddef>
#include <set>
#include <string>
#include <vector>

#include "api_storm2.h"

constexpr std::size_t kMaxPlayers = 6;
constexpr std::size_t kMaxNameLength = 16;

// Decides whether a table can be seated at all, before any game object exists.
class TableValidator {
 public:
  // May these players sit, and is the deck big enough for the first deal of a game that deals `opening` cards each?
  static bool valid(const std::vector<std::string>& players, const cards::Deck& deck, std::size_t opening) {
    if (players.empty() || players.size() > kMaxPlayers) return false;
    std::set<std::string> seen;
    for (const auto& name : players) {
      if (name.empty() || name.size() > kMaxNameLength) return false;
      if (!seen.insert(name).second) return false;
    }
    return deck.size() >= opening * (players.size() + 1);
  }
};
