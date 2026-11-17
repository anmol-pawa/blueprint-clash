#pragma once
// Public API for the Ride sharing problem. The hidden tests only use what is declared here.
// You implement ride::makeDispatch() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace ride {

using TripId = long long;
constexpr TripId kNoTrip = 0;  // ids that are issued are always positive and never reused
using Money = long long;       // whole cents

constexpr long long kMaxCoordinate = 1000;       // every coordinate is within -1000..1000
constexpr long long kMaxPickupDistance = 50;     // a driver farther than this from the pickup is never matched
constexpr Money kBaseFare = 300;                 // cents, charged on every trip
constexpr Money kFarePerUnit = 120;              // cents per unit of trip distance
constexpr int kDefaultStars = 3;                 // what a driver with no ratings counts as
constexpr int kMinStars = 1;
constexpr int kMaxStars = 5;

// A point on a grid. Distance between two points is the Manhattan distance: |dx| + |dy|.
struct Location {
  long long x = 0;
  long long y = 0;
};

enum class Status {
  Ok,
  InvalidRequest,  // empty name, a coordinate out of range, pickup equal to dropoff, stars out of range
  RiderBusy,       // the rider already has a trip that is not finished
  NoDriver,        // no available driver within reach of the pickup
  UnknownDriver,   // never added
  DriverBusy,      // the driver is on a trip
  UnknownTrip,     // never issued
  WrongParty,      // the caller is not the rider (or the driver) of that trip
  BadState,        // the trip is not in a state where this operation is allowed
  AlreadyRated,    // the trip has been rated
};

enum class DriverState { Unknown, Offline, Available, OnTrip };

// Matched -> DriverArrived -> InProgress -> Completed; a rider may cancel while Matched or DriverArrived.
// Completed and Cancelled are final and stay readable for ever.
enum class TripState { Unknown, Matched, DriverArrived, InProgress, Completed, Cancelled };

struct RequestResult {
  Status status = Status::Ok;
  TripId trip = kNoTrip;  // kNoTrip unless status is Ok
  std::string driver;     // the matched driver; empty unless status is Ok
  Money fare = 0;         // the fare the rider will pay; 0 unless status is Ok
};

struct CompleteResult {
  Status status = Status::Ok;
  Money fare = 0;  // 0 unless status is Ok; always equals the fare quoted when the trip was requested
};

// There is no clock: nothing in this problem depends on the time of day.
class Dispatch {
 public:
  virtual ~Dispatch() = default;

  // Registers a driver, who starts Offline. Returns false, changing nothing, for an empty or a taken id.
  virtual bool addDriver(const std::string& driver) = 0;

  // Puts the driver Available at `where`; calling it again for an Available driver moves them. Failures, in this
  // order: UnknownDriver, InvalidRequest (a coordinate out of range), DriverBusy (on a trip). A failed call changes
  // nothing.
  virtual Status goOnline(const std::string& driver, Location where) = 0;

  // Takes the driver Offline. Failures, in this order: UnknownDriver, DriverBusy. Going offline twice is fine.
  virtual Status goOffline(const std::string& driver) = 0;

  virtual DriverState driverState(const std::string& driver) const = 0;

  // Matches the rider with the NEAREST available driver within kMaxPickupDistance of `pickup` (Manhattan distance;
  // ties go to the lowest driver id by string comparison) and opens a trip in state Matched. The driver is now
  // OnTrip. Checks run in this order and the first failure is returned with nothing changed: InvalidRequest (empty
  // rider, a coordinate out of range, pickup equal to dropoff), RiderBusy, NoDriver.
  // The fare is kBaseFare + kFarePerUnit * (distance from pickup to dropoff), and it is fixed here.
  virtual RequestResult requestRide(const std::string& rider, Location pickup, Location dropoff) = 0;

  // Matched -> DriverArrived. The driver is now at the pickup. Failures, in this order: UnknownTrip, WrongParty
  // (not the matched driver), BadState.
  virtual Status driverArrived(TripId trip, const std::string& driver) = 0;

  // DriverArrived -> InProgress. Same failures, same order.
  virtual Status startTrip(TripId trip, const std::string& driver) = 0;

  // InProgress -> Completed. The driver becomes Available again at the dropoff. Same failures, same order.
  virtual CompleteResult completeTrip(TripId trip, const std::string& driver) = 0;

  // The rider cancels a Matched or DriverArrived trip; the driver becomes Available again where they are (the
  // original spot if they have not arrived, the pickup if they have). Failures, in this order: UnknownTrip,
  // WrongParty (not the rider), BadState (anything but Matched or DriverArrived).
  virtual Status cancel(TripId trip, const std::string& rider) = 0;

  // The rider rates the driver of a Completed trip with 1..5 stars, once. Failures, in this order: UnknownTrip,
  // WrongParty, InvalidRequest (stars out of range), BadState (not Completed), AlreadyRated.
  virtual Status rate(TripId trip, const std::string& rider, int stars) = 0;

  // The driver's average rating in hundredths, rounded down: 100 * (sum of stars) / (number of ratings). A driver
  // with no ratings counts as kDefaultStars (300). 0 for an unknown driver.
  virtual long long rating(const std::string& driver) const = 0;

  virtual TripState state(TripId trip) const = 0;
};

// Always succeeds.
std::unique_ptr<Dispatch> makeDispatch();

}  // namespace ride
