#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "atm_state.h"
#include "machine.h"

// The public face: forwards each operation to the current state and follows the state's decision about what comes next.
// It has no rule of its own about cards, PINs, notes or limits.
class AtmImpl : public atm::LimitedAtm {
 public:
  explicit AtmImpl(std::unique_ptr<Machine> machine) : machine_(std::move(machine)), state_(&resting()) {}

  atm::Status insertCard(const std::string& card) override { return apply(state_->insertCard(*machine_, card)); }
  atm::Status enterPin(const std::string& pin) override { return apply(state_->enterPin(*machine_, pin)); }
  atm::Status withdraw(long long amount, atm::Notes& out) override {
    out.clear();
    return apply(state_->withdraw(*machine_, amount, out));
  }
  atm::Status ejectCard() override { return apply(state_->eject(*machine_)); }
  atm::State state() const override { return state_->id(); }
  atm::Notes stock() const override { return machine_->stock(); }
  void endOfDay() override { machine_->newDay(); }

 private:
  // Waiting for a customer: Idle, unless there is nothing to give.
  const AtmState& resting() const { return machine_->hasNotes() ? AtmState::idle() : AtmState::outOfService(); }

  atm::Status apply(const Step& step) {
    if (step.next != nullptr) state_ = step.next == &AtmState::idle() ? &resting() : step.next;
    return step.status;
  }

  std::unique_ptr<Machine> machine_;
  const AtmState* state_;
};
