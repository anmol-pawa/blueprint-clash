#pragma once
// Public API for the Order Book problem. The hidden tests only use what is declared here.
// You implement book::makeBook() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <vector>

namespace book {

enum class Side { Buy, Sell };

enum class Status {
  Ok,
  InvalidOrder,  // id, price or quantity outside the documented range
  DuplicateId,   // the id was used before, by an order in any state
  UnknownOrder,  // no RESTING order has that id
};

// One trade. The price is always the RESTING (maker) order's price, never the incoming order's limit.
struct Fill {
  int takerId;  // the incoming order
  int makerId;  // the order that was already resting
  int price;
  int quantity;
};
inline bool operator==(const Fill& a, const Fill& b) {
  return a.takerId == b.takerId && a.makerId == b.makerId && a.price == b.price && a.quantity == b.quantity;
}

constexpr int kMaxPrice = 100000;
constexpr int kMaxQuantity = 1000000;

// A limit-order book for ONE instrument, in integer ticks, matched by PRICE-TIME PRIORITY.
//
// ORDERS. An order has an id (1 or more), a side, a limit price (1..kMaxPrice) and a quantity (1..kMaxQuantity). Ids are
// never reused: an id that was ever accepted is a DuplicateId forever, even after the order was filled or cancelled.
//
// SUBMIT. submit() checks InvalidOrder first, then DuplicateId; a refused call changes nothing and leaves `fills` alone. On
// Ok, `fills` is replaced by the trades this order caused, in the order they happened (possibly none). A BUY order trades
// with resting SELL orders priced at or below its limit; a SELL order trades with resting BUY orders priced at or above it.
// It always takes the BEST price first (lowest sell, highest buy), and among orders at the same price the one that arrived
// FIRST. Each trade is min(remaining of both) at the resting order's price. Whatever is left of the incoming order then
// rests in the book at its limit, behind the orders already at that price. An order never trades with its own side.
//
// CANCEL. cancel(id) removes a resting order: UnknownOrder when no resting order has that id (never accepted, filled in
// full, or already cancelled). The orders behind it keep their places.
//
// QUERIES (never change anything). remaining() is the unfilled quantity of a RESTING order, UnknownOrder otherwise (the
// out-parameter is touched only on Ok). bestBid() and bestAsk() give the best price on that side and the TOTAL quantity
// resting at that price, and answer false when the side is empty. depthAt() is the total resting quantity of a side at one
// price (0 when none), and restingCount() is the number of resting orders.
class Book {
 public:
  virtual ~Book() = default;

  virtual Status submit(int id, Side side, int price, int quantity, std::vector<Fill>& fills) = 0;
  virtual Status cancel(int id) = 0;

  virtual Status remaining(int id, int& out) const = 0;
  virtual bool bestBid(int& price, int& quantity) const = 0;
  virtual bool bestAsk(int& price, int& quantity) const = 0;
  virtual int depthAt(Side side, int price) const = 0;
  virtual int restingCount() const = 0;
};

std::unique_ptr<Book> makeBook();

}  // namespace book
