// MUTATION: The product lookup runs before the quantity is validated, so a nonsense quantity on an unknown product reports the other error
#include <algorithm>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"

// A cart's contents: sku -> units. Plain data; the rules about it live in CartBook.
using Lines = std::map<std::string, int>;

// A cart priced line by line, before any coupon. Plain data; Pricer builds it.
struct Basket {
  std::map<std::string, cart::Money> lineTotals;
  cart::Money subtotal = 0;
};

// What each product costs. The only place that knows a unit price.
class Catalog {
 public:
  bool add(const std::string& sku, cart::Money unitPrice) { return prices_.emplace(sku, unitPrice).second; }
  bool has(const std::string& sku) const { return prices_.count(sku) > 0; }
  cart::Money price(const std::string& sku) const { return prices_.at(sku); }

 private:
  std::map<std::string, cart::Money> prices_;
};

// Units on the shelf. Moving stock for a whole set of lines is all or nothing: canTake() is asked first and take()
// then cannot fail.
class Inventory {
 public:
  void setStock(const std::string& sku, int units) { units_[sku] = units; }

  std::optional<int> stock(const std::string& sku) const {
    const auto it = units_.find(sku);
    if (it == units_.end()) return std::nullopt;
    return it->second;
  }

  bool canTake(const Lines& lines) const {
    for (const auto& [sku, wanted] : lines) {
      if (wanted > units_.at(sku)) return false;
    }
    return true;
  }

  void take(const Lines& lines) {
    for (const auto& [sku, wanted] : lines) units_.at(sku) -= wanted;
  }

  void give(const Lines& lines) {
    for (const auto& [sku, returned] : lines) units_.at(sku) += returned;
  }

 private:
  std::map<std::string, int> units_;
};

// One wish list per customer. It holds no stock and knows no prices.
class CartBook {
 public:
  void add(const std::string& customer, const std::string& sku, int quantity) { carts_[customer][sku] += quantity; }

  int quantityOf(const std::string& customer, const std::string& sku) const {
    const auto cart = carts_.find(customer);
    if (cart == carts_.end()) return 0;
    const auto line = cart->second.find(sku);
    return line == cart->second.end() ? 0 : line->second;
  }

  // Takes units off a line; the line goes away when nothing is left, and so does an empty cart.
  void remove(const std::string& customer, const std::string& sku, int quantity) {
    auto cart = carts_.find(customer);
    if (cart == carts_.end()) return;
    auto line = cart->second.find(sku);
    if (line == cart->second.end()) return;
    if (quantity >= line->second) cart->second.erase(line);
    else line->second -= quantity;
    if (cart->second.empty()) carts_.erase(cart);
  }

  Lines lines(const std::string& customer) const {
    const auto cart = carts_.find(customer);
    return cart == carts_.end() ? Lines{} : cart->second;
  }

  void clear(const std::string& customer) { carts_.erase(customer); }

 private:
  std::map<std::string, Lines> carts_;
};

// What was bought, by whom and for how much. Plain data.
struct Order {
  std::string customer;
  Lines lines;
  cart::Money total = 0;
};

// Issues order ids and spends them on cancel. Ids are positive and never reused.
class OrderLedger {
 public:
  cart::OrderId record(Order order) {
    orders_.emplace(++lastId_, std::move(order));
    return lastId_;
  }

  const Order* find(cart::OrderId id) const {
    const auto it = orders_.find(id);
    return it == orders_.end() ? nullptr : &it->second;
  }

  void spend(cart::OrderId id) { orders_.erase(id); }

 private:
  cart::OrderId lastId_ = cart::kNoOrder;
  std::map<cart::OrderId, Order> orders_;
};

// One way a coupon takes money off. `running` is what is left to pay after earlier coupons; a discount never takes
// more than that. Open for new kinds of discount (a new subclass); nothing that uses a Discount changes.
class Discount {
 public:
  virtual ~Discount() = default;
  virtual cart::Money reduction(const Basket& basket, cart::Money running) const = 0;
};

class PercentOffCart : public Discount {
 public:
  explicit PercentOffCart(long long percent) : percent_(percent) {}
  cart::Money reduction(const Basket&, cart::Money running) const override { return running * percent_ / 100; }

 private:
  long long percent_;
};

class AmountOffCart : public Discount {
 public:
  explicit AmountOffCart(cart::Money amount) : amount_(amount) {}
  cart::Money reduction(const Basket&, cart::Money running) const override { return std::min(amount_, running); }

 private:
  cart::Money amount_;
};

class PercentOffSku : public Discount {
 public:
  PercentOffSku(std::string sku, long long percent) : sku_(std::move(sku)), percent_(percent) {}
  cart::Money reduction(const Basket& basket, cart::Money running) const override {
    const auto line = basket.lineTotals.find(sku_);
    if (line == basket.lineTotals.end()) return 0;
    return std::min(line->second * percent_ / 100, running);
  }

