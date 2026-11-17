// MUTATION: surge rounds each part of the fare.
#include <cstdlib>
#include <map>
#include <memory>
#include <set>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"

// The only place that knows what "distance" and "on the grid" mean.
inline long long manhattan(const ride::Location& a, const ride::Location& b) {
  return std::llabs(a.x - b.x) + std::llabs(a.y - b.y);
}

inline bool onGrid(const ride::Location& p) {
  return std::llabs(p.x) <= ride::kMaxCoordinate && std::llabs(p.y) <= ride::kMaxCoordinate;
}

inline bool sameSpot(const ride::Location& a, const ride::Location& b) { return a.x == b.x && a.y == b.y; }

// One available driver as a matcher sees them. An unrated driver already carries the default rating, so a matcher
// never needs to know that unrated drivers exist.
struct Candidate {
  std::string id;
  long long distance = 0;
  long long starSum = 0;
  long long ratingCount = 1;
};

// Strategy: which of the nearby available drivers gets the ride.
class DriverMatcher {
 public:
  virtual ~DriverMatcher() = default;
  // The farthest a driver may be from the pickup to be considered.
  virtual long long reach() const = 0;
  // Index of the chosen candidate, or -1 when the list is empty.
  virtual int choose(const std::vector<Candidate>& candidates) const = 0;
};

namespace matching {
// True when `a` is strictly better than `b` on distance, then id.
inline bool nearerThan(const Candidate& a, const Candidate& b) {
  if (a.distance != b.distance) return a.distance < b.distance;
  return a.id < b.id;
}
// Exact comparison of two average ratings: a.starSum / a.ratingCount > b.starSum / b.ratingCount.
inline bool ratedHigherThan(const Candidate& a, const Candidate& b) {
  return a.starSum * b.ratingCount > b.starSum * a.ratingCount;
}
inline bool sameRating(const Candidate& a, const Candidate& b) {
  return a.starSum * b.ratingCount == b.starSum * a.ratingCount;
}
}  // namespace matching

class NearestMatcher : public DriverMatcher {
 public:
  long long reach() const override { return ride::kMaxPickupDistance; }
  int choose(const std::vector<Candidate>& candidates) const override {
    int best = -1;
    for (int i = 0; i < static_cast<int>(candidates.size()); ++i) {
      if (best < 0 || matching::nearerThan(candidates[i], candidates[best])) best = i;
    }
    return best;
  }
};

class BestRatedMatcher : public DriverMatcher {
 public:
  explicit BestRatedMatcher(long long radius) : radius_(radius) {}
  static bool isValid(long long radius) { return radius >= 1 && radius <= ride::kMaxPickupDistance; }

  long long reach() const override { return radius_; }
  int choose(const std::vector<Candidate>& candidates) const override {
    int best = -1;
    for (int i = 0; i < static_cast<int>(candidates.size()); ++i) {
      if (best < 0 || isBetter(candidates[i], candidates[best])) best = i;
    }
    return best;
  }

 private:
  static bool isBetter(const Candidate& a, const Candidate& b) {
    if (!matching::sameRating(a, b)) return matching::ratedHigherThan(a, b);
    return matching::nearerThan(a, b);
  }
  long long radius_;
};

// What a trip of a given length costs once the surge multiplier is known.
class Tariff {
 public:
  static ride::Money fare(long long distance, int surgePercent) {
    const ride::Money plain = ride::kBaseFare + ride::kFarePerUnit * distance;
    return ride::kBaseFare * surgePercent / kPercentBase +
           (ride::kFarePerUnit * surgePercent / kPercentBase) * distance;
  }
  static constexpr int kPercentBase = 100;
};

// Strategy: how much more a trip costs right now, as a percentage of the plain fare (100 means no surge).
class SurgePolicy {
 public:
  virtual ~SurgePolicy() = default;
  virtual int percentFor(int availableDrivers) const = 0;
};

class NoSurge : public SurgePolicy {
 public:
  int percentFor(int) const override { return Tariff::kPercentBase; }
};

