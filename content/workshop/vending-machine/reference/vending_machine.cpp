#include "vending_machine.h"

std::unique_ptr<vend::VendingMachine> vend::makeVendingMachine() { return std::make_unique<VendingMachineImpl>(); }

std::unique_ptr<vend::ServiceableMachine> vend::makeServiceableMachine() {
  return std::make_unique<VendingMachineImpl>();
}
