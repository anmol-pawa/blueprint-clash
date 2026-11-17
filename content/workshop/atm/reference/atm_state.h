#pragma once
#include <string>

#include "api_storm2.h"
#include "machine.h"

class AtmState;

// What a state decided: the answer for the caller and the state to move to (nullptr: stay where we are).
struct Step {
  atm::Status status;
  const AtmState* next;
};

// The State pattern: one object per state, no data of its own, so the objects can be shared. A state answers every
// operation; the ones it does not allow answer WrongState.
class AtmState {
 public:
  virtual ~AtmState() = default;
  virtual atm::State id() const = 0;
  virtual Step insertCard(Machine&, const std::string&) const { return Step{atm::Status::WrongState, nullptr}; }
  virtual Step enterPin(Machine&, const std::string&) const { return Step{atm::Status::WrongState, nullptr}; }
  virtual Step withdraw(Machine&, long long, atm::Notes&) const { return Step{atm::Status::WrongState, nullptr}; }
  virtual Step eject(Machine&) const { return Step{atm::Status::WrongState, nullptr}; }

  static const AtmState& idle();
  static const AtmState& awaitingPin();
  static const AtmState& ready();
  static const AtmState& outOfService();
};

namespace states {

class Idle : public AtmState {
 public:
  atm::State id() const override { return atm::State::Idle; }
  Step insertCard(Machine& machine, const std::string& card) const override {
    const atm::Status admitted = machine.admit(card);
    return Step{admitted, admitted == atm::Status::Ok ? &AtmState::awaitingPin() : nullptr};
  }
};

class AwaitingPin : public AtmState {
 public:
  atm::State id() const override { return atm::State::AwaitingPin; }
  Step enterPin(Machine& machine, const std::string& pin) const override {
    switch (machine.verifyPin(pin)) {
      case PinGuard::Verdict::Accepted:
        return Step{atm::Status::Ok, &AtmState::ready()};
      case PinGuard::Verdict::Rejected:
        return Step{atm::Status::WrongPin, nullptr};
      case PinGuard::Verdict::Retained:
        machine.release();
        return Step{atm::Status::CardRetained, &AtmState::idle()};
    }
    return Step{atm::Status::WrongState, nullptr};
  }
  Step eject(Machine& machine) const override {
    machine.release();
    return Step{atm::Status::Ok, &AtmState::idle()};
  }
};

class Ready : public AtmState {
 public:
  atm::State id() const override { return atm::State::Ready; }
  Step withdraw(Machine& machine, long long amount, atm::Notes& out) const override {
    return Step{machine.pay(amount, out), nullptr};
  }
  Step eject(Machine& machine) const override {
    machine.release();
    return Step{atm::Status::Ok, &AtmState::idle()};
  }
};

class OutOfService : public AtmState {
 public:
  atm::State id() const override { return atm::State::OutOfService; }
  Step insertCard(Machine&, const std::string&) const override { return Step{atm::Status::OutOfService, nullptr}; }
};

}  // namespace states

inline const AtmState& AtmState::idle() {
  static const states::Idle instance;
  return instance;
}
inline const AtmState& AtmState::awaitingPin() {
  static const states::AwaitingPin instance;
  return instance;
}
inline const AtmState& AtmState::ready() {
  static const states::Ready instance;
  return instance;
}
inline const AtmState& AtmState::outOfService() {
  static const states::OutOfService instance;
  return instance;
}
