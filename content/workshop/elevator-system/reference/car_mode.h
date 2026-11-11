#pragma once
#include "api.h"

class Car;

// One class per stage of a car's life. A mode decides what the car does on a tick and what it becomes next.
// Modes hold no data (the car does), so a single shared instance of each is enough.
class CarMode {
 public:
  virtual ~CarMode() = default;
  virtual void step(Car& car) const = 0;
};

const CarMode& activeMode();        // idle or travelling: serve a stop here, or move towards the next one
const CarMode& doorsOpenMode();     // doors are open for exactly one tick
const CarMode& outOfServiceMode();  // parked; ignores time