 private:
  std::string sku_;
  long long percent_;
};

// A Decorator that adds the eligibility rule "the cart subtotal is at least X" to any other discount. The rule is
// written once here instead of inside every kind of discount.
class MinimumSpend : public Discount {
 public:
  MinimumSpend(std::unique_ptr<Discount> inner, cart::Money minimum) : inner_(std::move(inner)), minimum_(minimum) {}
  cart::Money reduction(const Basket& basket, cart::Money running) const override {
    if (basket.subtotal < minimum_) return 0;
    return inner_->reduction(basket, running);
  }

 private:
  std::unique_ptr<Discount> inner_;
  cart::Money minimum_;
};

// One row per kind of coupon: how to build its discount from a rule, or nullptr when the rule is not valid for it. A
// new kind of coupon is a new Discount subclass plus one row here; nothing that prices a cart changes.
using DiscountBuilder = std::unique_ptr<Discount> (*)(const cart::CouponRule&, const Catalog&);

inline std::unique_ptr<Discount> buildPercentOffCart(const cart::CouponRule& rule, const Catalog&) {
  if (rule.value < 1 || rule.value > 100) return nullptr;
  return std::make_unique<PercentOffCart>(rule.value);
}

inline std::unique_ptr<Discount> buildAmountOffCart(const cart::CouponRule& rule, const Catalog&) {
  if (rule.value < 1 || rule.value > cart::kMaxPrice) return nullptr;
  return std::make_unique<AmountOffCart>(rule.value);
}

inline std::unique_ptr<Discount> buildPercentOffSku(const cart::CouponRule& rule, const Catalog& catalog) {
  if (rule.value < 1 || rule.value > 100 || !catalog.has(rule.sku)) return nullptr;
  return std::make_unique<PercentOffSku>(rule.sku, rule.value);
}

// Builds the discount a rule describes, wrapped in the minimum-spend rule when it has one, or nullptr when invalid.
inline std::unique_ptr<Discount> makeDiscount(const cart::CouponRule& rule, const Catalog& catalog) {
  static const std::map<cart::CouponRule::Kind, DiscountBuilder> builders = {
      {cart::CouponRule::Kind::PercentOffCart, &buildPercentOffCart},
      {cart::CouponRule::Kind::AmountOffCart, &buildAmountOffCart},
      {cart::CouponRule::Kind::PercentOffSku, &buildPercentOffSku},
  };
  const auto builder = builders.find(rule.kind);
  if (rule.minSubtotal < 0 || builder == builders.end()) return nullptr;
  std::unique_ptr<Discount> discount = builder->second(rule, catalog);
  if (discount == nullptr || rule.minSubtotal == 0) return discount;
  return std::make_unique<MinimumSpend>(std::move(discount), rule.minSubtotal);
}

// Turns a cart into money: prices the lines, then folds the attached discounts over the result in order. It owns the
// arithmetic; it knows nothing about customers, stock or where coupons are kept.
class Pricer {
 public:
  Basket price(const Catalog& catalog, const Lines& lines) const {
    Basket basket;
    for (const auto& [sku, quantity] : lines) {
      const cart::Money lineTotal = catalog.price(sku) * quantity;
      basket.lineTotals[sku] = lineTotal;
      basket.subtotal += lineTotal;
    }
    return basket;
  }

  cart::Money total(const Basket& basket, const std::vector<const Discount*>& discounts) const {
    cart::Money running = basket.subtotal;
    for (const Discount* discount : discounts) running -= discount->reduction(basket, running);
    return running;
  }
};

// Which coupons exist and which are attached to whose cart, in the order they were attached.
class CouponBook {
 public:
  bool add(const std::string& code, std::unique_ptr<Discount> discount, bool stackable) {
    if (code.empty() || discount == nullptr) return false;
    return byCode_.emplace(code, Entry{std::move(discount), stackable}).second;
  }

  bool has(const std::string& code) const { return byCode_.count(code) > 0; }

  // Precondition: has(code). An ordinary coupon replaces everything; a stackable one joins the stackable ones and
  // pushes out an ordinary one.
  void apply(const std::string& customer, const std::string& code) {
    auto& attached = attached_[customer];
    if (!byCode_.at(code).stackable) {
      attached.assign(1, code);
      return;
    }
    attached.erase(std::remove_if(attached.begin(), attached.end(),
                                  [this](const std::string& c) { return !byCode_.at(c).stackable; }),
                   attached.end());
    if (std::find(attached.begin(), attached.end(), code) == attached.end()) attached.push_back(code);
  }

  void clear(const std::string& customer) { attached_.erase(customer); }

  std::vector<const Discount*> attachedTo(const std::string& customer) const {
    std::vector<const Discount*> out;
    const auto it = attached_.find(customer);
    if (it == attached_.end()) return out;
    for (const std::string& code : it->second) out.push_back(byCode_.at(code).discount.get());
    return out;
  }

