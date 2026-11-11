#pragma once
#include <cstdlib>
#include <vector>

#include "car.h"

// The scheduling policy: which of these cars answers a hall call? Candidates arrive in id order and never
// include a car that is out of service. A different policy (zoning, load balancing, destination dispatch)
// is a new subclass.
class Dispatcher {
 public:
  virtual ~Dispatcher() = default;
  virtual Car* choose(const std::vector<Car*>& candidates, int floor) const = 0;
};

// The closest car by floors from where it is now; ties go to the lowest id.
class NearestCarDispatcher : public Dispatcher {
 public:
  Car* choose(const std::vector<Car*>& candidates, int floor) const override {
    Car* best = nullptr;
    for (Car* car : candidates) {
      if (best == nullptr || std::abs(car->floor() - floor) < std::abs(best->floor() - floor)) best = car;
    }
    return best;
  }
};
