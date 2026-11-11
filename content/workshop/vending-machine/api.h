#pragma once
// Public API for the Vending machine problem. The hidden tests only use what is declared here.
// You implement vend::makeVendingMachine() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace vend {

enum class Status {
  Ok,
  DuplicateSlot,
  InvalidArgument,
  UnknownSlot,
  SoldOut,
  InvalidCoin,
  InsufficientFunds,
  InsertCoinFirst,
  OutOfService
};

struct Sale {
  Status status;
  std::string item;       // name of the dispensed product; empty unless status == Ok
  long long changeCents;  // 0 unless status == Ok
};

class VendingMachine {
 public:
  virtual ~VendingMachine() = default;

  // Staff set up a slot: a product name, a price in cents and a starting quantity.
  virtual Status addSlot(const std::string& slotId, const std::string& name, long long priceCents, int quantity) = 0;
  // Staff add more units to an existing slot.
  virtual Status restock(const std::string& slotId, int quantity) = 0;

  // A customer inserts one coin worth `cents`.
  virtual Status insertCoin(int cents) = 0;
  // The customer presses a slot button.
  virtual Sale select(const std::string& slotId) = 0;
  // The customer presses "cancel"; returns the cents handed back (0 if there was nothing to give back).
  virtual long long cancel() = 0;

  // Money inserted and not yet spent or refunded.
  virtual long long creditCents() const = 0;
  // Units left in the slot; -1 if the slot does not exist.
  virtual int stockOf(const std::string& slotId) const = 0;
};

std::unique_ptr<VendingMachine> makeVendingMachine();

}  // namespace vend
