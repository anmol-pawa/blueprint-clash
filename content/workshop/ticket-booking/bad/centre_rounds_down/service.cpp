// MUTATION: the centre distance uses integer halves, so even groups are mis-centred.
#include <cstdlib>
#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"


// The shape of one hall and the naming of its seats. It knows nothing about who holds what.
// Seats are numbered row-major from 0; "A1" is index 0.
class Layout {
 public:
  Layout(int rows, int seatsPerRow) : rows_(rows), seatsPerRow_(seatsPerRow) {}

  int rows() const { return rows_; }
  int seatsPerRow() const { return seatsPerRow_; }
  int size() const { return rows_ * seatsPerRow_; }
  int indexOf(int row, int seat) const { return row * seatsPerRow_ + seat; }

  // Parses "C12" into an index. Anything malformed or out of range gives an empty optional.
  std::optional<int> parse(const std::string& name) const {
    if (name.size() < 2 || name.size() > 3) return std::nullopt;
    const int row = name[0] - 'A';
    if (row < 0 || row >= rows_) return std::nullopt;
    if (name[1] == '0') return std::nullopt;
    int number = 0;
    for (std::size_t i = 1; i < name.size(); ++i) {
      if (name[i] < '0' || name[i] > '9') return std::nullopt;
      number = number * 10 + (name[i] - '0');
    }
    if (number < 1 || number > seatsPerRow_) return std::nullopt;
    return indexOf(row, number - 1);
  }

  std::string nameOf(int index) const {
    return std::string(1, static_cast<char>('A' + index / seatsPerRow_)) + std::to_string(index % seatsPerRow_ + 1);
  }

 private:
  int rows_;
  int seatsPerRow_;
};



// Owns the clock and the one definition of "a hold is live". Every question about whether a hold still counts,
// whether a seat is free and whether a confirm is in time goes through isLive().
class HoldWindow {
 public:
  HoldWindow(std::shared_ptr<tix::Clock> clock, long long ticks) : clock_(std::move(clock)), ticks_(ticks) {}

  // The tick from which a hold placed now no longer counts.
  long long expiryFromNow() const { return clock_->now() + ticks_; }

  // Live while now < expiresAt; expired from the expiry tick itself.
  bool isLive(long long expiresAt) const { return clock_->now() < expiresAt; }

 private:
  std::shared_ptr<tix::Clock> clock_;
  long long ticks_;
};



// Who holds or owns each seat, and the holds themselves. Seat state is derived, never stored as "held": a slot
// only remembers the id of the last hold that covered it, and the hold's expiry says whether that still counts.
// Nothing needs a timer, and an expired hold frees its seats just by the clock moving on.
class Inventory {
 public:
  explicit Inventory(HoldWindow window) : window_(std::move(window)) {}

  bool addShow(const std::string& id, Layout layout) {
    return shows_.emplace(id, Show{layout, std::vector<Slot>(static_cast<std::size_t>(layout.size()))}).second;
  }

  const Layout* layoutOf(const std::string& id) const {
    const auto it = shows_.find(id);
    return it == shows_.end() ? nullptr : &it->second.layout;
  }

  tix::SeatState stateOf(const std::string& show, int seat) const {
    const Slot& slot = shows_.at(show).slots[static_cast<std::size_t>(seat)];
    if (slot.booked) return tix::SeatState::Booked;
    return isHeld(slot) ? tix::SeatState::Held : tix::SeatState::Available;
  }

  bool isFree(const std::string& show, int seat) const { return stateOf(show, seat) == tix::SeatState::Available; }

  // The caller has checked that every seat exists and is free.
  tix::HoldId place(const std::string& show, const std::string& user, const std::vector<int>& seats) {
    const tix::HoldId id = nextId_++;
    holds_[id] = Hold{show, user, seats, window_.expiryFromNow(), false};
    Show& target = shows_.at(show);
    for (const int seat : seats) target.slots[static_cast<std::size_t>(seat)].holdId = id;
    return id;
  }

  tix::Status confirm(tix::HoldId id, const std::string& user) { return settle(id, user, true); }
  tix::Status release(tix::HoldId id, const std::string& user) { return settle(id, user, false); }

  int seatsInUse(const std::string& show, const std::string& user) const {
    const auto it = shows_.find(show);
    if (it == shows_.end()) return 0;
    int used = 0;
    for (const Slot& slot : it->second.slots) {
      if (slot.booked && slot.bookedBy == user) ++used;
      else if (!slot.booked && isHeld(slot) && holds_.at(slot.holdId).user == user) ++used;
    }
    return used;
  }

