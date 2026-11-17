#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "seat_map.h"

// One customer's claim on some seats of one show.
struct HoldRecord {
  std::string show;
  std::string user;
  std::vector<int> seats;
  long long expiresAt = 0;
  bool extended = false;
  bool spent = false;  // confirmed or released: the id is finished for good
};

// Owns every hold, the clock, the hold period, and the one definition of "live". Nothing else compares times.
class HoldLedger {
 public:
  HoldLedger(std::shared_ptr<booking::Clock> clock, long long holdTicks) : clock_(std::move(clock)), holdTicks_(holdTicks) {}

  booking::HoldId open(std::string show, std::string user, std::vector<int> seats) {
    const booking::HoldId id = nextId_++;
    holds_[id] = HoldRecord{std::move(show), std::move(user), std::move(seats), deadlineFromNow(), false, false};
    return id;
  }

  HoldRecord* find(booking::HoldId id) {
    const auto found = holds_.find(id);
    return found == holds_.end() ? nullptr : &found->second;
  }
  const HoldRecord* find(booking::HoldId id) const {
    const auto found = holds_.find(id);
    return found == holds_.end() ? nullptr : &found->second;
  }

  bool lapsed(const HoldRecord& hold) const { return clock_->now() >= hold.expiresAt; }
  bool isLive(const HoldRecord& hold) const { return !hold.spent && !lapsed(hold); }
  bool isLive(booking::HoldId id) const {
    const HoldRecord* hold = find(id);
    return hold != nullptr && isLive(*hold);
  }

  // A seat is free when it is not sold and no live hold claims it. A claim by a lapsed hold counts for nothing.
  bool isFree(const SeatCell& cell) const { return !cell.booked && !isLive(cell.claimedBy); }

  // Gives a hold a fresh full period from now, once. Callers have already checked that it is live and unextended.
  void extend(HoldRecord& hold) {
    hold.expiresAt = deadlineFromNow();
    hold.extended = true;
  }

 private:
  long long deadlineFromNow() const { return clock_->now() + holdTicks_; }

  std::shared_ptr<booking::Clock> clock_;
  long long holdTicks_;
  booking::HoldId nextId_ = 1;
  std::map<booking::HoldId, HoldRecord> holds_;
};
