#pragma once
#include <cstddef>
#include <vector>

// Whose turn it is. It owns the rotation, the players who have left, and the run of sixes.
class TurnOrder {
 public:
  TurnOrder(int players, bool sixRerolls)
      : active_(static_cast<std::size_t>(players), true), remaining_(players), sixRerolls_(sixRerolls) {}

  int current() const { return current_; }
  int activeCount() const { return remaining_; }
  bool isActive(int player) const { return player >= 0 && player < size() && active_[player]; }

  // The one player still in, once everyone else has left.
  int firstActive() const {
    for (int p = 0; p < size(); ++p) {
      if (active_[p]) return p;
    }
    return -1;
  }

  // Count this roll in the current run of sixes. True if it is the third six in a row, which is not played.
  bool forfeits(int roll) {
    sixes_ = (sixRerolls_ && roll == kSix) ? sixes_ + 1 : 0;
    return sixes_ >= kSixesToForfeit;
  }

  // End of a roll: a six keeps the turn (unless the run is now forfeited), anything else passes it on.
  void settle(int roll) {
    if (sixRerolls_ && roll == kSix && sixes_ < kSixesToForfeit) return;
    passOn();
  }

  void leave(int player) {
    active_[player] = false;
    --remaining_;
    if (player == current_) passOn();
  }

 private:
  static constexpr int kSix = 6;
  static constexpr int kSixesToForfeit = 3;

  int size() const { return static_cast<int>(active_.size()); }

  void passOn() {
    sixes_ = 0;
    if (remaining_ == 0) return;
    do {
      current_ = (current_ + 1) % size();
    } while (!active_[current_]);
  }

  std::vector<bool> active_;
  int remaining_;
  bool sixRerolls_;
  int current_ = 0;
  int sixes_ = 0;
};