 private:
  struct Slot {
    tix::HoldId holdId = tix::kNoHold;
    bool booked = false;
    std::string bookedBy;
  };
  struct Show {
    Layout layout;
    std::vector<Slot> slots;
  };
  struct Hold {
    std::string show;
    std::string user;
    std::vector<int> seats;
    long long expiresAt = 0;
    bool spent = false;  // confirmed or released
  };

  bool isHeld(const Slot& slot) const {
    if (slot.holdId == tix::kNoHold) return false;
    const Hold& hold = holds_.at(slot.holdId);
    return !hold.spent && window_.isLive(hold.expiresAt);
  }

  // Confirm and release share every check; they differ only in what happens to the seats.
  tix::Status settle(tix::HoldId id, const std::string& user, bool book) {
    const auto it = holds_.find(id);
    if (it == holds_.end() || it->second.spent) return tix::Status::UnknownHold;
    Hold& hold = it->second;
    if (hold.user != user) return tix::Status::WrongUser;
    if (!window_.isLive(hold.expiresAt)) return tix::Status::HoldExpired;
    Show& show = shows_.at(hold.show);
    for (const int seat : hold.seats) {
      Slot& slot = show.slots[static_cast<std::size_t>(seat)];
      slot.holdId = tix::kNoHold;
      if (book) {
        slot.booked = true;
        slot.bookedBy = user;
      }
    }
    hold.spent = true;
    return tix::Status::Ok;
  }

  HoldWindow window_;
  std::map<std::string, Show> shows_;
  std::map<tix::HoldId, Hold> holds_;
  tix::HoldId nextId_ = 1;
};



// Chooses seats for "pick the best for me". A Strategy: the rule is data about taste, and it will change.
class SeatSelector {
 public:
  virtual ~SeatSelector() = default;
  virtual std::optional<std::vector<int>> choose(const Layout& layout, const std::function<bool(int)>& isFree,
                                                 int count) const = 0;
};

// Closest row to the middle of the hall, then the run centred nearest the middle of the row, then lowest row, then
// lowest seat. Distances are doubled so that the half-seat cases need no floating point.
class CentreFirstSelector : public SeatSelector {
 public:
  std::optional<std::vector<int>> choose(const Layout& layout, const std::function<bool(int)>& isFree,
                                         int count) const override {
    std::optional<Candidate> best;
    for (int row = 0; row < layout.rows(); ++row) {
      for (int first = 0; first + count <= layout.seatsPerRow(); ++first) {
        if (!runIsFree(layout, isFree, row, first, count)) continue;
        const Candidate candidate{std::abs(2 * row - (layout.rows() - 1)),
                                  std::abs(first + (count - 1) / 2 - (layout.seatsPerRow() - 1) / 2), row, first};
        if (!best.has_value() || better(candidate, *best)) best = candidate;
      }
    }
    if (!best.has_value()) return std::nullopt;
    std::vector<int> seats;
    for (int i = 0; i < count; ++i) seats.push_back(layout.indexOf(best->row, best->first + i));
    return seats;
  }

 private:
  struct Candidate {
    int rowDistance;
    int centreDistance;
    int row;
    int first;
  };

  // The house rule as one lexicographic order: row distance, centre distance, row, first seat.
  static bool better(const Candidate& a, const Candidate& b) {
    if (a.rowDistance != b.rowDistance) return a.rowDistance < b.rowDistance;
    if (a.centreDistance != b.centreDistance) return a.centreDistance < b.centreDistance;
    if (a.row != b.row) return a.row < b.row;
    return a.first < b.first;
  }

  static bool runIsFree(const Layout& layout, const std::function<bool(int)>& isFree, int row, int first, int count) {
    for (int i = 0; i < count; ++i) {
      if (!isFree(layout.indexOf(row, first + i))) return false;
    }
    return true;
  }
};


// Decides whether a user may take more seats in a show. A Strategy so that "no limit" is not a special case in
// the booking code.
class UsagePolicy {
 public:
  virtual ~UsagePolicy() = default;
  virtual bool allows(int seatsInUse, int seatsRequested) const = 0;
};

class NoLimit : public UsagePolicy {
 public:
  bool allows(int, int) const override { return true; }
};

class PerUserCap : public UsagePolicy {
 public:
  explicit PerUserCap(int maxSeats) : maxSeats_(maxSeats) {}
  bool allows(int seatsInUse, int seatsRequested) const override { return seatsInUse + seatsRequested <= maxSeats_; }

 private:
  int maxSeats_;
};



// The public face. It validates a request, asks the policy and the inventory, and sequences the answer. It holds no
// rule of its own about time, seat taste or limits.
class BookingImpl : public tix::LimitedBooking {
 public:
  BookingImpl(std::shared_ptr<tix::Clock> clock, long long holdTicks, std::unique_ptr<UsagePolicy> usage)
      : inventory_(HoldWindow(std::move(clock), holdTicks)), usage_(std::move(usage)) {}

