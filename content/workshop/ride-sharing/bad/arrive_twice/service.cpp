// MUTATION: arrive can be repeated.
#include <algorithm>
#include <cstdlib>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"



// Grid maths in one place: validity of a point and the |dx| + |dy| distance.
class Grid {
 public:
  static bool contains(const ride::Point& p) {
    return p.x >= 0 && p.x <= ride::kMaxCoordinate && p.y >= 0 && p.y <= ride::kMaxCoordinate;
  }
  static int distance(const ride::Point& a, const ride::Point& b) { return std::abs(a.x - b.x) + std::abs(a.y - b.y); }
  static bool same(const ride::Point& a, const ride::Point& b) { return a.x == b.x && a.y == b.y; }
};


// Prices a trip: the base-game fare scaled by the ride class, with one integer division at the end.
class Fare {
 public:
  static ride::Money quote(const ride::Point& from, const ride::Point& to, ride::RideClass rideClass) {
    const ride::Money raw = ride::kBaseFare + ride::kFarePerUnit * Grid::distance(from, to);
    return raw * percentOf(rideClass) / 100;
  }

 private:
  static int percentOf(ride::RideClass rideClass) {
    switch (rideClass) {
      case ride::RideClass::Economy: return 100;
      case ride::RideClass::Comfort: return 140;
      case ride::RideClass::Xl: return 200;
    }
    return 100;
  }
};



// The drivers: where each is, what class, and whether idle, busy or offline. It knows nothing about trips or fares.
struct Candidate {
  std::string driver;
  int distance;
};

class Roster {
 public:
  bool add(const std::string& name, const ride::Point& at, ride::RideClass rideClass) {
    if (name.empty() || !Grid::contains(at) || drivers_.count(name) > 0) return false;
    drivers_[name] = Entry{at, rideClass, ride::DriverState::Idle};
    return true;
  }

  bool knows(const std::string& name) const { return drivers_.count(name) > 0; }
  ride::DriverState state(const std::string& name) const {
    const auto it = drivers_.find(name);
    return it == drivers_.end() ? ride::DriverState::Unknown : it->second.state;
  }
  std::optional<ride::Point> where(const std::string& name) const {
    const auto it = drivers_.find(name);
    if (it == drivers_.end()) return std::nullopt;
    return it->second.at;
  }

  // Idle drivers of the class within `maxDistance` of `point`, in name order.
  std::vector<Candidate> idleNear(const ride::Point& point, ride::RideClass rideClass, int maxDistance) const {
    std::vector<Candidate> out;
    for (const auto& [name, e] : drivers_) {
      if (e.state != ride::DriverState::Idle || e.rideClass != rideClass) continue;
      const int d = Grid::distance(e.at, point);
      if (d <= maxDistance) out.push_back(Candidate{name, d});
    }
    return out;
  }

  void setState(const std::string& name, ride::DriverState state) { drivers_.at(name).state = state; }

  // The driver's own two moves, Idle <-> Offline. Failures: UnknownDriver, then WrongState.
  ride::Status transition(const std::string& name, ride::DriverState from, ride::DriverState to) {
    if (!knows(name)) return ride::Status::UnknownDriver;
    if (state(name) != from) return ride::Status::WrongState;
    setState(name, to);
    return ride::Status::Ok;
  }
  void moveTo(const std::string& name, const ride::Point& at) { drivers_.at(name).at = at; }

 private:
  struct Entry {
    ride::Point at;
    ride::RideClass rideClass;
    ride::DriverState state;
  };
  std::map<std::string, Entry> drivers_;
};



// Chooses the driver for a request out of the candidates in range. A Strategy: the facade never learns the rule.
class Matcher {
 public:
  virtual ~Matcher() = default;
  // `candidates` is never empty and is in name order.
  virtual std::string choose(const std::vector<Candidate>& candidates) const = 0;
};

// The nearest driver; ties go to the name that sorts first.
class NearestDriver : public Matcher {
 public:
  std::string choose(const std::vector<Candidate>& candidates) const override {
    return std::min_element(candidates.begin(), candidates.end(), &NearestDriver::closer)->driver;
  }

 private:
  static bool closer(const Candidate& a, const Candidate& b) {
    if (a.distance != b.distance) return a.distance < b.distance;
    return a.driver < b.driver;
  }
};


// The legal moves of a trip, in one table. Matched can go to Arrived-or-InProgress or Cancelled; InProgress can only
// complete. "Arrived" is a flag on a Matched trip, so the public TripState enum stays the base game's.
enum class Step { Arrive, Start, Cancel, Complete };

