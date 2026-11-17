#pragma once
#include <memory>
#include <string>
#include <utility>

#include "cart_book.h"
#include "catalog.h"
#include "coupon_book.h"
#include "inventory.h"
#include "order_ledger.h"
#include "pricer.h"

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
    if (customer.empty() || quantity < 1 || quantity > cart::kMaxLineQuantity) return cart::Status::InvalidRequest;
    if (!catalog_.has(sku)) return cart::Status::UnknownProduct;
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
