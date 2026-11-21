#pragma once
#include <vector>

#include "room_directory.h"

// Strategy: which free room should get a booking that names none?
class RoomChooser {
 public:
  virtual ~RoomChooser() = default;
  // Returns nullptr when no room fits and is free for every span.
  virtual Room* choose(const RoomDirectory& rooms, int attendees, const std::vector<Span>& spans) const = 0;
};

// The smallest room that is big enough; among equals the one added first.
class BestFitChooser : public RoomChooser {
 public:
  Room* choose(const RoomDirectory& rooms, int attendees, const std::vector<Span>& spans) const override {
    Room* best = nullptr;
    for (const auto& room : rooms.all()) {
      if (!room->fits(attendees) || !room->freeFor(spans)) continue;
      if (best == nullptr || room->capacity() < best->capacity()) best = room.get();
    }
    return best;
  }
};
