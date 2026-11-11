// Each tick the car heads for the nearest stop, so it zigzags instead of sweeping.
#include <cstdlib>
#include <set>

#include "api_storm1.h"

namespace {
using namespace elev;

// One class, one struct per car, and every rule written inline.
struct Cab {
  int floor = 0;
  bool up = true;
  bool doors = false;
  bool oos = false;
  CarState state = CarState::Idle;
  std::set<int> cab;
  std::set<int> hall;
};

class System : public ServiceableElevators {
 public:
  System(int floors, int cars) : floors_(floors), cabs_(cars) {}

  Status requestPickup(int floor, Direction d) override {
    if (floor < 0 || floor >= floors_) return Status::InvalidFloor;
    if (d == Direction::Up && floor == floors_ - 1) return Status::InvalidDirection;
    if (d == Direction::Down && floor == 0) return Status::InvalidDirection;
    int best = -1;
    for (int i = 0; i < count(); ++i) {
      if (cabs_[i].oos) continue;
      if (best < 0 || std::abs(cabs_[i].floor - floor) < std::abs(cabs_[best].floor - floor)) best = i;
    }
    cabs_[best].hall.insert(floor);
    return Status::Ok;
  }
  Status selectFloor(int e, int floor) override {
    if (e < 0 || e >= count()) return Status::UnknownElevator;
    if (floor < 0 || floor >= floors_) return Status::InvalidFloor;
    if (cabs_[e].oos) return Status::OutOfService;
    cabs_[e].cab.insert(floor);
    return Status::Ok;
  }
  void step() override {
    for (auto& c : cabs_) stepCab(c);
  }
  int elevatorCount() const override { return count(); }
  int floorCount() const override { return floors_; }
  int floorOf(int e) const override { return cabs_[e].floor; }
  CarState stateOf(int e) const override { return cabs_[e].state; }
  std::vector<int> stopsOf(int e) const override {
    std::set<int> all(cabs_[e].cab);
    all.insert(cabs_[e].hall.begin(), cabs_[e].hall.end());
    return std::vector<int>(all.begin(), all.end());
  }
  Status setOutOfService(int e) override {
    if (e < 0 || e >= count()) return Status::UnknownElevator;
    if (cabs_[e].oos) return Status::Ok;
    int live = 0;
    for (const auto& c : cabs_) live += c.oos ? 0 : 1;
    if (live == 1) return Status::CannotRemoveLastCar;
    Cab& dead = cabs_[e];
    dead.oos = true;
    dead.state = CarState::OutOfService;
    dead.cab.clear();
    for (int f : dead.hall) {
      int best = -1;
      for (int i = 0; i < count(); ++i) {
        if (cabs_[i].oos) continue;
        if (best < 0 || std::abs(cabs_[i].floor - f) < std::abs(cabs_[best].floor - f)) best = i;
      }
      cabs_[best].hall.insert(f);
    }
    dead.hall.clear();
    return Status::Ok;
  }
  Status returnToService(int e) override {
    if (e < 0 || e >= count()) return Status::UnknownElevator;
    if (cabs_[e].oos) {
      cabs_[e].oos = false;
      cabs_[e].state = CarState::Idle;
    }
    return Status::Ok;
  }

 private:
  int count() const { return static_cast<int>(cabs_.size()); }
  static std::set<int> stopsOfCab(const Cab& c) {
    std::set<int> all(c.cab);
    all.insert(c.hall.begin(), c.hall.end());
    return all;
  }
  static bool has(const Cab& c, int f) { return c.cab.count(f) || c.hall.count(f); }
  static bool any(const Cab& c, bool above) {
    for (int f : c.cab) if (above ? f > c.floor : f < c.floor) return true;
    for (int f : c.hall) if (above ? f > c.floor : f < c.floor) return true;
    return false;
  }
  static void arrive(Cab& c) {
    c.cab.erase(c.floor);
    c.hall.erase(c.floor);
    c.doors = true;
    c.state = CarState::DoorsOpen;
  }
  void stepCab(Cab& c) {
    if (c.oos) return;
    if (c.doors) {
      c.doors = false;
      c.state = CarState::Idle;
      return;
    }
    if (c.cab.empty() && c.hall.empty()) {
      c.state = CarState::Idle;
      return;
    }
    if (has(c, c.floor)) {
      arrive(c);
      return;
    }
    // Always head for the nearest stop, whichever way that is.
    int bestDist = 1 << 30;
    for (int f : stopsOfCab(c)) {
      int dist = std::abs(f - c.floor);
      if (dist < bestDist || (dist == bestDist && f > c.floor)) { bestDist = dist; c.up = f > c.floor; }
    }
    c.floor += c.up ? 1 : -1;
    c.state = c.up ? CarState::MovingUp : CarState::MovingDown;
    if (has(c, c.floor)) arrive(c);
  }

  int floors_;
  std::vector<Cab> cabs_;
};
}  // namespace

std::unique_ptr<elev::ElevatorSystem> elev::makeElevatorSystem(int floors, int elevators) {
  return std::make_unique<System>(floors, elevators);
}
std::unique_ptr<elev::ServiceableElevators> elev::makeServiceableElevators(int floors, int elevators) {
  return std::make_unique<System>(floors, elevators);
}
