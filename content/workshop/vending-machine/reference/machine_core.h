#pragma once
#include "states.h"

// The machine's data and its current stage. It implements the transitions the states ask for, and nothing
// else, so the public class below stays a thin delegator.
class MachineCore : public MachineContext {
 public:
  SlotCatalog& catalog() override { return catalog_; }
  Till& till() override { return till_; }
  void becomeIdle() override { state_ = &idle_; }
  void becomeHasCredit() override { state_ = &hasCredit_; }
  void becomeMaintenance() override { state_ = &maintenance_; }

  const MachineState& state() const { return *state_; }
  bool inMaintenance() const { return state_ == &maintenance_; }
  const SlotCatalog& catalog() const { return catalog_; }
  const Till& till() const { return till_; }

 private:
  SlotCatalog catalog_;
  Till till_;
  IdleState idle_;
  HasCreditState hasCredit_;
  MaintenanceState maintenance_;
  const MachineState* state_ = &idle_;
};
