#pragma once
#include "machine_state.h"

// Waiting for money. Nothing to sell, nothing to refund.
class IdleState : public MachineState {
 public:
  vend::Status insertCoin(MachineContext& m, int cents) const override {
    if (!Till::isValidCoin(cents)) return vend::Status::InvalidCoin;
    m.till().insert(cents);
    m.becomeHasCredit();
    return vend::Status::Ok;
  }
  vend::Sale select(MachineContext&, const std::string&) const override {
    return {vend::Status::InsertCoinFirst, "", 0};
  }
  long long cancel(MachineContext&) const override { return 0; }
};

// There is credit: more coins, a purchase or a refund can happen.
class HasCreditState : public MachineState {
 public:
  vend::Status insertCoin(MachineContext& m, int cents) const override {
    if (!Till::isValidCoin(cents)) return vend::Status::InvalidCoin;
    m.till().insert(cents);
    return vend::Status::Ok;
  }

  // Validate first, mutate last: every refusal returns before anything changes.
  vend::Sale select(MachineContext& m, const std::string& slotId) const override {
    const SlotCatalog::Slot* slot = m.catalog().find(slotId);
    if (slot == nullptr) return {vend::Status::UnknownSlot, "", 0};
    if (slot->quantity == 0) return {vend::Status::SoldOut, "", 0};
    if (!m.till().covers(slot->priceCents)) return {vend::Status::InsufficientFunds, "", 0};

    std::string name = slot->name;  // copy before the catalog changes
    long long change = m.till().takePriceAndRefundChange(slot->priceCents);
    m.catalog().removeOne(slotId);
    m.becomeIdle();
    return {vend::Status::Ok, name, change};
  }

  long long cancel(MachineContext& m) const override {
    long long refunded = m.till().refundAll();
    m.becomeIdle();
    return refunded;
  }
};

// Storm 1: out of service. A new class; Idle and HasCredit are not edited.
class MaintenanceState : public MachineState {
 public:
  vend::Status insertCoin(MachineContext&, int) const override { return vend::Status::OutOfService; }
  vend::Sale select(MachineContext&, const std::string&) const override {
    return {vend::Status::OutOfService, "", 0};
  }
  long long cancel(MachineContext&) const override { return 0; }
};
