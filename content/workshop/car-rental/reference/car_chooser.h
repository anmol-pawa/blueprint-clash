#pragma once
#include <algorithm>
#include <string>
#include <vector>

#include "fleet.h"

// Decides which of the idle cars goes out next. A Strategy: the facade never learns the rule.
class CarChooser {
 public:
  virtual ~CarChooser() = default;
  // `idle` is never empty.
  virtual std::string choose(const std::vector<IdleCar>& idle) const = 0;
};

class LowestPlate : public CarChooser {
 public:
  std::string choose(const std::vector<IdleCar>& idle) const override {
    return std::min_element(idle.begin(), idle.end(), [](const IdleCar& a, const IdleCar& b) { return a.plate < b.plate; })
        ->plate;
  }
};

// The car that has waited longest. Cars never returned have waited forever; ties go to the lower plate.
class LongestIdle : public CarChooser {
 public:
  std::string choose(const std::vector<IdleCar>& idle) const override {
    return std::min_element(idle.begin(), idle.end(), &LongestIdle::waitsLess)->plate;
  }

 private:
  static bool waitsLess(const IdleCar& a, const IdleCar& b) {
    if (a.everReturned != b.everReturned) return !a.everReturned;
    if (a.everReturned && a.returnedAt != b.returnedAt) return a.returnedAt < b.returnedAt;
    return a.plate < b.plate;
  }
};
