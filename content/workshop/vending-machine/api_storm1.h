#pragma once
// Change Storm 1 adds a maintenance mode. Everything from api.h still holds, and makeVendingMachine()
// keeps working as before. Only machines made by makeServiceableMachine() have the new operations.
#include "api.h"

namespace vend {

class ServiceableMachine : public VendingMachine {
 public:
  // A technician switches the machine to maintenance; returns the cents of credit handed back (0 if none).
  virtual long long enterMaintenance() = 0;
  // Back to normal service. Does nothing if the machine is not in maintenance.
  virtual void leaveMaintenance() = 0;
  virtual bool inMaintenance() const = 0;
};

std::unique_ptr<ServiceableMachine> makeServiceableMachine();

}  // namespace vend
