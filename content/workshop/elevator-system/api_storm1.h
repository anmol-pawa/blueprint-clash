#pragma once
// Change Storm 1 lets staff take a car out of service. Everything from api.h still holds, and
// makeElevatorSystem() keeps working as before. Only systems made by makeServiceableElevators() have the new operations.
#include "api.h"

namespace elev {

class ServiceableElevators : public ElevatorSystem {
 public:
  virtual Status setOutOfService(int elevator) = 0;
  virtual Status returnToService(int elevator) = 0;
};

std::unique_ptr<ServiceableElevators> makeServiceableElevators(int floors, int elevators);

}  // namespace elev
