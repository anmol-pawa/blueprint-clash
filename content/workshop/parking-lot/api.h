#pragma once
// Public API for the Parking lot problem. The hidden tests only use what is declared here.
// You implement park::makeParkingLot() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace park {

enum class Status { Ok, DuplicateId, NoSuchTicket, AlreadyParked, LotFull };

// Size of a physical spot, smallest first.
enum class SpotSize { Small, Medium, Large };

// Kind of vehicle, smallest first.
enum class Vehicle { Motorcycle, Car, Truck };

struct Ticket {
  Status status;
  std::string ticketId;  // empty unless status == Ok
  std::string spotId;    // empty unless status == Ok
};

struct Receipt {
  Status status;
  long long feeCents;  // 0 unless status == Ok (a free exit is also 0, with status Ok)
  std::string spotId;  // the spot that was freed; empty unless status == Ok
};

class ParkingLot {
 public:
  virtual ~ParkingLot() = default;

  virtual Status addSpot(const std::string& spotId, SpotSize size) = 0;

  // A vehicle arrives. `plate` identifies the vehicle.
  virtual Ticket park(const std::string& plate, Vehicle vehicle) = 0;

  // The vehicle leaves after `minutesParked` minutes (>= 0). There is no clock in this API on purpose:
  // the caller says how long the stay was, so tests are deterministic.
  virtual Receipt leave(const std::string& ticketId, int minutesParked) = 0;

  // Number of unoccupied spots of exactly this size.
  virtual int freeSpots(SpotSize size) const = 0;
  // Spot currently occupied by this plate; empty if the plate is not parked.
  virtual std::string spotOf(const std::string& plate) const = 0;
};

std::unique_ptr<ParkingLot> makeParkingLot();

}  // namespace park
