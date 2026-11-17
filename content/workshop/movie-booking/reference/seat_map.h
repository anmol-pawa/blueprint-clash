#pragma once
#include <algorithm>
#include <map>
#include <string>
#include <utility>
#include <vector>

#include "api.h"

// What one seat remembers: the hold that currently claims it (if any) and whether it is sold.
// A claim by a lapsed hold is stale; the cell does not know that, the ledger does.
struct SeatCell {
  booking::HoldId claimedBy = booking::kNoHold;
  bool booked = false;
};

// The seating plan of one show. It knows geometry (rows, positions) and nothing about time or customers.
class SeatMap {
 public:
  SeatMap(int rows, int seatsPerRow) : rows_(rows), seatsPerRow_(seatsPerRow), cells_(static_cast<size_t>(rows) * seatsPerRow) {}

  int rows() const { return rows_; }
  int seatsPerRow() const { return seatsPerRow_; }
  int size() const { return rows_ * seatsPerRow_; }
  bool contains(int seat) const { return seat >= 0 && seat < size(); }

  // Whether a request is well formed for this hall: not empty, no seat twice, every seat inside the hall.
  bool acceptsAll(const std::vector<int>& seats) const {
    if (seats.empty()) return false;
    std::vector<int> sorted = seats;
    std::sort(sorted.begin(), sorted.end());
    if (std::adjacent_find(sorted.begin(), sorted.end()) != sorted.end()) return false;
    return std::all_of(sorted.begin(), sorted.end(), [this](int seat) { return contains(seat); });
  }

  SeatCell& at(int seat) { return cells_[static_cast<size_t>(seat)]; }
  const SeatCell& at(int seat) const { return cells_[static_cast<size_t>(seat)]; }

 private:
  int rows_;
  int seatsPerRow_;
  std::vector<SeatCell> cells_;
};

// All the shows by name.
class ShowTable {
 public:
  bool add(const std::string& show, int rows, int seatsPerRow) {
    if (rows <= 0 || seatsPerRow <= 0 || shows_.count(show) != 0) return false;
    shows_.emplace(show, SeatMap(rows, seatsPerRow));
    return true;
  }

  SeatMap* find(const std::string& show) {
    const auto found = shows_.find(show);
    return found == shows_.end() ? nullptr : &found->second;
  }
  const SeatMap* find(const std::string& show) const {
    const auto found = shows_.find(show);
    return found == shows_.end() ? nullptr : &found->second;
  }

 private:
  std::map<std::string, SeatMap> shows_;
};
