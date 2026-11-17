#pragma once
#include <map>
#include <string>
#include <vector>

#include "api.h"

// A car that is in the garage right now, and what a chooser needs to know about it.
struct IdleCar {
  std::string plate;
  bool everReturned;
  long long returnedAt;  // meaningful only when everReturned
};

// The physical cars: which exist, which category each belongs to, which are out, and when each last came back.
class Fleet {
 public:
  bool add(const std::string& plate, const std::string& category) {
    if (plate.empty()) return false;
    return cars_.emplace(plate, Car{category, false, false, 0}).second;
  }

  int countIn(const std::string& category) const {
    int count = 0;
    for (const auto& [plate, car] : cars_) count += car.category == category ? 1 : 0;
    return count;
  }

  std::vector<IdleCar> idleIn(const std::string& category) const {
    std::vector<IdleCar> idle;
    for (const auto& [plate, car] : cars_) {
      if (car.category == category && !car.out) idle.push_back(IdleCar{plate, car.everReturned, car.returnedAt});
    }
    return idle;
  }

  void takeOut(const std::string& plate) { cars_.at(plate).out = true; }
  void bringBack(const std::string& plate, long long hour) {
    Car& car = cars_.at(plate);
    car.out = false;
    car.everReturned = true;
    car.returnedAt = hour;
  }

 private:
  struct Car {
    std::string category;
    bool out;
    bool everReturned;
    long long returnedAt;
  };
  std::map<std::string, Car> cars_;
};
