#pragma once
// Public API for the Ride sharing problem. The hidden tests only use what is declared here.
// You implement ride::makeRides() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace ride {

using TripId = long long;
constexpr TripId kNoTrip = 0;  // ids that are issued are always positive and never reused
using Money = long long;       // whole cents

// The city is a grid of whole-number points. Distance is the number of blocks driven: |dx| + |dy|.
struct Point {
  int x = 0;
  int y = 0;
};

constexpr int kMaxCoordinate = 1000;       // every coordinate must be in -1000..1000
constexpr int kMaxPickupDistance = 10;     // a driver farther than this from the pickup is never matched
constexpr Money kBaseFare = 310;           // every trip
constexpr Money kFarePerBlock = 125;       // per block between pickup and drop-off
constexpr Money kLateCancelFee = 200;      // rider cancels after the driver has arrived

enum class Status {
  Ok,
  InvalidRequest,    // empty name, a point out of range, or pickup equal to drop-off
  UnknownDriver,
  UnknownTrip,
  WrongParty,        // the rider or driver is not the one on this trip
  InvalidState,      // the trip (or rider) is not in a state where this is allowed
  DriverBusy,        // the driver is on a trip
  NoDriverAvailable, // nobody online, free and within kMaxPickupDistance
};

enum class TripState { Matched, Arrived, InProgress, Completed, Cancelled };

struct RequestResult {
  Status status = Status::Ok;
  TripId trip = kNoTrip;  // kNoTrip unless status is Ok
  std::string driver;     // empty unless status is Ok
  Money fare = 0;         // 0 unless status is Ok; what the trip will cost, fixed now
};

struct CancelResult {
  Status status = Status::Ok;
  Money fee = 0;  // 0 unless the rider cancelled after the driver had arrived
};

struct CompleteResult {
  Status status = Status::Ok;
  Money fare = 0;  // 0 unless status is Ok
};

struct TripInfo {
  Status status = Status::Ok;  // UnknownTrip when no such trip was ever issued
  TripState state = TripState::Matched;
  std::string rider;
  std::string driver;
  Money fare = 0;
};

struct DriverInfo {
  Status status = Status::Ok;  // UnknownDriver when never registered
  bool online = false;
  bool onTrip = false;  // matched, arrived or in progress
  Point at;
};

class Rides {
 public:
  virtual ~Rides() = default;

  // Registers a driver at a point. The driver starts offline. Returns false, changing nothing, for an empty name, a
  // name already registered or a point out of range.
  virtual bool registerDriver(const std::string& driver, Point at) = 0;

  // Online and offline are idempotent. Failures: UnknownDriver; for goOffline also DriverBusy while on a trip.
  virtual Status goOnline(const std::string& driver) = 0;
  virtual Status goOffline(const std::string& driver) = 0;

  // Moves the driver, at any time (also while on a trip). Failures in order: UnknownDriver, InvalidRequest (range).
  virtual Status moveDriver(const std::string& driver, Point to) = 0;

  // Matches the rider with the NEAREST driver who is online, not on a trip and within kMaxPickupDistance of the
  // pickup; a tie goes to the lowest driver name. The driver is on the trip from now on. The fare is
  // kBaseFare + kFarePerBlock * distance(pickup, dropoff) and is fixed now. Checks in order: InvalidRequest,
  // InvalidState (the rider already has a trip that is Matched, Arrived or InProgress), NoDriverAvailable.
  // A failed call changes nothing.
  virtual RequestResult requestRide(const std::string& rider, Point pickup, Point dropoff) = 0;

  // Trip lifecycle: Matched -> Arrived -> InProgress -> Completed, or Cancelled. Every call checks, in this order:
  // UnknownTrip, WrongParty (the caller is not the trip's driver / rider), InvalidState. A failed call changes
  // nothing.
  //
  // arrived:  the driver is at the pickup. Matched -> Arrived.
  // start:    the rider is in the car. Arrived -> InProgress.
  // complete: the driver drops the rider off. InProgress -> Completed; the driver is free again, at the drop-off
  //           point, and the fare is returned.
  // cancel:   the RIDER cancels, only from Matched (free) or Arrived (kLateCancelFee). The driver is free again,
  //           where they were. A trip that is InProgress, Completed or Cancelled is InvalidState.
  virtual Status arrived(TripId trip, const std::string& driver) = 0;
  virtual Status start(TripId trip, const std::string& driver) = 0;
  virtual CompleteResult complete(TripId trip, const std::string& driver) = 0;
  virtual CancelResult cancel(TripId trip, const std::string& rider) = 0;

  // Trips are never forgotten, so finished trips can be inspected.
  virtual TripInfo trip(TripId trip) const = 0;
  virtual DriverInfo driver(const std::string& driver) const = 0;
};

// Always returns a working system.
std::unique_ptr<Rides> makeRides();

}  // namespace ride
