#pragma once
#include <string>

#include "api_storm1.h"
#include "slot_catalog.h"
#include "till.h"

// What a state may touch: the data, and the transitions. The machine implements it.
class MachineContext {
 public:
  virtual ~MachineContext() = default;
  virtual SlotCatalog& catalog() = 0;
  virtual Till& till() = 0;
  virtual void becomeIdle() = 0;
  virtual void becomeHasCredit() = 0;
  virtual void becomeMaintenance() = 0;
};

// One stage of the purchase. Every operation the customer has is answered here, so a stage's
// behaviour is in one class and cannot be half-implemented.
class MachineState {
 public:
  virtual ~MachineState() = default;
  virtual vend::Status insertCoin(MachineContext& m, int cents) const = 0;
  virtual vend::Sale select(MachineContext& m, const std::string& slotId) const = 0;
  virtual long long cancel(MachineContext& m) const = 0;
};
