#pragma once
// Public API for the Shopping cart problem. The hidden tests only use what is declared here.
// You implement cart::makeShop() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>

namespace cart {

using Money = long long;  // whole cents
using OrderId = long long;
constexpr OrderId kNoOrder = 0;  // ids that are issued are always positive and never reused

constexpr Money kMaxPrice = 1000000;  // cents, per unit
constexpr int kMaxStock = 1000000;
constexpr int kMaxLineQuantity = 99;  // most units of one product in one cart

enum class Status {
  Ok,
  InvalidRequest,   // empty customer, or a quantity that is not allowed
  UnknownProduct,   // no such sku
  NotInCart,        // the cart has no line for that sku
  EmptyCart,        // nothing to check out
  OutOfStock,       // some line wants more units than the shelf has
  UnknownOrder,     // never issued, or already cancelled
  WrongCustomer,    // the order belongs to someone else
};

struct CheckoutResult {
  Status status = Status::Ok;
  OrderId id = kNoOrder;  // kNoOrder unless status is Ok
  Money total = 0;        // what the customer pays; 0 unless status is Ok
};

// A shop sells products from a shelf (stock) into carts, one cart per customer. A cart is only a wish list: it does
// NOT hold stock. Stock moves when the customer checks out, and then every line moves or none does.
class Shop {
 public:
  virtual ~Shop() = default;

  // Adds a product. Returns false, changing nothing, when the sku is empty or taken, the price is outside
  // 1..kMaxPrice or the stock is outside 0..kMaxStock.
  virtual bool addProduct(const std::string& sku, Money unitPrice, int stock) = 0;

  // Adds `quantity` units of the product to the customer's cart (the first call creates the cart). Checks, in order:
  // InvalidRequest (empty customer, quantity outside 1..kMaxLineQuantity), UnknownProduct, InvalidRequest again if the
  // line would then hold more than kMaxLineQuantity units. A failed call changes nothing. Stock is not looked at.
  virtual Status addToCart(const std::string& customer, const std::string& sku, int quantity) = 0;

  // Takes `quantity` units off the line. Checks, in order: InvalidRequest (empty customer, quantity < 1), NotInCart.
  // Taking as many as the line holds or more removes the line.
  virtual Status removeFromCart(const std::string& customer, const std::string& sku, int quantity) = 0;

  // Unit prices times quantities for the cart as it is now; 0 for an empty or unknown cart.
  virtual Money subtotal(const std::string& customer) const = 0;

  // Units on the shelf; empty for an unknown sku.
  virtual std::optional<int> stock(const std::string& sku) const = 0;

  // Buys everything in the cart. Checks, in order: InvalidRequest (empty customer), EmptyCart, OutOfStock (some line
  // asks for more than the shelf has). On success the stock of every line goes down, the cart is emptied, the order is
  // recorded with the total charged and gets a new id. On any failure nothing changes, the cart included.
  virtual CheckoutResult checkout(const std::string& customer) = 0;

  // Puts every unit of the order back on the shelf and spends the id. Failures, in order: UnknownOrder (never issued
  // or already cancelled), WrongCustomer. A failed call changes nothing.
  virtual Status cancelOrder(OrderId id, const std::string& customer) = 0;
};

std::unique_ptr<Shop> makeShop();

}  // namespace cart
