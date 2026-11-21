#include <iterator>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

// A half-open stretch of minutes [start, end): plain data.
struct Span {
  int start = 0;
  int end = 0;
};

// Two spans clash when each starts before the other ends, so one that ends at 60 and one that starts at 60 do not.
inline bool overlaps(const Span& a, const Span& b) { return a.start < b.end && b.start < a.end; }

// One request to book: a first meeting plus how often it repeats. A single booking is a series of one.
class BookingRequest {
 public:
  BookingRequest(std::string id, Span first, int attendees, int every, int count)
      : id_(std::move(id)), first_(first), attendees_(attendees), every_(every), count_(count) {}

  const std::string& id() const { return id_; }
  int attendees() const { return attendees_; }

  bool wellFormed() const {
    if (id_.empty() || id_.size() > 32 || attendees_ < 1) return false;
    if (first_.start < 0 || first_.end <= first_.start) return false;
    if (count_ < 1 || count_ > rooms::kMaxCount) return false;
    if (every_ < first_.end - first_.start || every_ > rooms::kMaxTime) return false;
    return lastEnd() <= rooms::kMaxTime;
  }

  std::vector<Span> occurrences() const {
    std::vector<Span> spans;
    for (int k = 0; k < count_; ++k) spans.push_back({first_.start + k * every_, first_.end + k * every_});
    return spans;
  }

 private:
  long long lastEnd() const { return static_cast<long long>(first_.end) + static_cast<long long>(count_ - 1) * every_; }

  std::string id_;
  Span first_;
  int attendees_;
  int every_;
  int count_;
};

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

// A named room with a number of seats and its own calendar.
class Room {
 public:
  Room(std::string name, int capacity) : name_(std::move(name)), capacity_(capacity) {}

  const std::string& name() const { return name_; }
  int capacity() const { return capacity_; }
  Calendar& calendar() { return calendar_; }
  const Calendar& calendar() const { return calendar_; }

  bool fits(int attendees) const { return attendees <= capacity_; }
  bool freeFor(const std::vector<Span>& spans) const { return calendar_.allFree(spans); }

 private:
  std::string name_;
  int capacity_;
  Calendar calendar_;
};

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
    if (index_.contains(id)) return rooms::Status::DuplicateBooking;
    Room* target = directory_.find(room);
    if (target == nullptr) return rooms::Status::UnknownRoom;
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

std::unique_ptr<rooms::Scheduler> rooms::makeScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<rooms::FindingScheduler> rooms::makeFindingScheduler() { return std::make_unique<SchedulerImpl>(); }

std::unique_ptr<rooms::SeriesScheduler> rooms::makeSeriesScheduler() { return std::make_unique<SchedulerImpl>(); }
