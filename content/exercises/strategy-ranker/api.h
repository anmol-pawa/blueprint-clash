#pragma once
#include <string>

struct Player {
  std::string name;
  int score = 0;
  int games = 0;
};

// A ranking policy decides which of two players is listed first.
// It must be a strict weak ordering: before(a, a) is false, and if before(a, b) then !before(b, a).
// Players for whom neither is before the other are "tied".
class RankingPolicy {
 public:
  virtual ~RankingPolicy() = default;
  virtual bool before(const Player& a, const Player& b) const = 0;
};
