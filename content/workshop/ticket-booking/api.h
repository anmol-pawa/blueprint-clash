#pragma once
// Public API for the Movie ticket booking problem. The hidden tests only use what is declared here.
// You implement tix::makeBooking() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace tix {

// A source of time in whole ticks (think seconds). It never goes backwards.
// The system must read time only through this interface, never from the system clock.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() const = 0;
};

using HoldId = long long;
constexpr HoldId kNoHold = 0;  // hold ids that are issued are always positive and never reused

enum class Status {
  Ok,
  UnknownShow,      // no such show
  InvalidRequest,   // empty user, no seats, a seat listed twice, a count below one
  UnknownSeat,      // a seat name that does not exist in this show's hall
  SeatUnavailable,  // a seat is held by someone (unexpired) or already booked, or no suitable seats exist
  UnknownHold,      // the hold id was never issued, or was already confirmed or released
  WrongUser,        // the hold belongs to someone else
  HoldExpired,      // the hold's time ran out before it was confirmed or released
  OverLimit,        // only used by the per-user limit of the second change storm (api_storm2.h)
};

enum class SeatState { Available, Held, Booked };

struct HoldResult {
  Status status = Status::Ok;
  HoldId id = kNoHold;             // kNoHold unless status is Ok
  std::vector<std::string> seats;  // the seats now held, in the order requested; empty unless status is Ok
};

// Seats of a show are named by row letter and seat number: rows A, B, C... and seats 1, 2, 3... ("A1", "C12").
// A malformed or out-of-range name (a1, A0, A01, A99 in a 10-seat row, Z1 in a 3-row hall) is UnknownSeat.
class Booking {
 public:
  virtual ~Booking() = default;

  // Adds a show whose hall has `rows` rows (1..26) of `seatsPerRow` seats (1..50), all available.
  // Returns false, changing nothing, if the id is empty or taken, or a size is out of range.
  virtual bool addShow(const std::string& show, int rows, int seatsPerRow) = 0;

  // Puts a hold on every listed seat for the user, or on none of them. A hold lasts the number of ticks given to
  // makeBooking: placed at tick s with a duration of h, it is live while now() < s + h and expired from s + h on.
  // A seat is free when it is not booked and not covered by a live hold. Checks run in this order and the first
  // failure is returned with nothing changed: UnknownShow, InvalidRequest, UnknownSeat, SeatUnavailable.
  virtual HoldResult hold(const std::string& show, const std::string& user, const std::vector<std::string>& seats) = 0;

  // Turns a live hold into bookings: the seats become Booked for good and the hold id is spent.
  // Failures, checked in this order: UnknownHold (never issued, or already confirmed or released), WrongUser,
  // HoldExpired. A failed call changes nothing; an expired hold stays expired, so asking again repeats HoldExpired.
  virtual Status confirm(HoldId hold, const std::string& user) = 0;

  // Gives a live hold up: its seats are free at once and the hold id is spent. Same failures and order as confirm.
  virtual Status release(HoldId hold, const std::string& user) = 0;

  // Empty when the show or the seat does not exist. A seat under an expired hold is Available.
  virtual std::optional<SeatState> seatState(const std::string& show, const std::string& seat) const = 0;

  // The free seats of the show in row order, then seat number order. Empty for an unknown show.
  virtual std::vector<std::string> availableSeats(const std::string& show) const = 0;
};

// A hold lasts `holdTicks` ticks. Returns nullptr when the clock is null or holdTicks is zero or less.
std::unique_ptr<Booking> makeBooking(std::shared_ptr<Clock> clock, long long holdTicks);

}  // namespace tix
