// No 'waiting for a coin' stage: a press with no credit falls through to the price check.
#include <map>

#include "api_storm1.h"

namespace {
using namespace vend;

// One class, a credit number and (for the storm) a boolean flag.
class Machine : public ServiceableMachine {
 public:
  Status addSlot(const std::string& id, const std::string& name, long long price, int qty) override {
    if (slots_.count(id)) return Status::DuplicateSlot;
    if (price <= 0 || qty < 0) return Status::InvalidArgument;
    slots_[id] = {name, price, qty};
    return Status::Ok;
  }
  Status restock(const std::string& id, int qty) override {
    if (qty <= 0) return Status::InvalidArgument;
    auto it = slots_.find(id);
    if (it == slots_.end()) return Status::UnknownSlot;
    it->second.qty += qty;
    return Status::Ok;
  }
  Status insertCoin(int cents) override {
    if (maintenance_) return Status::OutOfService;
    if (cents != 5 && cents != 10 && cents != 25 && cents != 100) return Status::InvalidCoin;
    credit_ += cents;
    return Status::Ok;
  }
  Sale select(const std::string& id) override {
    if (maintenance_) return {Status::OutOfService, "", 0};
    auto it = slots_.find(id);
    if (it == slots_.end()) return {Status::UnknownSlot, "", 0};
    if (it->second.qty == 0) return {Status::SoldOut, "", 0};
    if (credit_ < it->second.price) return {Status::InsufficientFunds, "", 0};
    it->second.qty--;
    long long change = credit_ - it->second.price;
    credit_ = 0;
    return {Status::Ok, it->second.name, change};
  }
  long long cancel() override {
    long long c = credit_;
    credit_ = 0;
    return c;
  }
  long long creditCents() const override { return credit_; }
  int stockOf(const std::string& id) const override {
    auto it = slots_.find(id);
    return it == slots_.end() ? -1 : it->second.qty;
  }
  long long enterMaintenance() override {
    long long c = credit_;
    credit_ = 0;
    maintenance_ = true;
    return c;
  }
  void leaveMaintenance() override { maintenance_ = false; }
  bool inMaintenance() const override { return maintenance_; }

 private:
  struct Slot { std::string name; long long price; int qty; };
  std::map<std::string, Slot> slots_;
  long long credit_ = 0;
  bool maintenance_ = false;
};
}  // namespace

std::unique_ptr<vend::VendingMachine> vend::makeVendingMachine() { return std::make_unique<Machine>(); }
std::unique_ptr<vend::ServiceableMachine> vend::makeServiceableMachine() { return std::make_unique<Machine>(); }