 private:
  struct Entry {
    std::unique_ptr<Discount> discount;
    bool stackable;
  };
  std::map<std::string, Entry> byCode_;
  std::map<std::string, std::vector<std::string>> attached_;
};

namespace {
inline cart::CheckoutResult refuseCheckout(cart::Status status) { return cart::CheckoutResult{status, cart::kNoOrder, 0}; }

inline bool registerCoupon(CouponBook& coupons, const Catalog& catalog, const std::string& code,
                           const cart::CouponRule& rule, bool stackable) {
  return coupons.add(code, makeDiscount(rule, catalog), stackable);
}
}  // namespace

// The public face. It validates a request in the documented order and sequences the collaborators. It holds no rule
// of its own about prices, stock or discounts.
class ShopImpl : public cart::StackingShop {
 public:
  bool addProduct(const std::string& sku, cart::Money unitPrice, int stock) override {
    if (sku.empty() || unitPrice < 1 || unitPrice > cart::kMaxPrice) return false;
    if (stock < 0 || stock > cart::kMaxStock) return false;
    if (!catalog_.add(sku, unitPrice)) return false;
    inventory_.setStock(sku, stock);
    return true;
  }

  cart::Status addToCart(const std::string& customer, const std::string& sku, int quantity) override {
    if (!catalog_.has(sku)) return cart::Status::UnknownProduct;
    if (customer.empty() || quantity < 1 || quantity > cart::kMaxLineQuantity) return cart::Status::InvalidRequest;
    if (carts_.quantityOf(customer, sku) + quantity > cart::kMaxLineQuantity) return cart::Status::InvalidRequest;
    carts_.add(customer, sku, quantity);
    return cart::Status::Ok;
  }

  cart::Status removeFromCart(const std::string& customer, const std::string& sku, int quantity) override {
    if (customer.empty() || quantity < 1) return cart::Status::InvalidRequest;
    if (carts_.quantityOf(customer, sku) == 0) return cart::Status::NotInCart;
    carts_.remove(customer, sku, quantity);
    return cart::Status::Ok;
  }

  cart::Money subtotal(const std::string& customer) const override {
    return pricer_.price(catalog_, carts_.lines(customer)).subtotal;
  }

  std::optional<int> stock(const std::string& sku) const override { return inventory_.stock(sku); }

  cart::CheckoutResult checkout(const std::string& customer) override {
    if (customer.empty()) return refuseCheckout(cart::Status::InvalidRequest);
    const Lines lines = carts_.lines(customer);
    if (lines.empty()) return refuseCheckout(cart::Status::EmptyCart);
    if (!inventory_.canTake(lines)) return refuseCheckout(cart::Status::OutOfStock);
    const cart::Money charged = total(customer);
    inventory_.take(lines);
    carts_.clear(customer);
    coupons_.clear(customer);
    const cart::OrderId id = orders_.record(Order{customer, lines, charged});
    return cart::CheckoutResult{cart::Status::Ok, id, charged};
  }

  cart::Status cancelOrder(cart::OrderId id, const std::string& customer) override {
    const Order* order = orders_.find(id);
    if (order == nullptr) return cart::Status::UnknownOrder;
    if (order->customer != customer) return cart::Status::WrongCustomer;
    inventory_.give(order->lines);
    orders_.spend(id);
    return cart::Status::Ok;
  }

  bool addCoupon(const std::string& code, const cart::CouponRule& rule) override {
    return registerCoupon(coupons_, catalog_, code, rule, false);
  }

  bool addStackableCoupon(const std::string& code, const cart::CouponRule& rule) override {
    return registerCoupon(coupons_, catalog_, code, rule, true);
  }

  cart::CouponStatus applyCoupon(const std::string& customer, const std::string& code) override {
    if (customer.empty()) return cart::CouponStatus::InvalidRequest;
    if (!coupons_.has(code)) return cart::CouponStatus::UnknownCoupon;
    coupons_.apply(customer, code);
    return cart::CouponStatus::Ok;
  }

  void clearCoupons(const std::string& customer) override { coupons_.clear(customer); }

  cart::Money total(const std::string& customer) const override {
    const Basket basket = pricer_.price(catalog_, carts_.lines(customer));
    return pricer_.total(basket, coupons_.attachedTo(customer));
  }

 private:
  Catalog catalog_;
  Inventory inventory_;
  CartBook carts_;
  OrderLedger orders_;
  CouponBook coupons_;
  Pricer pricer_;
};

std::unique_ptr<cart::Shop> cart::makeShop() { return std::make_unique<ShopImpl>(); }

std::unique_ptr<cart::CouponShop> cart::makeCouponShop() { return std::make_unique<ShopImpl>(); }

std::unique_ptr<cart::StackingShop> cart::makeStackingShop() { return std::make_unique<ShopImpl>(); }
