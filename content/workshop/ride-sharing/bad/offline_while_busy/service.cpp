// MUTATION: A driver on a trip can go offline.
#include <cstdlib>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"

// The map is a grid; driving distance is counted in blocks. Both questions about space live here and nowhere else.
inline int blocksBetween(ride::Point from, ride::Point to) {
  return std::abs(from.x - to.x) + std::abs(from.y - to.y);
}

inline bool onTheMap(ride::Point point) {
  return std::abs(point.x) <= ride::kMaxCoordinate && std::abs(point.y) <= ride::kMaxCoordinate;
}

inline bool samePlace(ride::Point first, ride::Point second) { return first.x == second.x && first.y == second.y; }

// A driver the matcher may choose from: free, online, and where they are.
struct Candidate {
  std::string name;
  ride::Point at;
};

// Who the drivers are and what each is doing right now. It knows nothing about trips, prices or how a driver is
// chosen. Busy implies online: a driver on a trip cannot go offline.
class DriverRoster {
 public:
  bool add(const std::string& name, ride::Point at) {
    if (name.empty() || !onTheMap(at)) return false;
    return drivers_.emplace(name, Driver{at, false, false}).second;
  }

  bool knows(const std::string& name) const { return drivers_.count(name) > 0; }
  bool isOnline(const std::string& name) const { return drivers_.at(name).online; }
  bool isBusy(const std::string& name) const { return drivers_.at(name).busy; }
  ride::Point position(const std::string& name) const { return drivers_.at(name).at; }

  void setOnline(const std::string& name, bool online) { drivers_.at(name).online = online; }
  void setBusy(const std::string& name, bool busy) { drivers_.at(name).busy = busy; }
  void moveTo(const std::string& name, ride::Point at) { drivers_.at(name).at = at; }

  int onlineCount() const {
    int count = 0;
    for (const auto& [name, driver] : drivers_) count += driver.online ? 1 : 0;
    return count;
  }

  int busyCount() const {
    int count = 0;
    for (const auto& [name, driver] : drivers_) count += driver.busy ? 1 : 0;
    return count;
  }

  std::vector<Candidate> idle() const {
    std::vector<Candidate> free;
    for (const auto& [name, driver] : drivers_) {
      if (driver.online && !driver.busy) free.push_back(Candidate{name, driver.at});
    }
    return free;
  }

 private:
  struct Driver {
    ride::Point at;
    bool online;
    bool busy;
  };
  std::map<std::string, Driver> drivers_;
};

// How a driver is chosen for a pickup. The roster decides who is free; the matcher only ranks them.
class Matcher {
 public:
  virtual ~Matcher() = default;
  virtual std::optional<std::string> pick(const std::vector<Candidate>& candidates, ride::Point pickup) const = 0;
};

// The nearest driver within the pickup limit; equal distances go to the lowest name.
class NearestMatcher : public Matcher {
 public:
  std::optional<std::string> pick(const std::vector<Candidate>& candidates, ride::Point pickup) const override {
    const Candidate* best = nullptr;
    int bestBlocks = 0;
    for (const Candidate& candidate : candidates) {
      const int blocks = blocksBetween(candidate.at, pickup);
      if (blocks > ride::kMaxPickupDistance) continue;
      if (best == nullptr || blocks < bestBlocks || (blocks == bestBlocks && candidate.name < best->name)) {
        best = &candidate;
        bestBlocks = blocks;
      }
    }
    if (best == nullptr) return std::nullopt;
    return best->name;
  }
};

// What the market looks like at the moment a trip is requested.
struct Demand {
  int online;
  int busy;
};

// What a trip costs. A Strategy: the pricing rule is the part the business keeps changing.
class FarePolicy {
 public:
  virtual ~FarePolicy() = default;
  virtual ride::Money quote(int blocks, const Demand& demand) const = 0;
};

class FlatFare : public FarePolicy {
 public:
  ride::Money quote(int blocks, const Demand& /*demand*/) const override { return standard(blocks); }

  static ride::Money standard(int blocks) { return ride::kBaseFare + ride::kFarePerBlock * blocks; }
};

// The standard fare times a multiplier that grows with the share of online drivers who are busy.
class SurgeFare : public FarePolicy {
 public:
  ride::Money quote(int blocks, const Demand& demand) const override {
    return FlatFare::standard(blocks) * multiplierPercent(demand) / kPercent;
  }

  static int multiplierPercent(const Demand& demand) {
    const int utilisation = demand.online > 0 ? demand.busy * kPercent / demand.online : 0;
    if (utilisation >= kHighLoad) return kHighMultiplier;
    if (utilisation >= kMediumLoad) return kMediumMultiplier;
    return kPercent;
  }