class ScarcitySurge : public SurgePolicy {
 public:
  ScarcitySurge(int freeDriverThreshold, int surgePercent) : threshold_(freeDriverThreshold), percent_(surgePercent) {}
  static bool isValid(int freeDriverThreshold, int surgePercent) {
    return freeDriverThreshold >= 0 && surgePercent >= Tariff::kPercentBase && surgePercent <= kMaxPercent;
  }
  int percentFor(int availableDrivers) const override {
    return availableDrivers <= threshold_ ? percent_ : Tariff::kPercentBase;
  }

 private:
  static constexpr int kMaxPercent = 500;
  int threshold_;
  int percent_;
};

// One trip and its state machine. Every legal move is a method here; an illegal one returns false and changes
// nothing, so no other class needs to know the order of the states.
class Trip {
 public:
  Trip(std::string rider, std::string driver, ride::Location pickup, ride::Location dropoff, ride::Money fare)
      : rider_(std::move(rider)), driver_(std::move(driver)), pickup_(pickup), dropoff_(dropoff), fare_(fare) {}

  const std::string& rider() const { return rider_; }
  const std::string& driver() const { return driver_; }
  const ride::Location& pickup() const { return pickup_; }
  const ride::Location& dropoff() const { return dropoff_; }
  ride::Money fare() const { return fare_; }
  ride::TripState state() const { return state_; }
  bool isFinished() const { return state_ == ride::TripState::Completed || state_ == ride::TripState::Cancelled; }
  bool isRated() const { return rated_; }

  bool arrive() { return move(ride::TripState::Matched, ride::TripState::DriverArrived); }
  bool start() { return move(ride::TripState::DriverArrived, ride::TripState::InProgress); }
  bool complete() { return move(ride::TripState::InProgress, ride::TripState::Completed); }
  bool cancel() {
    return move(ride::TripState::Matched, ride::TripState::Cancelled) ||
           move(ride::TripState::DriverArrived, ride::TripState::Cancelled);
  }
  bool markRated() {
    if (state_ != ride::TripState::Completed || rated_) return false;
    rated_ = true;
    return true;
  }

 private:
  bool move(ride::TripState from, ride::TripState to) {
    if (state_ != from) return false;
    state_ = to;
    return true;
  }

  std::string rider_;
  std::string driver_;
  ride::Location pickup_;
  ride::Location dropoff_;
  ride::Money fare_;
  ride::TripState state_ = ride::TripState::Matched;
  bool rated_ = false;
};

// Issues trip ids, keeps every trip for ever and knows which riders have an unfinished one.
class TripBook {
 public:
  ride::TripId open(Trip trip) {
    const ride::TripId id = nextId_++;
    ridersOnTrips_.insert(trip.rider());
    trips_.emplace(id, std::move(trip));
    return id;
  }
  Trip* find(ride::TripId id) {
    const auto it = trips_.find(id);
    return it == trips_.end() ? nullptr : &it->second;
  }
  const Trip* find(ride::TripId id) const {
    const auto it = trips_.find(id);
    return it == trips_.end() ? nullptr : &it->second;
  }
  bool riderIsBusy(const std::string& rider) const { return ridersOnTrips_.count(rider) > 0; }
  // Call once a trip has reached a final state.
  void close(const std::string& rider) { ridersOnTrips_.erase(rider); }

 private:
  std::map<ride::TripId, Trip> trips_;
  std::set<std::string> ridersOnTrips_;
  ride::TripId nextId_ = 1;
};

// The drivers: who exists, whether they can take a ride, where they are and how they have been rated.
class DriverPool {
 public:
  bool add(const std::string& id) {
    if (id.empty()) return false;
    return drivers_.emplace(id, Driver{}).second;
  }
  bool exists(const std::string& id) const { return drivers_.count(id) > 0; }

  ride::DriverState state(const std::string& id) const {
    const auto it = drivers_.find(id);
    return it == drivers_.end() ? ride::DriverState::Unknown : it->second.state;
  }
  const ride::Location& where(const std::string& id) const { return drivers_.at(id).where; }

  void setAvailable(const std::string& id, const ride::Location& where) {
    Driver& d = drivers_.at(id);
    d.state = ride::DriverState::Available;
    d.where = where;
  }
  void setOffline(const std::string& id) { drivers_.at(id).state = ride::DriverState::Offline; }
  void setOnTrip(const std::string& id) { drivers_.at(id).state = ride::DriverState::OnTrip; }
  void moveTo(const std::string& id, const ride::Location& where) { drivers_.at(id).where = where; }
  void addRating(const std::string& id, int stars) {
    Driver& d = drivers_.at(id);
    d.starSum += stars;
    d.ratingCount += 1;
  }

