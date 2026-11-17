#pragma once
#include <memory>
#include <set>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "inventory.h"
#include "seat_selector.h"
#include "usage_policy.h"

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
