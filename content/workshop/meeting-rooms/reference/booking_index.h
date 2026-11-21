#pragma once
#include <map>
#include <string>

// Which room holds each live booking, and how many of its occurrences are left.
class BookingIndex {
 public:
  bool contains(const std::string& id) const { return placements_.count(id) != 0; }

  void record(const std::string& id, const std::string& room, int occurrences) {
    placements_[id] = {room, occurrences};
  }

  bool roomOf(const std::string& id, std::string& room) const {
    auto it = placements_.find(id);
    if (it == placements_.end()) return false;
    room = it->second.room;
    return true;
  }

  // Forgets the booking entirely.
  void forget(const std::string& id) { placements_.erase(id); }

  // One occurrence is gone; the booking is forgotten with its last one.
  void occurrenceRemoved(const std::string& id) {
    auto it = placements_.find(id);
    if (it != placements_.end() && --it->second.remaining == 0) placements_.erase(it);
  }

 private:
  struct Placement {
    std::string room;
    int remaining = 0;
  };
  std::map<std::string, Placement> placements_;
};