  // The average in hundredths, rounded down; the default rating for an unrated driver; 0 for an unknown one.
  long long ratingHundredths(const std::string& id) const {
    const auto it = drivers_.find(id);
    if (it == drivers_.end()) return 0;
    const Candidate c = asCandidate(id, it->second, 0);
    return 100 * c.starSum / c.ratingCount;
  }

  int availableCount() const {
    int n = 0;
    for (const auto& [id, d] : drivers_) n += d.state == ride::DriverState::Available ? 1 : 0;
    return n;
  }

  std::vector<Candidate> availableWithin(const ride::Location& from, long long reach) const {
    std::vector<Candidate> out;
    for (const auto& [id, d] : drivers_) {
      if (d.state != ride::DriverState::Available) continue;
      const long long distance = manhattan(from, d.where);
      if (distance <= reach) out.push_back(asCandidate(id, d, distance));
    }
    return out;
  }

 private:
  struct Driver {
    ride::DriverState state = ride::DriverState::Offline;
    ride::Location where;
    long long starSum = 0;
    long long ratingCount = 0;
  };

  static Candidate asCandidate(const std::string& id, const Driver& d, long long distance) {
    Candidate c;
    c.id = id;
    c.distance = distance;
    const bool unrated = d.ratingCount == 0;
    c.starSum = unrated ? ride::kDefaultStars : d.starSum;
    c.ratingCount = unrated ? 1 : d.ratingCount;
    return c;
  }

  std::map<std::string, Driver> drivers_;
};

// The facade: validates in the documented order and sequences the collaborators. Distance, fares, surge, matching
// and the legal order of trip states each live in one class of their own.
class RideImpl : public ride::Dispatch {
 public:
  RideImpl(std::unique_ptr<DriverMatcher> matcher, std::unique_ptr<SurgePolicy> surge)
      : matcher_(std::move(matcher)), surge_(std::move(surge)) {}

  bool addDriver(const std::string& driver) override { return drivers_.add(driver); }

  ride::Status goOnline(const std::string& driver, ride::Location where) override {
    if (!drivers_.exists(driver)) return ride::Status::UnknownDriver;
    if (!onGrid(where)) return ride::Status::InvalidRequest;
    if (drivers_.state(driver) == ride::DriverState::OnTrip) return ride::Status::DriverBusy;
    drivers_.setAvailable(driver, where);
    return ride::Status::Ok;
  }

  ride::Status goOffline(const std::string& driver) override {
    if (!drivers_.exists(driver)) return ride::Status::UnknownDriver;
    if (drivers_.state(driver) == ride::DriverState::OnTrip) return ride::Status::DriverBusy;
    drivers_.setOffline(driver);
    return ride::Status::Ok;
  }

  ride::DriverState driverState(const std::string& driver) const override { return drivers_.state(driver); }

  ride::RequestResult requestRide(const std::string& rider, ride::Location pickup, ride::Location dropoff) override {
    ride::RequestResult result;
    if (rider.empty() || !onGrid(pickup) || !onGrid(dropoff) || sameSpot(pickup, dropoff)) {
      result.status = ride::Status::InvalidRequest;
      return result;
    }
    if (trips_.riderIsBusy(rider)) {
      result.status = ride::Status::RiderBusy;
      return result;
    }
    const int surgePercent = surge_->percentFor(drivers_.availableCount());
    const auto candidates = drivers_.availableWithin(pickup, matcher_->reach());
    const int chosen = matcher_->choose(candidates);
    if (chosen < 0) {
      result.status = ride::Status::NoDriver;
      return result;
    }
    const std::string& driver = candidates[chosen].id;
    const ride::Money fare = Tariff::fare(manhattan(pickup, dropoff), surgePercent);
    drivers_.setOnTrip(driver);
    result.trip = trips_.open(Trip(rider, driver, pickup, dropoff, fare));
    result.driver = driver;
    result.fare = fare;
    return result;
  }

