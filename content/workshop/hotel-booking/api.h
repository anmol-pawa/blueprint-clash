#pragma once
// Public API for the Hotel booking problem. The hidden tests only use what is declared here.
// You implement hotel::makeHotel() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>

namespace hotel {

// A source of the current day, as a whole number. The system must read the date only through this interface.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long today() const = 0;
};

using ReservationId = long long;
constexpr ReservationId kNoReservation = 0;  // ids that are issued are always positive and never reused
using Money = long long;                      // whole cents

constexpr int kMaxRooms = 1000;          // rooms of one type
constexpr Money kMaxNightlyRate = 1000000;  // cents per night
constexpr int kMaxNights = 30;           // longest single stay

enum class Status {
  Ok,
  UnknownType,         // no such room type
  InvalidRequest,      // empty guest, a stay of no nights or fewer, or more than kMaxNights nights
  InPast,              // the stay would start before today
  SoldOut,             // on at least one night of the stay every room of the type is taken
  UnknownReservation,  // never issued, or already cancelled
  WrongGuest,          // the reservation belongs to someone else
  StayStarted,         // today is the check-in day or later
};

struct BookResult {
  Status status = Status::Ok;
  ReservationId id = kNoReservation;  // kNoReservation unless status is Ok
  Money total = 0;                    // what the guest pays for the whole stay; 0 unless status is Ok
};

// Days are whole numbers. A stay from checkIn to checkOut occupies the NIGHTS checkIn, checkIn+1, ..., checkOut-1:
// the check-out day itself is not a night, so one guest may leave on the day another arrives.
class Hotel {
 public:
  virtual ~Hotel() = default;

  // Adds a room type with `rooms` identical rooms (1..kMaxRooms) at `nightlyRate` (1..kMaxNightlyRate). Returns false,
  // changing nothing, when the name is empty or taken or a number is out of range.
  virtual bool addRoomType(const std::string& type, int rooms, Money nightlyRate) = 0;

  // Reserves one room of the type for every night of the stay, or nothing. A guest is not given a particular room.
  // Checks run in this order, and the first failure is returned with nothing changed: UnknownType, InvalidRequest,
  // InPast (checkIn < today; checking in today is fine), SoldOut. The total is the nightly rates added up.
  virtual BookResult book(const std::string& guest, const std::string& type, long long checkIn, long long checkOut) = 0;

  // Gives the rooms of a reservation back for every night of it and spends the id. Failures, in this order:
  // UnknownReservation, WrongGuest, StayStarted (today >= checkIn). A failed call changes nothing.
  virtual Status cancel(ReservationId id, const std::string& guest) = 0;

  // The number of rooms of the type that are free on EVERY night of the stay, so the number of such stays that
  // could still be booked at once. 0 for an unknown type or a stay that is not valid. It ignores today.
  virtual int available(const std::string& type, long long checkIn, long long checkOut) const = 0;
};

// Returns nullptr when the clock is null.
std::unique_ptr<Hotel> makeHotel(std::shared_ptr<Clock> clock);

}  // namespace hotel
