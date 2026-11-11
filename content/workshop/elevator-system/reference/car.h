#pragma once
#include <vector>

#include "car_mode.h"
#include "stop_list.h"

// One elevator: its position, its stops and its current mode. It knows how to sweep (keep its heading while
// anything is ahead), but not who answers hall calls (the Dispatcher) or what happens in each stage (the modes).
class Car {
 public:
  explicit Car(int id) : id_(id) {}

  int id() const { return id_; }
  int floor() const { return floor_; }
  elev::CarState report() const { return report_; }
  bool inService() const { return mode_ != &outOfServiceMode(); }

  StopList& stops() { return stops_; }
  const StopList& stops() const { return stops_; }

  void serveStopHere() {
    stops_.serve(floor_);
    report_ = elev::CarState::DoorsOpen;
    mode_ = &doorsOpenMode();
  }

  // Keep the heading while any stop is ahead; reverse only when nothing is. Needs a stop that is not here.
  void moveOneFloor() {
    if (!stops_.anyBeyond(floor_, heading_)) heading_ = -heading_;
    floor_ += heading_;
    report_ = heading_ > 0 ? elev::CarState::MovingUp : elev::CarState::MovingDown;
  }

  void goIdle() {
    report_ = elev::CarState::Idle;
    mode_ = &activeMode();
  }
  void goOutOfService() {
    report_ = elev::CarState::OutOfService;
    mode_ = &outOfServiceMode();
  }
  void step() { mode_->step(*this); }

 private:
  int id_;
  int floor_ = 0;
  int heading_ = 1;  // +1 up, -1 down; the direction of the last move
  elev::CarState report_ = elev::CarState::Idle;
  const CarMode* mode_ = &activeMode();
  StopList stops_;
};
