// a hold is still live at its expiry tick: the comparison uses > instead of >=.
#include <algorithm>
#include <map>
#include <memory>
#include <set>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {
using namespace booking;

struct Hold {
  std::string show;
  std::string user;
  std::vector<int> seats;
  long long expiresAt = 0;
  bool extended = false;
  bool spent = false;
};

struct Seat {
  HoldId holder = kNoHold;
  bool booked = false;
};

struct Show {
  int rows = 0;
  int perRow = 0;
  std::vector<Seat> seats;
};

class ServiceImpl : public SeatingService {
 public:
  ServiceImpl(std::shared_ptr<Clock> clock, long long ticks) : clock_(std::move(clock)), ticks_(ticks) {}

  bool addShow(const std::string& name, int rows, int perRow) override {
    if (rows <= 0 || perRow <= 0 || shows_.count(name) != 0) return false;
    Show show;
    show.rows = rows;
    show.perRow = perRow;
    show.seats.resize(static_cast<size_t>(rows) * perRow);
    shows_[name] = show;
    return true;
  }

  HoldResult hold(const std::string& name, const std::string& user, const std::vector<int>& seats) override {
    auto found = shows_.find(name);
    if (found == shows_.end()) return {Status::UnknownShow, kNoHold};
    Show& show = found->second;
    if (!validSeats(show, seats)) return {Status::BadSeat, kNoHold};
    if (seats.size() > static_cast<size_t>(kMaxSeatsPerHold)) return {Status::TooManySeats, kNoHold};
    for (int seat : seats) {
      if (!isFree(show.seats[static_cast<size_t>(seat)])) return {Status::SeatTaken, kNoHold};
    }
    return place(show, name, user, seats);
  }

  Status confirm(HoldId id, const std::string& user) override {
    Hold* hold = find(id);
    if (hold == nullptr || hold->spent) return Status::UnknownHold;
    if (hold->user != user) return Status::NotOwner;
    if (lapsed(*hold)) return Status::Expired;
    Show& show = shows_.at(hold->show);
    for (int seat : hold->seats) {
      show.seats[static_cast<size_t>(seat)].booked = true;
      show.seats[static_cast<size_t>(seat)].holder = kNoHold;
    }
    hold->spent = true;
    return Status::Ok;
  }

  Status release(HoldId id, const std::string& user) override {
    Hold* hold = find(id);
    if (hold == nullptr || hold->spent) return Status::UnknownHold;
    if (hold->user != user) return Status::NotOwner;
    if (lapsed(*hold)) return Status::Expired;
    Show& show = shows_.at(hold->show);
    for (int seat : hold->seats) show.seats[static_cast<size_t>(seat)].holder = kNoHold;
    hold->spent = true;
    return Status::Ok;
  }

  SeatState seatState(const std::string& name, int seat) const override {
    auto found = shows_.find(name);
    if (found == shows_.end() || seat < 0 || seat >= static_cast<int>(found->second.seats.size())) return SeatState::Missing;
    const Seat& cell = found->second.seats[static_cast<size_t>(seat)];
    if (cell.booked) return SeatState::Booked;
    return live(cell.holder) ? SeatState::Held : SeatState::Free;
  }

  int freeSeats(const std::string& name) const override {
    auto found = shows_.find(name);
    if (found == shows_.end()) return 0;
    int total = 0;
    for (const Seat& cell : found->second.seats) {
      if (!cell.booked && !live(cell.holder)) ++total;
    }
    return total;
  }

  ExtendResult extend(HoldId id, const std::string& user) override {
    Hold* hold = find(id);
    if (hold == nullptr || hold->spent) return ExtendResult::UnknownHold;
    if (hold->user != user) return ExtendResult::NotOwner;
    if (lapsed(*hold)) return ExtendResult::Expired;
    if (hold->extended) return ExtendResult::AlreadyExtended;
    hold->expiresAt = clock_->now() + ticks_;
    hold->extended = true;
    return ExtendResult::Ok;
  }

  HoldResult holdBest(const std::string& name, const std::string& user, int count) override {
    auto found = shows_.find(name);
    if (found == shows_.end()) return {Status::UnknownShow, kNoHold};
    if (count < 1) return {Status::BadSeat, kNoHold};
    if (count > kMaxSeatsPerHold) return {Status::TooManySeats, kNoHold};
    Show& show = found->second;
    std::vector<int> chosen;
    for (int row = 0; row < show.rows && chosen.empty(); ++row) {
      int run = 0;
      for (int col = 0; col < show.perRow; ++col) {
        const int seat = row * show.perRow + col;
        run = isFree(show.seats[static_cast<size_t>(seat)]) ? run + 1 : 0;
        if (run == count) {
          for (int i = count - 1; i >= 0; --i) chosen.push_back(seat - i);
        break;
        }
      }
    }
    if (chosen.empty()) return {Status::SeatTaken, kNoHold};
    return place(show, name, user, chosen);
  }

  std::vector<int> seatsOf(HoldId id) const override {
    auto found = holds_.find(id);
    if (found == holds_.end() || found->second.spent || lapsed(found->second)) return {};
    std::vector<int> seats = found->second.seats;
    std::sort(seats.begin(), seats.end());
    return seats;
  }

 private:
  Hold* find(HoldId id) {
    auto found = holds_.find(id);
    return found == holds_.end() ? nullptr : &found->second;
  }

  bool lapsed(const Hold& hold) const { return clock_->now() > hold.expiresAt; }

  bool live(HoldId id) const {
    auto found = holds_.find(id);
    return found != holds_.end() && !found->second.spent && !lapsed(found->second);
  }

  bool isFree(const Seat& cell) const { return !cell.booked && !live(cell.holder); }

  static bool validSeats(const Show& show, const std::vector<int>& seats) {
    if (seats.empty()) return false;
    std::set<int> unique(seats.begin(), seats.end());
    if (unique.size() != seats.size()) return false;
    for (int seat : seats) {
      if (seat < 0 || seat >= static_cast<int>(show.seats.size())) return false;
    }
    return true;
  }

  HoldResult place(Show& show, const std::string& name, const std::string& user, const std::vector<int>& seats) {
    const HoldId id = nextId_++;
    holds_[id] = Hold{name, user, seats, clock_->now() + ticks_, false, false};
    for (int seat : seats) show.seats[static_cast<size_t>(seat)].holder = id;
    return {Status::Ok, id};
  }

  std::shared_ptr<Clock> clock_;
  long long ticks_;
  HoldId nextId_ = 1;
  std::map<std::string, Show> shows_;
  std::map<HoldId, Hold> holds_;
};
}  // namespace

std::unique_ptr<BookingService> booking::makeService(std::shared_ptr<Clock> clock, long long ticks) {
  if (clock == nullptr || ticks <= 0) return nullptr;
  return std::make_unique<ServiceImpl>(std::move(clock), ticks);
}

std::unique_ptr<ExtendableService> booking::makeExtendableService(std::shared_ptr<Clock> clock, long long ticks) {
  if (clock == nullptr || ticks <= 0) return nullptr;
  return std::make_unique<ServiceImpl>(std::move(clock), ticks);
}

std::unique_ptr<SeatingService> booking::makeSeatingService(std::shared_ptr<Clock> clock, long long ticks) {
  if (clock == nullptr || ticks <= 0) return nullptr;
  return std::make_unique<ServiceImpl>(std::move(clock), ticks);
}
