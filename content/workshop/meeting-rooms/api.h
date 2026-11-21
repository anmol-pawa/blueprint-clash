#pragma once
// Public API for the Meeting Room Scheduler problem. The hidden tests only use what is declared here.
// You implement rooms::makeScheduler() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>
#include <vector>

namespace rooms {

enum class Status {
  Ok,
  InvalidInput,      // a name, id, time span, head count or repeat rule outside the documented range
  DuplicateRoom,     // a room with this name already exists
  UnknownRoom,       // no room with this name
  DuplicateBooking,  // a live booking already has this id
  UnknownBooking,    // no live booking (or occurrence) with this id
  TooManyPeople,     // the room (or every room) is smaller than the group
  Conflict,          // the room is already taken during part of the span
  NoRoomFree,        // (storm 1) a big enough room exists, but all of them are taken during the span
};

constexpr int kMaxTime = 1000000;   // minutes: every time is in 0..kMaxTime
constexpr int kMaxCapacity = 1000;  // seats per room, 1..kMaxCapacity
constexpr int kMaxCount = 52;       // (storm 2) occurrences in one repeating booking

struct Booking {
  std::string id;
  int start = 0;      // minutes, inclusive
  int end = 0;        // minutes, exclusive
  int attendees = 0;
};

// Meeting rooms booked by the minute. Times are whole minutes since time zero and every span is HALF-OPEN: [start, end).
// Two spans clash when each starts before the other ends, so a meeting that ends at 60 and one that starts at 60 share
// the room without a clash. Single-threaded and deterministic.
//
// addRoom(name, capacity): the name is 1 to 32 characters and capacity is 1..kMaxCapacity (InvalidInput), then
// DuplicateRoom. A new room has no bookings. Rooms are kept in the order they were added.
//
// book(id, room, start, end, attendees). CHECK ORDER: InvalidInput (id empty or longer than 32 characters, start < 0,
// end <= start, end > kMaxTime, attendees < 1), UnknownRoom, DuplicateBooking (a LIVE booking has this id; a cancelled
// booking's id is free again), TooManyPeople (attendees > the room's capacity: exactly the capacity is fine), Conflict.
// A refused call changes nothing.
//
// cancel(id): removes the booking, UnknownBooking when no live booking has the id. The room is free for that span at once.
// isFree(room, start, end): true when the span is valid (0 <= start < end <= kMaxTime), the room exists and no booking
// overlaps the span; false otherwise. It never changes anything.
// bookings(room): the room's bookings ordered by start time, empty for an unknown room.
// roomOf(id, room): UnknownBooking, or Ok with the name of the room the booking is in.
class Scheduler {
 public:
  virtual ~Scheduler() = default;
  virtual Status addRoom(const std::string& name, int capacity) = 0;
  virtual Status book(const std::string& id, const std::string& room, int start, int end, int attendees) = 0;
  virtual Status cancel(const std::string& id) = 0;
  virtual bool isFree(const std::string& room, int start, int end) const = 0;
  virtual std::vector<Booking> bookings(const std::string& room) const = 0;
  virtual Status roomOf(const std::string& id, std::string& room) const = 0;
};

std::unique_ptr<Scheduler> makeScheduler();

}  // namespace rooms
