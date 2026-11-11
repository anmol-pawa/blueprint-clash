#pragma once
// Public API for the Elevator system problem. The hidden tests only use what is declared here.
// You implement elev::makeElevatorSystem() (in any of your .cpp files); everything behind it is your design.
//
// Time is discrete: nothing moves until step() is called, and one step() is one tick for every car.
#include <memory>
#include <vector>

namespace elev {

enum class Direction { Up, Down };

enum class Status {
  Ok,
  InvalidFloor,
  InvalidDirection,
  UnknownElevator,
  OutOfService,
  CannotRemoveLastCar
};

// What a car did on the last tick.
enum class CarState { Idle, MovingUp, MovingDown, DoorsOpen, OutOfService };

class ElevatorSystem {
 public:
  virtual ~ElevatorSystem() = default;

  // Someone presses the hall button on `floor` asking to go `direction`.
  virtual Status requestPickup(int floor, Direction direction) = 0;
  // Someone inside car `elevator` presses a floor button.
  virtual Status selectFloor(int elevator, int floor) = 0;
  // Advance time by one tick.
  virtual void step() = 0;

  // Cars are numbered 0..elevatorCount()-1 and floors 0..floorCount()-1. Every car starts idle at floor 0.
  virtual int elevatorCount() const = 0;
  virtual int floorCount() const = 0;
  virtual int floorOf(int elevator) const = 0;
  virtual CarState stateOf(int elevator) const = 0;
  // Floors this car still has to visit, ascending, without duplicates.
  virtual std::vector<int> stopsOf(int elevator) const = 0;
};

// Preconditions: floors >= 2 and elevators >= 1.
std::unique_ptr<ElevatorSystem> makeElevatorSystem(int floors, int elevators);

}  // namespace elev