class TripMachine {
 public:
  static bool allows(ride::TripState from, Step step) {
    switch (step) {
      case Step::Arrive: return from == ride::TripState::Matched;
      case Step::Start: return from == ride::TripState::Matched;
      case Step::Cancel: return from == ride::TripState::Matched;
      case Step::Complete: return from == ride::TripState::InProgress;
    }
    return false;
  }
  static ride::TripState after(Step step) {
    switch (step) {
      case Step::Arrive: return ride::TripState::Matched;
      case Step::Start: return ride::TripState::InProgress;
      case Step::Cancel: return ride::TripState::Cancelled;
      case Step::Complete: return ride::TripState::Completed;
    }
    return ride::TripState::None;
  }
};



// The trip records: who, which driver, where, the quoted fare and the state. Ids are positive, issued in order and
// never reused; finished trips stay, so their state can still be asked.
struct Trip {
  std::string rider;
  std::string driver;
  ride::Point from;
  ride::Point to;
  ride::Money fare;
  ride::TripState state;
  bool arrived;
};

class Trips {
 public:
  ride::TripId add(Trip trip) {
    const ride::TripId id = next_++;
    trips_[id] = std::move(trip);
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
  // True when the rider has a trip that is Matched or InProgress.
  bool hasActive(const std::string& rider) const {
    for (const auto& [id, t] : trips_) {
      if (t.rider == rider && (t.state == ride::TripState::Matched || t.state == ride::TripState::InProgress)) return true;
    }
    return false;
  }

 private:
  ride::TripId next_ = 1;
  std::map<ride::TripId, Trip> trips_;
};


// What a rider owes for cancelling a trip, given whether the driver had already arrived. A Strategy.
class CancelFee {
 public:
  virtual ~CancelFee() = default;
  virtual ride::Money charge(bool driverArrived) const = 0;
};

class NoCancelFee : public CancelFee {
 public:
  ride::Money charge(bool) const override { return 0; }
};

class FeeOnceArrived : public CancelFee {
 public:
  explicit FeeOnceArrived(ride::Money fee) : fee_(fee) {}
  ride::Money charge(bool driverArrived) const override { return driverArrived ? fee_ : 0; }
  static bool isValid(ride::Money fee) { return fee >= 0 && fee <= ride::kMaxCancelFee; }

 private:
  ride::Money fee_;
};



// Names the one failed-request shape so that no caller builds it by hand.
struct Refusal {
  static ride::RideResult of(ride::Status status) { return ride::RideResult{status, ride::kNoTrip, "", 0}; }
};

// The public face of the base game. It validates a request in the documented order and sequences the collaborators.
// It holds no rule of its own about distance, money, fees or which driver is chosen. `Iface` is the interface of the
// phase being served, so each Change Storm adds a thin layer below instead of growing this class.
template <class Iface>
class RideServiceImpl : public Iface {
 public:
  RideServiceImpl(std::unique_ptr<Matcher> matcher, std::unique_ptr<CancelFee> cancelFee)
      : matcher_(std::move(matcher)), cancelFee_(std::move(cancelFee)) {}

  bool addDriver(const std::string& driver, ride::Point at) override {
    return roster_.add(driver, at, ride::RideClass::Economy);
  }
  ride::Status goOffline(const std::string& driver) override {
    return roster_.transition(driver, ride::DriverState::Idle, ride::DriverState::Offline);
  }
  ride::Status goOnline(const std::string& driver) override {
    return roster_.transition(driver, ride::DriverState::Offline, ride::DriverState::Idle);
  }
  ride::RideResult requestRide(const std::string& rider, ride::Point from, ride::Point to) override {
    return match(rider, ride::RideClass::Economy, from, to);
  }

