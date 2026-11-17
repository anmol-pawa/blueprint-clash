#pragma once
#include <cstdlib>
#include <functional>
#include <optional>
#include <vector>

#include "layout.h"

// Chooses seats for "pick the best for me". A Strategy: the rule is data about taste, and it will change.
class SeatSelector {
 public:
  virtual ~SeatSelector() = default;
  virtual std::optional<std::vector<int>> choose(const Layout& layout, const std::function<bool(int)>& isFree,
                                                 int count) const = 0;
};

// Closest row to the middle of the hall, then the run centred nearest the middle of the row, then lowest row, then
// lowest seat. Distances are doubled so that the half-seat cases need no floating point.
class CentreFirstSelector : public SeatSelector {
 public:
  std::optional<std::vector<int>> choose(const Layout& layout, const std::function<bool(int)>& isFree,
                                         int count) const override {
    std::optional<Candidate> best;
    for (int row = 0; row < layout.rows(); ++row) {
      for (int first = 0; first + count <= layout.seatsPerRow(); ++first) {
        if (!runIsFree(layout, isFree, row, first, count)) continue;
        const Candidate candidate{std::abs(2 * row - (layout.rows() - 1)),
                                  std::abs(2 * first + (count - 1) - (layout.seatsPerRow() - 1)), row, first};
        if (!best.has_value() || better(candidate, *best)) best = candidate;
      }
    }
    if (!best.has_value()) return std::nullopt;
    std::vector<int> seats;
    for (int i = 0; i < count; ++i) seats.push_back(layout.indexOf(best->row, best->first + i));
    return seats;
  }

 private:
  struct Candidate {
    int rowDistance;
    int centreDistance;
    int row;
    int first;
  };

  // The house rule as one lexicographic order: row distance, centre distance, row, first seat.
  static bool better(const Candidate& a, const Candidate& b) {
    if (a.rowDistance != b.rowDistance) return a.rowDistance < b.rowDistance;
    if (a.centreDistance != b.centreDistance) return a.centreDistance < b.centreDistance;
    if (a.row != b.row) return a.row < b.row;
    return a.first < b.first;
  }

  static bool runIsFree(const Layout& layout, const std::function<bool(int)>& isFree, int row, int first, int count) {
    for (int i = 0; i < count; ++i) {
      if (!isFree(layout.indexOf(row, first + i))) return false;
    }
    return true;
  }
};
