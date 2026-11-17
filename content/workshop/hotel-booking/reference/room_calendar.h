#pragma once
#include <algorithm>
#include <map>

#include "stay_range.h"

// How many rooms of ONE type are taken on each night. Sparse: a night nobody booked has no entry. A stay is
// available only as far as its tightest night, so availability is the minimum over the nights.
class RoomCalendar {
 public:
  explicit RoomCalendar(int rooms) : rooms_(rooms) {}

  int freeFor(const StayRange& stay) const {
    int free = rooms_;
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) free = std::min(free, rooms_ - takenOn(night));
    return free;
  }

  // The caller has checked freeFor(stay) >= 1.
  void take(const StayRange& stay) {
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) ++taken_[night];
  }

  // Gives back exactly one room per night: other guests' rooms on the same nights stay taken.
  void give(const StayRange& stay) {
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) --taken_[night];
  }

 private:
  int takenOn(long long night) const {
    const auto it = taken_.find(night);
    return it == taken_.end() ? 0 : it->second;
  }

  int rooms_;
  std::map<long long, int> taken_;
};
