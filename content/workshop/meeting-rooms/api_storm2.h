#pragma once
// Change Storm 2: repeating bookings.
#include "api_storm1.h"

namespace rooms {

// makeSeriesScheduler() has everything makeFindingScheduler() has, plus bookings that repeat.
//
// bookRepeating(id, room, start, end, attendees, every, count) books `count` meetings in one room: occurrence k covers
// [start + k * every, end + k * every) for k = 0 .. count - 1. CHECK ORDER: InvalidInput (the same rules as book, plus
// count outside 1..kMaxCount, every < end - start (the meetings would overlap each other), or the last occurrence ending
// after kMaxTime), UnknownRoom, DuplicateBooking, TooManyPeople, Conflict (ANY occurrence overlaps something).
// It is ALL OR NOTHING: when it is refused no occurrence is booked, and the booking never conflicts with itself.
//
// A repeating booking is ONE booking with one id: bookings(room) lists every remaining occurrence (each with that id,
// that occurrence's own start and end, and the head count) in start order, cancel(id) removes every remaining occurrence
// at once, roomOf(id) answers while any occurrence remains, and the id is taken until the last one is gone.
//
// cancelOccurrence(id, index) removes one occurrence, counted from 0 in the ORIGINAL series (indexes never shift).
// UnknownBooking when no live booking has the id or that occurrence is out of range or already removed. Removing the last
// remaining occurrence ends the booking and frees the id. A plain book() is a series of exactly one occurrence, index 0.
class SeriesScheduler : public FindingScheduler {
 public:
  virtual Status bookRepeating(const std::string& id, const std::string& room, int start, int end, int attendees,
                               int every, int count) = 0;
  virtual Status cancelOccurrence(const std::string& id, int index) = 0;
};

std::unique_ptr<SeriesScheduler> makeSeriesScheduler();

}  // namespace rooms
