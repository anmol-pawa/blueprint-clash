#pragma once
#include <map>
#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "hold_window.h"
#include "layout.h"

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