 private:
  static constexpr int kPercent = 100;
  static constexpr int kMediumLoad = 50;
  static constexpr int kHighLoad = 80;
  static constexpr int kMediumMultiplier = 150;
  static constexpr int kHighMultiplier = 200;
};

// One trip, as a record. It has no behaviour: the rules about moving between states are in TripLifecycle.
struct Trip {
  std::string rider;
  std::string driver;
  ride::Point pickup;
  ride::Point dropoff;
  ride::Money fare;
  ride::TripState state;
  std::set<std::string> declinedBy;
};

// The state machine, written once as a table of legal moves.
class TripLifecycle {
 public:
  static bool allows(ride::TripState from, ride::TripState to) {
    using ride::TripState;
    static const std::set<std::pair<TripState, TripState>> moves = {
        {TripState::Matched, TripState::Arrived},    {TripState::Matched, TripState::Cancelled},
        {TripState::Arrived, TripState::InProgress}, {TripState::Arrived, TripState::Cancelled},
        {TripState::InProgress, TripState::Completed},
    };
    return moves.count({from, to}) > 0;
  }

  // A trip that has not ended: its driver is busy and its rider may not ask for another.
  static bool isOpen(ride::TripState state) {
    return state == ride::TripState::Matched || state == ride::TripState::Arrived ||
           state == ride::TripState::InProgress;
  }

  static bool canBeDeclined(ride::TripState state) { return state == ride::TripState::Matched; }
};

// Issues ids and keeps every trip for good, so a finished trip can still be told apart from one that never existed.
class TripLedger {
 public:
  ride::TripId open(Trip trip) {
    const ride::TripId id = nextId_++;
    trips_.emplace(id, std::move(trip));
    return id;
  }

  Trip* find(ride::TripId id) {
    const auto found = trips_.find(id);
    return found == trips_.end() ? nullptr : &found->second;
  }

  const Trip* find(ride::TripId id) const {
    const auto found = trips_.find(id);
    return found == trips_.end() ? nullptr : &found->second;
  }

  bool riderIsTravelling(const std::string& rider) const {
    for (const auto& [id, trip] : trips_) {
      if (trip.rider == rider && TripLifecycle::isOpen(trip.state)) return true;
    }
    return false;
  }

 private:
  ride::TripId nextId_ = 1;
  std::map<ride::TripId, Trip> trips_;
};

// The public face. It validates in the documented order and sequences the roster, the matcher, the fare policy and
// the ledger. Which driver is chosen, what a trip costs and which moves are legal are decided by those classes.
class RidesImpl : public ride::DecliningRides {
 public:
  RidesImpl(std::unique_ptr<Matcher> matcher, std::unique_ptr<FarePolicy> fares)
      : matcher_(std::move(matcher)), fares_(std::move(fares)) {}

  bool registerDriver(const std::string& driver, ride::Point at) override { return roster_.add(driver, at); }

  ride::Status goOnline(const std::string& driver) override {
    if (!roster_.knows(driver)) return ride::Status::UnknownDriver;
    roster_.setOnline(driver, true);
    return ride::Status::Ok;
  }

  ride::Status goOffline(const std::string& driver) override {
    if (!roster_.knows(driver)) return ride::Status::UnknownDriver;
    roster_.setOnline(driver, false);
    return ride::Status::Ok;
  }

  ride::Status moveDriver(const std::string& driver, ride::Point to) override {
    if (!roster_.knows(driver)) return ride::Status::UnknownDriver;
    if (!onTheMap(to)) return ride::Status::InvalidRequest;
    roster_.moveTo(driver, to);
    return ride::Status::Ok;
  }

  ride::RequestResult requestRide(const std::string& rider, ride::Point pickup, ride::Point dropoff) override {
    if (rider.empty() || !onTheMap(pickup) || !onTheMap(dropoff) || samePlace(pickup, dropoff)) {
      return ride::RequestResult{ride::Status::InvalidRequest};
    }
    if (ledger_.riderIsTravelling(rider)) return ride::RequestResult{ride::Status::InvalidState};
    const std::optional<std::string> driver = matchFor(pickup, {});
    if (!driver) return ride::RequestResult{ride::Status::NoDriverAvailable};
    // The market is read before this trip takes a driver out of it.
    const ride::Money fare = fares_->quote(blocksBetween(pickup, dropoff), Demand{roster_.onlineCount(), roster_.busyCount()});
    roster_.setBusy(*driver, true);
    const ride::TripId id = ledger_.open(Trip{rider, *driver, pickup, dropoff, fare, ride::TripState::Matched, {}});
    return ride::RequestResult{ride::Status::Ok, id, *driver, fare};
  }

