#pragma once
#include <memory>
#include <utility>
#include <string>
#include <vector>

#include "room.h"

// All the rooms, in the order they were added, found by name.
class RoomDirectory {
 public:
  bool add(const std::string& name, int capacity) {
    if (find(name) != nullptr) return false;
    rooms_.push_back(std::make_unique<Room>(name, capacity));
    return true;
  }

  Room* find(const std::string& name) const {
    for (const auto& room : rooms_) {
      if (room->name() == name) return room.get();
    }
    return nullptr;
  }

  bool anyFits(int attendees) const {
    for (const auto& room : rooms_) {
      if (room->fits(attendees)) return true;
    }
    return false;
  }

  const std::vector<std::unique_ptr<Room>>& all() const { return rooms_; }

 private:
  std::vector<std::unique_ptr<Room>> rooms_;
};
