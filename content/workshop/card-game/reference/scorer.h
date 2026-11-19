#pragma once
#include "hand.h"

constexpr int kBlackjackTarget = 21;
constexpr int kAceBonus = 10;  // an Ace counts 1, or 11 when that does not pass the target
constexpr int kFacePoints = 10;
constexpr int kModTen = 10;

struct Score {
  int total;
  bool soft;  // an Ace is counted as 11
};

// What a hand is worth (Strategy): every game scores its own way, and the round skeleton never looks at a card.
class Scorer {
 public:
  virtual ~Scorer() = default;
  virtual Score score(const Hand& hand) const = 0;
};

class BlackjackScorer : public Scorer {
 public:
  Score score(const Hand& hand) const override {
    int sum = 0;
    bool hasAce = false;
    for (const auto& card : hand.cards()) {
      sum += card.rank >= cards::kJack ? kFacePoints : card.rank;
      hasAce = hasAce || card.rank == cards::kAce;
    }
    if (hasAce && sum + kAceBonus <= kBlackjackTarget) return Score{sum + kAceBonus, true};
    return Score{sum, false};
  }
};

// Ace 1, 2..9 their rank, ten and the faces 0, summed modulo ten.
class ModTenScorer : public Scorer {
 public:
  Score score(const Hand& hand) const override {
    int sum = 0;
    for (const auto& card : hand.cards()) sum += card.rank >= kModTen ? 0 : card.rank;
    return Score{sum % kModTen, false};
  }
};
