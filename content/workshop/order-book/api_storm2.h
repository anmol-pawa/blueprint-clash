#pragma once
// Change Storm 2: amending a resting order.
#include "api_storm1.h"

namespace book {

class AmendBook : public TimedBook {
 public:
  // Changes a RESTING order's price and quantity (the new quantity is the NEW TOTAL REMAINING, 1..kMaxQuantity; the side
  // and the id stay). Checks: InvalidOrder (price or quantity out of range), then UnknownOrder. A refused call changes
  // nothing and leaves `fills` alone.
  //  - Same price and a quantity that is not larger than the remaining: the order keeps its place in the queue.
  //  - Anything else (a new price, or more quantity): the order loses its place. It leaves the book and comes back as a new
  //    arrival with its old id (so it queues last at its price) and trades at once if the new price crosses; `fills` holds
  //    those trades (taker = this id) and the rest rests. The order is Gtc. On Ok `fills` is replaced (empty when the order kept its place).
  virtual Status amend(int id, int newPrice, int newQuantity, std::vector<Fill>& fills) = 0;
};

std::unique_ptr<AmendBook> makeAmendBook();

}  // namespace book
