#pragma once

// What happens to a roll that would carry a piece past the last square. Strategy: the game asks for the
// landing square and never branches on which rule is in force.
class OvershootPolicy {
 public:
  virtual ~OvershootPolicy() = default;
  // The square the piece lands on (before any snake or ladder applies).
  virtual int landing(int from, int roll, int boardSize) const = 0;
};

class StayPolicy : public OvershootPolicy {
 public:
  int landing(int from, int roll, int boardSize) const override {
    const int target = from + roll;
    return target > boardSize ? from : target;
  }
};

class BouncePolicy : public OvershootPolicy {
 public:
  int landing(int from, int roll, int boardSize) const override {
    const int target = from + roll;
    return target > boardSize ? 2 * boardSize - target : target;
  }
};
