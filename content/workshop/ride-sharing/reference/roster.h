#pragma once
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "geometry.h"

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
