#pragma once
#include "car.h"

class ActiveMode : public CarMode {
 public:
  void step(Car& car) const override {
    if (car.stops().empty()) {
      car.goIdle();
      return;
    }
    if (!car.stops().has(car.floor())) car.moveOneFloor();
    if (car.stops().has(car.floor())) car.serveStopHere();
  }
};

// The doors close; no movement happens on the closing tick.
class DoorsOpenMode : public CarMode {
 public:
  void step(Car& car) const override { car.goIdle(); }
};

// Storm 1: a new class. Active and DoorsOpen are not edited.
class OutOfServiceMode : public CarMode {
 public:
  void step(Car&) const override {}
};

inline const CarMode& activeMode() {
  static const ActiveMode mode;
  return mode;
}
inline const CarMode& doorsOpenMode() {
  static const DoorsOpenMode mode;
  return mode;
}
inline const CarMode& outOfServiceMode() {
  static const OutOfServiceMode mode;
  return mode;
}
