#pragma once
// Public API for the Car rental problem. The hidden tests only use what is declared here.
// You implement rental::makeRentals() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace rental {

// A source of the current time, as a whole number of hours. The system must read the time only through this interface.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long nowHours() const = 0;
};

using ReservationId = long long;
constexpr ReservationId kNoReservation = 0;  // ids that are issued are always positive and never reused
using Money = long long;                     // whole cents

constexpr Money kMaxDailyRate = 100000;  // cents per started day
constexpr int kMaxHours = 720;           // longest single rental: 30 days

enum class Status {
  Ok,
  UnknownCategory,     // no such car category
  InvalidRequest,      // empty customer, a rental of no hours or fewer, or more than kMaxHours hours
  InPast,              // the rental would start before now
  NoneAvailable,       // at some hour of the rental every car of the category is already committed
  UnknownReservation,  // never issued, or already cancelled or returned
  WrongCustomer,       // the reservation belongs to someone else
  AlreadyPickedUp,     // the customer already has the car
  NotPickedUp,         // there is no car to bring back yet
  TooEarly,            // now is before the pickup hour
  Lapsed,              // now is at or after the drop-off hour, and the car was never collected
  NoCarReady,          // every car of the category is out with somebody
};

struct ReserveResult {
  Status status = Status::Ok;
  ReservationId id = kNoReservation;  // kNoReservation unless status is Ok
  Money total = 0;                    // 0 unless status is Ok
};

struct PickUpResult {
  Status status = Status::Ok;
  std::string plate;  // empty unless status is Ok
};

struct ReturnResult {
  Status status = Status::Ok;
  Money charge = 0;  // what the customer pays in the end; 0 unless status is Ok
};

// Hours are whole numbers. A rental from `pickup` to `dropoff` occupies the hours pickup, pickup+1, ..., dropoff-1:
// the drop-off hour itself is free, so one customer may bring a car back at the hour another collects it.
class Rentals {
 public:
  virtual ~Rentals() = default;

  // Adds a car category with a price per STARTED day (1..kMaxDailyRate). Returns false, changing nothing, when the
  // name is empty or taken or the rate is out of range.
  virtual bool addCategory(const std::string& category, Money dailyRate) = 0;

  // Adds one car, identified by its plate, to a category. Returns false, changing nothing, for an empty plate, a plate
  // that exists in any category, or an unknown category. Cars can be added at any time.
  virtual bool addCar(const std::string& plate, const std::string& category) = 0;

  // Promises one car of the category for the whole rental, or nothing. The customer is not given a particular car yet.
  // Checks run in this order, and the first failure is returned with nothing changed: UnknownCategory,
  // InvalidRequest, InPast (pickup < now; collecting this very hour is fine), NoneAvailable. The total is the daily
  // rate times the number of STARTED days: ceil(hours / 24).
  virtual ReserveResult reserve(const std::string& customer, const std::string& category, long long pickup,
                                long long dropoff) = 0;

  // Gives the promise back and spends the id. Failures, in this order: UnknownReservation, WrongCustomer,
  // AlreadyPickedUp. A failed call changes nothing.
  virtual Status cancel(ReservationId id, const std::string& customer) = 0;

  // Hands over a physical car of the reserved category: the free car with the LOWEST plate (by string comparison).
  // Failures, in this order: UnknownReservation, WrongCustomer, AlreadyPickedUp, TooEarly (now < pickup),
  // Lapsed (now >= dropoff), NoCarReady (every car of the category is out). A failed call changes nothing, so
  // NoCarReady can be retried later. A car that is out is free again only when it is returned.
  virtual PickUpResult pickUp(ReservationId id, const std::string& customer) = 0;

  // Takes the car back and spends the id. Failures, in this order: UnknownReservation, WrongCustomer, NotPickedUp.
  // The charge is the total the reservation was given. A car brought back before the drop-off hour frees the rest
  // of its hours for other reservations; a car that is returned late stays out until it is returned.
  virtual ReturnResult returnCar(ReservationId id, const std::string& customer) = 0;

  // How many more reservations of the category could be made for exactly this rental: the number of cars minus the
  // busiest hour of the rental. 0 for an unknown category or a rental that is not valid. It ignores now.
  virtual int available(const std::string& category, long long pickup, long long dropoff) const = 0;
};

// Returns nullptr when the clock is null.
std::unique_ptr<Rentals> makeRentals(std::shared_ptr<Clock> clock);

}  // namespace rental