  bool addShow(const std::string& show, int rows, int seatsPerRow) override {
    if (show.empty() || rows < 1 || rows > 26 || seatsPerRow < 1 || seatsPerRow > 50) return false;
    return inventory_.addShow(show, Layout(rows, seatsPerRow));
  }

  tix::HoldResult hold(const std::string& show, const std::string& user, const std::vector<std::string>& names) override {
    const Layout* layout = inventory_.layoutOf(show);
    if (layout == nullptr) return refuse(tix::Status::UnknownShow);
    if (user.empty() || names.empty()) return refuse(tix::Status::InvalidRequest);
    std::vector<int> seats;
    std::set<int> distinct;
    for (const std::string& name : names) {
      const auto index = layout->parse(name);
      if (index.has_value() && !distinct.insert(*index).second) return refuse(tix::Status::InvalidRequest);
      if (index.has_value()) seats.push_back(*index);
    }
    if (seats.size() != names.size()) return refuse(tix::Status::UnknownSeat);
    if (!usage_->allows(inventory_.seatsInUse(show, user), static_cast<int>(seats.size()))) {
      return refuse(tix::Status::OverLimit);
    }
    for (const int seat : seats) {
      if (!inventory_.isFree(show, seat)) return refuse(tix::Status::SeatUnavailable);
    }
    return grant(show, user, seats, *layout);
  }

  tix::HoldResult holdBest(const std::string& show, const std::string& user, int count) override {
    const Layout* layout = inventory_.layoutOf(show);
    if (layout == nullptr) return refuse(tix::Status::UnknownShow);
    if (user.empty() || count < 1) return refuse(tix::Status::InvalidRequest);
    if (!usage_->allows(inventory_.seatsInUse(show, user), count)) return refuse(tix::Status::OverLimit);
    const auto chosen = selector_.choose(*layout, [&](int seat) { return inventory_.isFree(show, seat); }, count);
    if (!chosen.has_value()) return refuse(tix::Status::SeatUnavailable);
    return grant(show, user, *chosen, *layout);
  }

  tix::Status confirm(tix::HoldId hold, const std::string& user) override { return inventory_.confirm(hold, user); }
  tix::Status release(tix::HoldId hold, const std::string& user) override { return inventory_.release(hold, user); }

  std::optional<tix::SeatState> seatState(const std::string& show, const std::string& seat) const override {
    const Layout* layout = inventory_.layoutOf(show);
    if (layout == nullptr) return std::nullopt;
    const auto index = layout->parse(seat);
    if (!index.has_value()) return std::nullopt;
    return inventory_.stateOf(show, *index);
  }

  std::vector<std::string> availableSeats(const std::string& show) const override {
    std::vector<std::string> free;
    const Layout* layout = inventory_.layoutOf(show);
    if (layout == nullptr) return free;
    for (int seat = 0; seat < layout->size(); ++seat) {
      if (inventory_.isFree(show, seat)) free.push_back(layout->nameOf(seat));
    }
    return free;
  }

  int seatsInUse(const std::string& show, const std::string& user) const override {
    return inventory_.seatsInUse(show, user);
  }

 private:
  static tix::HoldResult refuse(tix::Status status) { return tix::HoldResult{status, tix::kNoHold, {}}; }

  tix::HoldResult grant(const std::string& show, const std::string& user, const std::vector<int>& seats,
                        const Layout& layout) {
    tix::HoldResult result;
    result.status = tix::Status::Ok;
    result.id = inventory_.place(show, user, seats);
    for (const int seat : seats) result.seats.push_back(layout.nameOf(seat));
    return result;
  }

  Inventory inventory_;
  std::unique_ptr<UsagePolicy> usage_;
  CentreFirstSelector selector_;
};


std::unique_ptr<tix::Booking> tix::makeBooking(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (clock == nullptr || holdTicks <= 0) return nullptr;
  return std::make_unique<BookingImpl>(std::move(clock), holdTicks, std::make_unique<NoLimit>());
}

std::unique_ptr<tix::SmartBooking> tix::makeSmartBooking(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (clock == nullptr || holdTicks <= 0) return nullptr;
  return std::make_unique<BookingImpl>(std::move(clock), holdTicks, std::make_unique<NoLimit>());
}

std::unique_ptr<tix::LimitedBooking> tix::makeLimitedBooking(std::shared_ptr<Clock> clock, long long holdTicks,
                                                             int maxSeatsPerUser) {
  if (clock == nullptr || holdTicks <= 0 || maxSeatsPerUser < 1) return nullptr;
  return std::make_unique<BookingImpl>(std::move(clock), holdTicks, std::make_unique<PerUserCap>(maxSeatsPerUser));
}