  ride::Status cancel(ride::TripId id, const std::string& rider) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->rider != rider) return ride::Status::WrongParty;
    if (!TripMachine::allows(trip->state, Step::Cancel)) return ride::Status::WrongState;
    fees_[rider] += cancelFee_->charge(trip->arrived);
    trip->state = TripMachine::after(Step::Cancel);
    roster_.setState(trip->driver, ride::DriverState::Idle);
    return ride::Status::Ok;
  }

  ride::Status start(ride::TripId id, const std::string& driver) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->driver != driver) return ride::Status::WrongParty;
    if (!TripMachine::allows(trip->state, Step::Start)) return ride::Status::WrongState;
    trip->state = TripMachine::after(Step::Start);
    roster_.moveTo(driver, trip->from);
    return ride::Status::Ok;
  }

  ride::CompleteResult complete(ride::TripId id, const std::string& driver) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::CompleteResult{ride::Status::UnknownTrip, 0};
    if (trip->driver != driver) return ride::CompleteResult{ride::Status::WrongParty, 0};
    if (!TripMachine::allows(trip->state, Step::Complete)) return ride::CompleteResult{ride::Status::WrongState, 0};
    trip->state = TripMachine::after(Step::Complete);
    roster_.moveTo(driver, trip->to);
    roster_.setState(driver, ride::DriverState::Idle);
    return ride::CompleteResult{ride::Status::Ok, trip->fare};
  }

  ride::TripState tripState(ride::TripId id) const override {
    const Trip* trip = trips_.find(id);
    return trip == nullptr ? ride::TripState::None : trip->state;
  }
  ride::DriverState driverState(const std::string& driver) const override { return roster_.state(driver); }
  std::optional<ride::Point> driverLocation(const std::string& driver) const override { return roster_.where(driver); }

 protected:
  // The one place a ride is matched, whatever the class. Checks in the documented order, then one change of state.
  ride::RideResult match(const std::string& rider, ride::RideClass rideClass, const ride::Point& from,
                         const ride::Point& to) {
    if (rider.empty() || !Grid::contains(from) || !Grid::contains(to) || Grid::same(from, to)) {
      return Refusal::of(ride::Status::InvalidRequest);
    }
    if (trips_.hasActive(rider)) return Refusal::of(ride::Status::RiderBusy);
    const auto candidates = roster_.idleNear(from, rideClass, ride::kMaxPickupDistance);
    if (candidates.empty()) return Refusal::of(ride::Status::NoDriverNearby);
    const std::string driver = matcher_->choose(candidates);
    const ride::Money fare = Fare::quote(from, to, rideClass);
    const ride::TripId id = trips_.add(Trip{rider, driver, from, to, fare, ride::TripState::Matched, false});
    roster_.setState(driver, ride::DriverState::Busy);
    return ride::RideResult{ride::Status::Ok, id, driver, fare};
  }

  Roster roster_;
  Trips trips_;
  std::map<std::string, ride::Money> fees_;

 private:
  std::unique_ptr<Matcher> matcher_;
  std::unique_ptr<CancelFee> cancelFee_;
};

// Storm 1: classes. Adds the two class-aware calls on top of the base game and nothing else.
template <class Iface>
class ClassedServiceImpl : public RideServiceImpl<Iface> {
 public:
  using RideServiceImpl<Iface>::RideServiceImpl;

  bool addDriverOf(const std::string& driver, ride::Point at, ride::RideClass rideClass) override {
    return this->roster_.add(driver, at, rideClass);
  }
  ride::RideResult requestRideOf(const std::string& rider, ride::RideClass rideClass, ride::Point from,
                                 ride::Point to) override {
    return this->match(rider, rideClass, from, to);
  }
};

// Storm 2: arrival and cancellation fees. Adds `arrive` and two queries; the fee itself is the CancelFee Strategy.
class FeeServiceImpl : public ClassedServiceImpl<ride::FeeService> {
 public:
  using ClassedServiceImpl<ride::FeeService>::ClassedServiceImpl;

  ride::Status arrive(ride::TripId id, const std::string& driver) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->driver != driver) return ride::Status::WrongParty;
    if (!TripMachine::allows(trip->state, Step::Arrive)) return ride::Status::WrongState;
    trip->arrived = true;
    return ride::Status::Ok;
  }
  bool isArrived(ride::TripId id) const override {
    const Trip* trip = trips_.find(id);
    return trip != nullptr && trip->state == ride::TripState::Matched && trip->arrived;
  }
  ride::Money feesOwed(const std::string& rider) const override {
    const auto it = fees_.find(rider);
    return it == fees_.end() ? 0 : it->second;
  }
};


std::unique_ptr<ride::RideService> ride::makeRideService() {
  return std::make_unique<RideServiceImpl<ride::RideService>>(std::make_unique<NearestDriver>(),
                                                              std::make_unique<NoCancelFee>());
}

std::unique_ptr<ride::ClassedService> ride::makeClassedService() {
  return std::make_unique<ClassedServiceImpl<ride::ClassedService>>(std::make_unique<NearestDriver>(),
                                                                    std::make_unique<NoCancelFee>());
}

std::unique_ptr<ride::FeeService> ride::makeFeeService(Money cancelFee) {
  if (!FeeOnceArrived::isValid(cancelFee)) return nullptr;
  return std::make_unique<FeeServiceImpl>(std::make_unique<NearestDriver>(), std::make_unique<FeeOnceArrived>(cancelFee));
}
