#pragma once
#include <iterator>
#include <map>
#include <string>
#include <vector>

#include "span.h"

// One occurrence of a booking inside a room's calendar.
struct Slot {
  Span span;
  std::string id;
  int attendees = 0;
  int index = 0;  // position in the original series
};

// The meetings in one room, keyed by start time. Slots never overlap, so the only two that can clash with a new span are
// its neighbours in start order.
class Calendar {
 public:
  bool isFree(const Span& span) const {
    auto next = slots_.lower_bound(span.start);
    if (next != slots_.end() && overlaps(next->second.span, span)) return false;
    if (next != slots_.begin() && overlaps(std::prev(next)->second.span, span)) return false;
    return true;
  }

  bool allFree(const std::vector<Span>& spans) const {
    for (const Span& s : spans) {
      if (!isFree(s)) return false;
    }
    return true;
  }

  void add(const Slot& slot) { slots_.emplace(slot.span.start, slot); }

  // Removes every occurrence of a booking; returns how many were removed.
  int removeAll(const std::string& id) {
    int removed = 0;
    for (auto it = slots_.begin(); it != slots_.end();) {
      if (it->second.id == id) {
        it = slots_.erase(it);
        ++removed;
      } else {
        ++it;
      }
    }
    return removed;
  }

  bool removeOccurrence(const std::string& id, int index) {
    for (auto it = slots_.begin(); it != slots_.end(); ++it) {
      if (it->second.id == id && it->second.index == index) {
        slots_.erase(it);
        return true;
      }
    }
    return false;
  }

  std::vector<Slot> slots() const {
    std::vector<Slot> out;
    for (const auto& entry : slots_) out.push_back(entry.second);
    return out;
  }

 private:
  std::map<int, Slot> slots_;
};