  ride::Status driverArrived(ride::TripId id, const std::string& driver) override {
    Trip* trip = nullptr;
    const ride::Status check = driversTrip(id, driver, &trip);
    if (check != ride::Status::Ok) return check;
    if (!trip->arrive()) return ride::Status::BadState;
    drivers_.moveTo(driver, trip->pickup());
    return ride::Status::Ok;
  }

  ride::Status startTrip(ride::TripId id, const std::string& driver) override {
    Trip* trip = nullptr;
    const ride::Status check = driversTrip(id, driver, &trip);
    if (check != ride::Status::Ok) return check;
    return trip->start() ? ride::Status::Ok : ride::Status::BadState;
  }

  ride::CompleteResult completeTrip(ride::TripId id, const std::string& driver) override {
    ride::CompleteResult result;
    Trip* trip = nullptr;
    result.status = driversTrip(id, driver, &trip);
    if (result.status != ride::Status::Ok) return result;
    if (!trip->complete()) {
      result.status = ride::Status::BadState;
      return result;
    }
    drivers_.setAvailable(driver, trip->dropoff());
    trips_.close(trip->rider());
    result.fare = trip->fare();
    return result;
  }

  ride::Status cancel(ride::TripId id, const std::string& rider) override {
    Trip* trip = nullptr;
    const ride::Status check = ridersTrip(id, rider, &trip);
    if (check != ride::Status::Ok) return check;
    if (!trip->cancel()) return ride::Status::BadState;
    drivers_.setAvailable(trip->driver(), drivers_.where(trip->driver()));
    trips_.close(rider);
    return ride::Status::Ok;
  }

  ride::Status rate(ride::TripId id, const std::string& rider, int stars) override {
    Trip* trip = nullptr;
    const ride::Status check = ridersTrip(id, rider, &trip);
    if (check != ride::Status::Ok) return check;
    if (stars < ride::kMinStars || stars > ride::kMaxStars) return ride::Status::InvalidRequest;
    if (trip->state() != ride::TripState::Completed) return ride::Status::BadState;
    if (!trip->markRated()) return ride::Status::AlreadyRated;
    drivers_.addRating(trip->driver(), stars);
    return ride::Status::Ok;
  }

  long long rating(const std::string& driver) const override { return drivers_.ratingHundredths(driver); }

  ride::TripState state(ride::TripId id) const override {
    const Trip* trip = trips_.find(id);
    return trip == nullptr ? ride::TripState::Unknown : trip->state();
  }

 private:
  ride::Status driversTrip(ride::TripId id, const std::string& driver, Trip** out) {
    *out = trips_.find(id);
    if (*out == nullptr) return ride::Status::UnknownTrip;
    return (*out)->driver() == driver ? ride::Status::Ok : ride::Status::WrongParty;
  }
  ride::Status ridersTrip(ride::TripId id, const std::string& rider, Trip** out) {
    *out = trips_.find(id);
    if (*out == nullptr) return ride::Status::UnknownTrip;
    return (*out)->rider() == rider ? ride::Status::Ok : ride::Status::WrongParty;
  }

  DriverPool drivers_;
  TripBook trips_;
  std::unique_ptr<DriverMatcher> matcher_;
  std::unique_ptr<SurgePolicy> surge_;
};

std::unique_ptr<ride::Dispatch> ride::makeDispatch() {
  return std::make_unique<RideImpl>(std::make_unique<NearestMatcher>(), std::make_unique<NoSurge>());
}

std::unique_ptr<ride::Dispatch> ride::makeSurgeDispatch(int freeDriverThreshold, int surgePercent) {
  if (!ScarcitySurge::isValid(freeDriverThreshold, surgePercent)) return nullptr;
  return std::make_unique<RideImpl>(std::make_unique<NearestMatcher>(),
                                    std::make_unique<ScarcitySurge>(freeDriverThreshold, surgePercent));
}

std::unique_ptr<ride::Dispatch> ride::makeRatedDispatch(int freeDriverThreshold, int surgePercent, long long radius) {
  if (!ScarcitySurge::isValid(freeDriverThreshold, surgePercent) || !BestRatedMatcher::isValid(radius)) return nullptr;
  return std::make_unique<RideImpl>(std::make_unique<BestRatedMatcher>(radius),
                                    std::make_unique<ScarcitySurge>(freeDriverThreshold, surgePercent));
}
