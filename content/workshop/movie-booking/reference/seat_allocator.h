#pragma once
#include <functional>
#include <vector>

#include "seat_map.h"

// The house rule for choosing seats. It is a Strategy: "best" is a business decision that will change.
class SeatAllocator {
 public:
  virtual ~SeatAllocator() = default;
  // `isFree(seat)` says whether a seat can be claimed right now. Returns `count` seats, or an empty list.
  virtual std::vector<int> choose(const SeatMap& map, int count, const std::function<bool(int)>& isFree) const = 0;
};

// Lowest row first, then the lowest starting seat, using seats that sit next to each other in one row.
class FirstRunAllocator : public SeatAllocator {
 public:
  std::vector<int> choose(const SeatMap& map, int count, const std::function<bool(int)>& isFree) const override {
    for (int row = 0; row < map.rows(); ++row) {
      const int first = row * map.seatsPerRow();
      int runLength = 0;
      for (int seat = first; seat < first + map.seatsPerRow(); ++seat) {
        runLength = isFree(seat) ? runLength + 1 : 0;
        if (runLength == count) return run(seat - count + 1, count);
      }
    }
    return {};
  }

 private:
  static std::vector<int> run(int start, int count) {
    std::vector<int> seats;
    for (int i = 0; i < count; ++i) seats.push_back(start + i);
    return seats;
  }
};
