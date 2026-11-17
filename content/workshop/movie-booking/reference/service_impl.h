#pragma once
#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "hold_ledger.h"
#include "seat_allocator.h"
#include "seat_map.h"

// The public face. It sequences the collaborators: the seat maps hold geometry and claims, the ledger decides what
// is live from the clock, the allocator picks seats for holdBest. It holds no rule of its own about time.
namespace detail {
inline booking::HoldResult refused(booking::Status why) { return {why, booking::kNoHold}; }
}  // namespace detail

class ServiceImpl : public booking::SeatingService {
 public:
  ServiceImpl(std::shared_ptr<booking::Clock> clock, long long holdTicks)
      : ledger_(std::move(clock), holdTicks), allocator_(std::make_unique<FirstRunAllocator>()) {}

  bool addShow(const std::string& show, int rows, int seatsPerRow) override { return shows_.add(show, rows, seatsPerRow); }

  booking::HoldResult hold(const std::string& show, const std::string& user, const std::vector<int>& seats) override {
    SeatMap* map = shows_.find(show);
    if (map == nullptr) return detail::refused(booking::Status::UnknownShow);
    if (!map->acceptsAll(seats)) return detail::refused(booking::Status::BadSeat);
    if (seats.size() > static_cast<size_t>(booking::kMaxSeatsPerHold)) return detail::refused(booking::Status::TooManySeats);
    if (!std::all_of(seats.begin(), seats.end(), [&](int seat) { return ledger_.isFree(map->at(seat)); })) return detail::refused(booking::Status::SeatTaken);
    return place(*map, show, user, seats);
  }

  booking::Status confirm(booking::HoldId id, const std::string& user) override {
    HoldRecord* hold = nullptr;
    const booking::Status check = checkOwnLiveHold(id, user, hold);
    if (check != booking::Status::Ok) return check;
    SeatMap& map = *shows_.find(hold->show);
    for (const int seat : hold->seats) {
      map.at(seat).booked = true;
      map.at(seat).claimedBy = booking::kNoHold;
    }
    hold->spent = true;
    return booking::Status::Ok;
  }

  booking::Status release(booking::HoldId id, const std::string& user) override {
    HoldRecord* hold = nullptr;
    const booking::Status check = checkOwnLiveHold(id, user, hold);
    if (check != booking::Status::Ok) return check;
    SeatMap& map = *shows_.find(hold->show);
    for (const int seat : hold->seats) map.at(seat).claimedBy = booking::kNoHold;
    hold->spent = true;
    return booking::Status::Ok;
  }

  booking::SeatState seatState(const std::string& show, int seat) const override {
    const SeatMap* map = shows_.find(show);
    if (map == nullptr || !map->contains(seat)) return booking::SeatState::Missing;
    const SeatCell& cell = map->at(seat);
    if (cell.booked) return booking::SeatState::Booked;
    return ledger_.isLive(cell.claimedBy) ? booking::SeatState::Held : booking::SeatState::Free;
  }

  int freeSeats(const std::string& show) const override {
    const SeatMap* map = shows_.find(show);
    if (map == nullptr) return 0;
    int free = 0;
    for (int seat = 0; seat < map->size(); ++seat) free += ledger_.isFree(map->at(seat)) ? 1 : 0;
    return free;
  }

  booking::ExtendResult extend(booking::HoldId id, const std::string& user) override {
    HoldRecord* hold = ledger_.find(id);
    if (hold == nullptr || hold->spent) return booking::ExtendResult::UnknownHold;
    if (hold->user != user) return booking::ExtendResult::NotOwner;
    if (ledger_.lapsed(*hold)) return booking::ExtendResult::Expired;
    if (hold->extended) return booking::ExtendResult::AlreadyExtended;
    ledger_.extend(*hold);
    return booking::ExtendResult::Ok;
  }

  booking::HoldResult holdBest(const std::string& show, const std::string& user, int count) override {
    SeatMap* map = shows_.find(show);
    if (map == nullptr) return detail::refused(booking::Status::UnknownShow);
    if (count < 1) return detail::refused(booking::Status::BadSeat);
    if (count > booking::kMaxSeatsPerHold) return detail::refused(booking::Status::TooManySeats);
    const std::vector<int> seats = allocator_->choose(*map, count, [&](int seat) { return ledger_.isFree(map->at(seat)); });
    if (seats.empty()) return detail::refused(booking::Status::SeatTaken);
    return place(*map, show, user, seats);
  }

  std::vector<int> seatsOf(booking::HoldId id) const override {
    const HoldRecord* hold = ledger_.find(id);
    if (hold == nullptr || !ledger_.isLive(*hold)) return {};
    std::vector<int> seats = hold->seats;
    std::sort(seats.begin(), seats.end());
    return seats;
  }

 private:
  booking::HoldResult place(SeatMap& map, const std::string& show, const std::string& user, std::vector<int> seats) {
    const booking::HoldId id = ledger_.open(show, user, seats);
    for (const int seat : seats) map.at(seat).claimedBy = id;
    return {booking::Status::Ok, id};
  }

  // The checks confirm and release share: spent or unknown, wrong owner, lapsed. A lapsed hold's seats are never touched.
  booking::Status checkOwnLiveHold(booking::HoldId id, const std::string& user, HoldRecord*& out) {
    HoldRecord* hold = ledger_.find(id);
    if (hold == nullptr || hold->spent) return booking::Status::UnknownHold;
    if (hold->user != user) return booking::Status::NotOwner;
    if (ledger_.lapsed(*hold)) return booking::Status::Expired;
    out = hold;
    return booking::Status::Ok;
  }

  HoldLedger ledger_;
  std::unique_ptr<SeatAllocator> allocator_;
  ShowTable shows_;
};
