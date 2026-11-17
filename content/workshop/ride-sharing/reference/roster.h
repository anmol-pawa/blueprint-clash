#pragma once
#include <map>
#include <string>
#include <vector>

#include "grid.h"

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
    if (name.empty() || !Grid::onTheMap(at)) return false;
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
