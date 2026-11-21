#pragma once
#include <memory>
#include <string>
#include <vector>

#include "booking_index.h"
#include "request.h"
#include "room_chooser.h"
#include "room_directory.h"

class SchedulerImpl : public rooms::SeriesScheduler {
 public:
  SchedulerImpl() : chooser_(std::make_unique<BestFitChooser>()) {}

  rooms::Status addRoom(const std::string& name, int capacity) override {
    if (name.empty() || name.size() > 32 || capacity < 1 || capacity > rooms::kMaxCapacity) return rooms::Status::InvalidInput;
    return directory_.add(name, capacity) ? rooms::Status::Ok : rooms::Status::DuplicateRoom;
  }

  rooms::Status book(const std::string& id, const std::string& room, int start, int end, int attendees) override {
    return bookRepeating(id, room, start, end, attendees, end - start, 1);
  }

  rooms::Status bookRepeating(const std::string& id, const std::string& room, int start, int end, int attendees,
                              int every, int count) override {
    BookingRequest request(id, {start, end}, attendees, every, count);
    if (!request.wellFormed()) return rooms::Status::InvalidInput;
    Room* target = directory_.find(room);
    if (target == nullptr) return rooms::Status::UnknownRoom;
    if (index_.contains(id)) return rooms::Status::DuplicateBooking;
    if (!target->fits(attendees)) return rooms::Status::TooManyPeople;
    if (!target->freeFor(request.occurrences())) return rooms::Status::Conflict;
    place(request, *target);
    return rooms::Status::Ok;
  }

  rooms::Status bookAny(const std::string& id, int start, int end, int attendees, std::string& room) override {
    BookingRequest request(id, {start, end}, attendees, end - start, 1);
    if (!request.wellFormed()) return rooms::Status::InvalidInput;
    if (index_.contains(id)) return rooms::Status::DuplicateBooking;
    if (!directory_.anyFits(attendees)) return rooms::Status::TooManyPeople;
    Room* chosen = chooser_->choose(directory_, attendees, request.occurrences());
    if (chosen == nullptr) return rooms::Status::NoRoomFree;
    place(request, *chosen);
    room = chosen->name();
    return rooms::Status::Ok;
  }

  rooms::Status cancel(const std::string& id) override {
    std::string name;
    if (!index_.roomOf(id, name)) return rooms::Status::UnknownBooking;
    directory_.find(name)->calendar().removeAll(id);
    index_.forget(id);
    return rooms::Status::Ok;
  }

  rooms::Status cancelOccurrence(const std::string& id, int index) override {
    std::string name;
    if (!index_.roomOf(id, name)) return rooms::Status::UnknownBooking;
    if (!directory_.find(name)->calendar().removeOccurrence(id, index)) return rooms::Status::UnknownBooking;
    index_.occurrenceRemoved(id);
    return rooms::Status::Ok;
  }

  bool isFree(const std::string& room, int start, int end) const override {
    const Room* target = directory_.find(room);
    if (target == nullptr || start < 0 || end <= start || end > rooms::kMaxTime) return false;
    return target->calendar().isFree({start, end});
  }

  std::vector<rooms::Booking> bookings(const std::string& room) const override {
    std::vector<rooms::Booking> out;
    const Room* target = directory_.find(room);
    if (target == nullptr) return out;
    for (const Slot& slot : target->calendar().slots()) out.push_back({slot.id, slot.span.start, slot.span.end, slot.attendees});
    return out;
  }

  rooms::Status roomOf(const std::string& id, std::string& room) const override {
    return index_.roomOf(id, room) ? rooms::Status::Ok : rooms::Status::UnknownBooking;
  }

 private:
  void place(const BookingRequest& request, Room& room) {
    int index = 0;
    for (const Span& span : request.occurrences()) room.calendar().add({span, request.id(), request.attendees(), index++});
    index_.record(request.id(), room.name(), index);
  }

  RoomDirectory directory_;
  BookingIndex index_;
  std::unique_ptr<RoomChooser> chooser_;
};
