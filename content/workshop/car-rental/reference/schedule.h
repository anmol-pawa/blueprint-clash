#pragma once
#include <algorithm>
#include <map>
#include <string>
#include <utility>
#include <vector>

#include "time_span.h"

// The promises made, per category: which hours each reservation holds a car. It answers one question, "how many cars
// are committed at the busiest hour of this span", and knows nothing about which physical car is which.
class Schedule {
 public:
  void add(rental::ReservationId id, const std::string& category, const TimeSpan& span) {
    entries_[id] = Entry{category, span};
  }
  void remove(rental::ReservationId id) { entries_.erase(id); }

  // A car came back early: the hours after `hour` are free again.
  void endEarly(rental::ReservationId id, long long hour) {
    const auto it = entries_.find(id);
    if (it == entries_.end()) return;
    it->second.span = it->second.span.endedAt(hour);
    if (it->second.span.isEmpty()) entries_.erase(it);
  }

  // The most reservations of the category that hold a car at the same hour inside `span`.
  int peak(const std::string& category, const TimeSpan& span) const {
    std::vector<std::pair<long long, int>> changes;  // +1 where a hold starts, -1 where it ends
    int holding = 0;
    for (const auto& [id, entry] : entries_) {
      if (entry.category != category || !entry.span.overlaps(span)) continue;
      const long long start = std::max(entry.span.from(), span.from());
      const long long end = std::min(entry.span.to(), span.to());
      if (start == span.from()) ++holding;
      else changes.emplace_back(start, +1);
      if (end < span.to()) changes.emplace_back(end, -1);
    }
    std::sort(changes.begin(), changes.end());  // at the same hour a -1 sorts before a +1: the car is back first
    int busiest = holding;
    for (const auto& change : changes) {
      holding += change.second;
      busiest = std::max(busiest, holding);
    }
    return busiest;
  }

 private:
  struct Entry {
    std::string category;
    TimeSpan span{0, 0};
  };
  std::map<rental::ReservationId, Entry> entries_;
};
