#pragma once
#include <memory>
#include <vector>

#include "special_move.h"

enum class Rules { Basic, Full };

// The rules of one game: how each piece moves, plus the special moves that this variant has.
class RuleBook {
 public:
  explicit RuleBook(Rules rules) {
    if (rules == Rules::Full) {
      specials_.push_back(std::make_unique<CastlingRule>(pieces_));
      specials_.push_back(std::make_unique<EnPassantRule>(pieces_));
    }
  }

  const RuleTable& pieces() const { return pieces_; }
  const std::vector<std::unique_ptr<SpecialMove>>& specials() const { return specials_; }

 private:
  RuleTable pieces_;
  std::vector<std::unique_ptr<SpecialMove>> specials_;
};
