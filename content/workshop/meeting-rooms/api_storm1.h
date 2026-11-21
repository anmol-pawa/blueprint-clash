#pragma once
// Change Storm 1: let the system pick the room.
#include "api.h"

namespace rooms {

// makeFindingScheduler() has everything makeScheduler() has, plus bookAny: the caller names no room and the scheduler
// chooses one.
//
// bookAny(id, start, end, attendees, room) books the SMALLEST room that is big enough (capacity >= attendees) and free
// during the span; among equally small rooms the one that was added first. On Ok `room` is the chosen room's name; on any
// other status `room` is left untouched. CHECK ORDER: InvalidInput (the same rules as book), DuplicateBooking,
// TooManyPeople (no room at all has the capacity, including when there are no rooms), NoRoomFree (big enough rooms exist
// but all are taken somewhere in the span). A refused call changes nothing.
// A booking made by bookAny is an ordinary booking: cancel, roomOf, bookings and isFree treat it like any other.
class FindingScheduler : public Scheduler {
 public:
  virtual Status bookAny(const std::string& id, int start, int end, int attendees, std::string& room) = 0;
};

std::unique_ptr<FindingScheduler> makeFindingScheduler();

}  // namespace rooms
