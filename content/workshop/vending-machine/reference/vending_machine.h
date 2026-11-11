#pragma once
#include "machine_core.h"

// The public face: delegates every customer operation to the current state.
class VendingMachineImpl : public vend::ServiceableMachine {
 public:
  vend::Status addSlot(const std::string& slotId, const std::string& name, long long priceCents, int quantity) override {
    return core_.catalog().add(slotId, name, priceCents, quantity);
  }
  vend::Status restock(const std::string& slotId, int quantity) override {
    return core_.catalog().restock(slotId, quantity);
  }

  vend::Status insertCoin(int cents) override { return core_.state().insertCoin(core_, cents); }
  vend::Sale select(const std::string& slotId) override { return core_.state().select(core_, slotId); }
  long long cancel() override { return core_.state().cancel(core_); }

  long long creditCents() const override { return core_.till().credit(); }
  int stockOf(const std::string& slotId) const override { return core_.catalog().stockOf(slotId); }

  // Refund first, then switch: nobody's money is trapped by a mode change.
  long long enterMaintenance() override {
    long long refunded = core_.till().refundAll();
    core_.becomeMaintenance();
    return refunded;
  }
  void leaveMaintenance() override {
    if (core_.inMaintenance()) core_.becomeIdle();
  }
  bool inMaintenance() const override { return core_.inMaintenance(); }

 private:
  MachineCore core_;
};
