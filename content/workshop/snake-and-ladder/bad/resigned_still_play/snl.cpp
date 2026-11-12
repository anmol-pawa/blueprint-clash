// A player who left is flagged, but the rotation ignores the flag.
#include <memory>
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {
using namespace snl;

// One class does everything: positions, links, dice, turn order and the rules.
class Naive : public ResignableGame {
 public:
  Naive(int players, int size, const std::vector<Link>& links, Rules rules, std::unique_ptr<Dice> dice)
      : n_(players), size_(size), rules_(rules), dice_(std::move(dice)), pos_(players, 0), active_(players, true),
        remaining_(players), end_(size + 1, 0) {
    for (const auto& l : links) end_[l.from] = l.to;
  }

  Turn takeTurn() override {
    if (winner_ != -1) { return Turn{}; }
    Turn t;
    t.player = cur_;
    t.roll = dice_->roll();
    t.from = t.to = pos_[cur_];
    ++taken_;
    if (rules_.sixRerolls && t.roll == 6) {
      ++sixes_;
    } else {
      sixes_ = 0;
    }
    if (sixes_ < 3) {
      int target = t.from + t.roll;
      int landing = target;
      if (target > size_) landing = rules_.bounceBack ? 2 * size_ - target : t.from;
      t.jump = jumpAt(landing); t.to = endOf(landing);
      pos_[cur_] = t.to;
      if (t.to == size_) {
        winner_ = cur_;
        t.won = true;
      }
    }
    if (winner_ == -1) {
      const bool again = rules_.sixRerolls && t.roll == 6 && sixes_ < 3;
      if (sixes_ >= 3) sixes_ = 0;
      if (!again) advance();
    }
    return t;
  }

  int currentPlayer() const override { return winner_ != -1 ? -1 : cur_; }
  int positionOf(int p) const override { return p >= 0 && p < n_ ? pos_[p] : -1; }
  bool finished() const override { return winner_ != -1; }
  int winner() const override { return winner_; }
  int turnsTaken() const override { return taken_; }

  bool resign(int p) override {
    if (winner_ != -1 || p < 0 || p >= n_ || !active_[p]) return false;
    active_[p] = false;
    --remaining_;
    
    if (remaining_ == 1) {
      for (int i = 0; i < n_; ++i) {
        if (active_[i]) winner_ = i;
      }
    }
    return true;
  }

  bool isActive(int p) const override { return p >= 0 && p < n_ && active_[p]; }

 private:
  int endOf(int s) const { return end_[s] != 0 ? end_[s] : s; }
  Jump jumpAt(int s) const {
    if (endOf(s) == s) return Jump::None;
    return end_[s] > s ? Jump::Ladder : Jump::Snake;
  }
  void advance() { cur_ = (cur_ + 1) % n_; }

  int n_;
  int size_;
  Rules rules_;
  std::unique_ptr<Dice> dice_;
  std::vector<int> pos_;
  std::vector<bool> active_;
  int remaining_;
  std::vector<int> end_;
  int cur_ = 0;
  int sixes_ = 0;
  int taken_ = 0;
  int winner_ = -1;
};

bool linksOk(int size, const std::vector<Link>& links) {
  std::vector<bool> isFrom(size + 1, false);
  for (const auto& l : links) {
    if (l.from < 1 || l.from > size || l.to < 1 || l.to > size) return false;
    if (l.from == l.to || l.from == size || isFrom[l.from]) return false;
    isFrom[l.from] = true;
  }
  for (const auto& l : links) {
    if (isFrom[l.to]) return false;
  }
  return true;
}

bool rangeOk(int size, const std::vector<Link>& links) {
  for (const auto& l : links) {
    if (l.from < 1 || l.from > size || l.to < 1 || l.to > size || l.from == l.to) return false;
  }
  return true;
}

bool valid(int players, int size, const std::vector<Link>& links, Rules rules, const std::unique_ptr<Dice>& dice) {
  if (players < 2 || size < 2 || dice == nullptr) return false;
  if (!linksOk(size, links)) return false;
  return !(rules.bounceBack && size < 6);
}
}  // namespace

std::unique_ptr<snl::Game> snl::makeGame(int players, int size, std::vector<Link> links, std::unique_ptr<Dice> dice) {
  if (!valid(players, size, links, Rules{}, dice)) return nullptr;
  return std::make_unique<Naive>(players, size, links, Rules{}, std::move(dice));
}

std::unique_ptr<snl::Game> snl::makeGameWithRules(int players, int size, std::vector<Link> links, Rules rules,
                                                  std::unique_ptr<Dice> dice) {
  if (!valid(players, size, links, rules, dice)) return nullptr;
  return std::make_unique<Naive>(players, size, links, rules, std::move(dice));
}

std::unique_ptr<snl::ResignableGame> snl::makeResignableGame(int players, int size, std::vector<Link> links, Rules rules,
                                                             std::unique_ptr<Dice> dice) {
  if (!valid(players, size, links, rules, dice)) return nullptr;
  return std::make_unique<Naive>(players, size, links, rules, std::move(dice));
}
