#include "elevator_system.h"

std::unique_ptr<elev::ElevatorSystem> elev::makeElevatorSystem(int floors, int elevators) {
  return std::make_unique<ElevatorSystemImpl>(floors, elevators);
}

std::unique_ptr<elev::ServiceableElevators> elev::makeServiceableElevators(int floors, int elevators) {
  return std::make_unique<ElevatorSystemImpl>(floors, elevators);
}