  ride::Status arrived(ride::TripId id, const std::string& driver) override {
    return advance(id, driver, ride::TripState::Arrived);
  }

  ride::Status start(ride::TripId id, const std::string& driver) override {
    return advance(id, driver, ride::TripState::InProgress);
  }

  ride::CompleteResult complete(ride::TripId id, const std::string& driver) override {
    const ride::Status status = advance(id, driver, ride::TripState::Completed);
    if (status != ride::Status::Ok) return ride::CompleteResult{status};
    const Trip& trip = *ledger_.find(id);
    roster_.setBusy(driver, false);
    roster_.moveTo(driver, trip.dropoff);
    return ride::CompleteResult{ride::Status::Ok, trip.fare};
  }

  ride::CancelResult cancel(ride::TripId id, const std::string& rider) override {
    Trip* trip = ledger_.find(id);
    if (trip == nullptr) return ride::CancelResult{ride::Status::UnknownTrip};
    if (trip->rider != rider) return ride::CancelResult{ride::Status::WrongParty};
    if (!TripLifecycle::allows(trip->state, ride::TripState::Cancelled)) return ride::CancelResult{ride::Status::InvalidState};
    const ride::Money fee = trip->state == ride::TripState::Arrived ? ride::kLateCancelFee : 0;
    trip->state = ride::TripState::Cancelled;
    roster_.setBusy(trip->driver, false);
    return ride::CancelResult{ride::Status::Ok, fee};
  }

  ride::DeclineResult decline(ride::TripId id, const std::string& driver) override {
    Trip* trip = ledger_.find(id);
    if (trip == nullptr) return ride::DeclineResult{ride::Status::UnknownTrip};
    if (trip->driver != driver) return ride::DeclineResult{ride::Status::WrongParty};
    if (!TripLifecycle::canBeDeclined(trip->state)) return ride::DeclineResult{ride::Status::InvalidState};
    trip->declinedBy.insert(driver);
    roster_.setBusy(driver, false);
    const std::optional<std::string> next = matchFor(trip->pickup, trip->declinedBy);
    if (!next) {
      trip->state = ride::TripState::Cancelled;
      return ride::DeclineResult{ride::Status::NoDriverAvailable};
    }
    trip->driver = *next;
    roster_.setBusy(*next, true);
    return ride::DeclineResult{ride::Status::Ok, *next};
  }

  ride::TripInfo trip(ride::TripId id) const override {
    const Trip* found = ledger_.find(id);
    if (found == nullptr) return ride::TripInfo{ride::Status::UnknownTrip};
    return ride::TripInfo{ride::Status::Ok, found->state, found->rider, found->driver, found->fare};
  }

  ride::DriverInfo driver(const std::string& driver) const override {
    if (!roster_.knows(driver)) return ride::DriverInfo{ride::Status::UnknownDriver};
    return ride::DriverInfo{ride::Status::Ok, roster_.isOnline(driver), roster_.isBusy(driver), roster_.position(driver)};
  }

 private:
  // The best free driver for a pickup, leaving out the ones who turned this trip down.
  std::optional<std::string> matchFor(ride::Point pickup, const std::set<std::string>& declinedBy) const {
    std::vector<Candidate> candidates;
    for (const Candidate& candidate : roster_.idle()) {
      if (declinedBy.count(candidate.name) == 0) candidates.push_back(candidate);
    }
    return matcher_->pick(candidates, pickup);
  }

  // One step of the lifecycle, by the trip's own driver.
  ride::Status advance(ride::TripId id, const std::string& driver, ride::TripState to) {
    Trip* trip = ledger_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->driver != driver) return ride::Status::WrongParty;
    if (!TripLifecycle::allows(trip->state, to)) return ride::Status::InvalidState;
    trip->state = to;
    return ride::Status::Ok;
  }

  std::unique_ptr<Matcher> matcher_;
  std::unique_ptr<FarePolicy> fares_;
  DriverRoster roster_;
  TripLedger ledger_;
};

std::unique_ptr<ride::Rides> ride::makeRides() {
  return std::make_unique<RidesImpl>(std::make_unique<NearestMatcher>(), std::make_unique<FlatFare>());
}

std::unique_ptr<ride::Rides> ride::makeSurgeRides() {
  return std::make_unique<RidesImpl>(std::make_unique<NearestMatcher>(), std::make_unique<SurgeFare>());
}

std::unique_ptr<ride::DecliningRides> ride::makeDecliningRides() {
  return std::make_unique<RidesImpl>(std::make_unique<NearestMatcher>(), std::make_unique<SurgeFare>());
}
