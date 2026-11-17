#pragma once
// Public API for the Ride sharing problem. The hidden tests only use what is declared here.
// You implement ride::makeRideService() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>

namespace ride {

using TripId = long long;
constexpr TripId kNoTrip = 0;  // ids that are issued are always positive and never reused
using Money = long long;       // whole cents

constexpr int kMaxCoordinate = 1000;   // every coordinate is an integer in [0, kMaxCoordinate]
constexpr int kMaxPickupDistance = 20;  // a driver may be matched when |dx| + |dy| to the pickup is at most this
constexpr Money kBaseFare = 300;        // cents, charged on every trip
constexpr Money kFarePerUnit = 100;     // cents for each unit of |dx| + |dy| from pickup to destination

struct Point {
  int x = 0;
  int y = 0;
};

enum class Status {
  Ok,
  InvalidRequest,  // empty name, a coordinate out of range, or pickup equal to destination
  UnknownDriver,   // no such driver
  UnknownTrip,     // no trip with that id
  WrongParty,      // the caller is not the rider (or the driver) of the trip
  WrongState,      // the trip, or the driver, is not in a state where this is allowed
  RiderBusy,       // the rider already has a trip that is Matched or InProgress
  NoDriverNearby,  // no idle driver within kMaxPickupDistance of the pickup
};

enum class TripState { None, Matched, InProgress, Completed, Cancelled };  // None: the id was never issued
enum class DriverState { Unknown, Offline, Idle, Busy };

struct RideResult {
  Status status = Status::Ok;
  TripId trip = kNoTrip;  // kNoTrip unless status is Ok
  std::string driver;     // empty unless status is Ok
  Money fare = 0;         // the fare the trip will cost; 0 unless status is Ok
};

struct CompleteResult {
  Status status = Status::Ok;
  Money fare = 0;  // what the rider pays; 0 unless status is Ok
};

// Coordinates are integers on a grid; distance is always |dx| + |dy|.
class RideService {
 public:
  virtual ~RideService() = default;

  // Registers a driver who is online and idle at `at`. Returns false, changing nothing, for an empty name, a name
  // that exists, or a point outside the grid.
  virtual bool addDriver(const std::string& driver, Point at) = 0;

  // Takes an idle driver offline (Idle -> Offline) or back online (Offline -> Idle). Failures: UnknownDriver, then
  // WrongState (the driver is not Idle, respectively not Offline). A driver who is on a trip cannot go offline.
  virtual Status goOffline(const std::string& driver) = 0;
  virtual Status goOnline(const std::string& driver) = 0;

  // Matches the rider with the NEAREST idle driver within kMaxPickupDistance of `from` (ties go to the driver whose
  // name sorts first) and creates a trip in state Matched; the driver becomes Busy. Checks in this order:
  // InvalidRequest (empty rider, a point outside the grid, from == to), RiderBusy, NoDriverNearby. The fare is
  // kBaseFare + kFarePerUnit * distance(from, to). A failed call changes nothing.
  virtual RideResult requestRide(const std::string& rider, Point from, Point to) = 0;

  // The rider gives up. Allowed only while the trip is Matched; the driver is idle again where they were.
  // Failures, in this order: UnknownTrip, WrongParty, WrongState.
  virtual Status cancel(TripId trip, const std::string& rider) = 0;

  // The driver picks the rider up (Matched -> InProgress). The driver is now at the pickup point.
  // Failures, in this order: UnknownTrip, WrongParty (not the matched driver), WrongState.
  virtual Status start(TripId trip, const std::string& driver) = 0;

  // The driver drops the rider off (InProgress -> Completed): the driver is Idle at the destination and the rider
  // is charged the fare. Failures, in this order: UnknownTrip, WrongParty, WrongState.
  virtual CompleteResult complete(TripId trip, const std::string& driver) = 0;

  // Queries; none of them changes anything.
  virtual TripState tripState(TripId trip) const = 0;
  virtual DriverState driverState(const std::string& driver) const = 0;
  virtual std::optional<Point> driverLocation(const std::string& driver) const = 0;
};

std::unique_ptr<RideService> makeRideService();

}  // namespace ride
