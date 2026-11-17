#pragma once
// Public API for the Movie ticket booking problem. The hidden tests only use what is declared here.
// You implement booking::makeService() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>
#include <vector>

namespace booking {

// A source of time in whole ticks (think seconds). It never goes backwards.
// The service must read time only through this interface, never from the system clock.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() const = 0;
};

using HoldId = long long;
constexpr HoldId kNoHold = 0;
constexpr int kMaxSeatsPerHold = 6;

enum class Status { Ok, UnknownShow, UnknownHold, BadSeat, TooManySeats, SeatTaken, NotOwner, Expired };
enum class SeatState { Free, Held, Booked, Missing };

struct HoldResult {
  Status status;
  HoldId id;  // kNoHold unless status is Ok. Ids are positive and never reused.
};

// Sells seats for shows. A customer first holds seats for a short time, then confirms the hold (pays) to book them,
// or lets it lapse. A show has `rows` rows of `seatsPerRow` seats. Seat number s sits in row s / seatsPerRow, at
// position s % seatsPerRow, and valid seats are 0 .. rows * seatsPerRow - 1.
class BookingService {
 public:
  virtual ~BookingService() = default;

  // Adds a show with all seats free. Returns false (and changes nothing) when the name is already used or when
  // rows or seatsPerRow is not positive.
  virtual bool addShow(const std::string& show, int rows, int seatsPerRow) = 0;

  // Holds all of the given seats for `user`, or none of them. Checked in this order, the first failure wins:
  //   UnknownShow    the show does not exist
  //   BadSeat        the list is empty, repeats a seat, or names a seat outside the show
  //   TooManySeats   more than kMaxSeatsPerHold seats
  //   SeatTaken      any of the seats is held by a live hold or is booked
  // On success the seats are Held. A hold is live from the tick it is made while now() < madeAt + holdTicks;
  // from tick madeAt + holdTicks its seats are Free again, with nobody having to call anything.
  virtual HoldResult hold(const std::string& show, const std::string& user, const std::vector<int>& seats) = 0;

  // Turns a live hold into bookings; the seats become Booked for good and the hold id is spent. Checked in order:
  //   UnknownHold    the id was never issued, or its hold was already confirmed or released
  //   NotOwner       `user` is not the one who made the hold (nothing changes, the hold stays live)
  //   Expired        the hold lapsed (nothing changes: its seats may already belong to someone else)
  // Returns Ok otherwise.
  virtual Status confirm(HoldId hold, const std::string& user) = 0;

  // Gives a live hold up: its seats become Free and the hold id is spent. Same checks and order as confirm().
  virtual Status release(HoldId hold, const std::string& user) = 0;

  // Missing for an unknown show or a seat outside the show. Held only while the hold is live.
  virtual SeatState seatState(const std::string& show, int seat) const = 0;

  // Seats that are Free right now; 0 for an unknown show.
  virtual int freeSeats(const std::string& show) const = 0;
};

// Returns nullptr when the clock is null or holdTicks is not positive.
std::unique_ptr<BookingService> makeService(std::shared_ptr<Clock> clock, long long holdTicks);

}  // namespace booking
