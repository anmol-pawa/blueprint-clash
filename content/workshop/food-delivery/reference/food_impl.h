#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "courier_pool.h"
#include "fees.h"
#include "kitchen_load.h"
#include "menu.h"
#include "order_book.h"
#include "order_desk.h"
#include "promos.h"

// The public face. Each call is a few lines: ask the order book whether the move is legal, make it, and tell the
// collaborator that cares (couriers, kitchen load). Prices, fees, legal moves and who is free are decided elsewhere.
class FoodImpl : public food::PromoFood {
 public:
  FoodImpl(PromoBook promos, int kitchenSlots, std::unique_ptr<CancellationFee> fee)
      : promos_(std::move(promos)), fee_(std::move(fee)), couriers_(book_), kitchens_(book_, kitchenSlots), desk_(menu_, promos_, book_) {
    // The kitchen listens first, so it is up to date before any listener added by the caller runs.
    book_.subscribe([this](food::OrderId id, food::OrderState from, food::OrderState to) { kitchens_.observe(id, from, to); });
  }

  bool addRestaurant(const std::string& restaurant, const std::vector<food::MenuItem>& menu) override {
    return menu_.add(restaurant, menu);
  }

  bool registerCourier(const std::string& courier) override { return couriers_.enroll(courier); }

  void subscribe(food::Listener listener) override { book_.subscribe(std::move(listener)); }

  food::PlaceResult place(const std::string& customer, const std::string& restaurant,
                          const std::vector<food::Line>& lines) override {
    return desk_.place(customer, restaurant, lines, nullptr);
  }

  food::PlaceResult placeWithCode(const std::string& customer, const std::string& restaurant,
                                  const std::vector<food::Line>& lines, const std::string& code) override {
    return desk_.place(customer, restaurant, lines, &code);
  }

  food::Status accept(food::OrderId id, const std::string& restaurant) override {
    const food::Status status = book_.check(id, Role::Restaurant, restaurant, food::OrderState::Accepted);
    if (status != food::Status::Ok) return status;
    if (!kitchens_.hasRoom(restaurant)) return food::Status::KitchenFull;
    book_.move(id, food::OrderState::Accepted);
    return food::Status::Ok;
  }

  food::Status reject(food::OrderId id, const std::string& restaurant) override {
    return book_.advance(id, Role::Restaurant, restaurant, food::OrderState::Rejected);
  }

  food::Status ready(food::OrderId id, const std::string& restaurant) override {
    const food::Status status = book_.advance(id, Role::Restaurant, restaurant, food::OrderState::Ready);
    if (status == food::Status::Ok) couriers_.orderReady(id);
    return status;
  }

  food::Status pickUp(food::OrderId id, const std::string& courier) override {
    return book_.advance(id, Role::Courier, courier, food::OrderState::PickedUp);
  }

  food::Status deliver(food::OrderId id, const std::string& courier) override {
    const food::Status status = book_.advance(id, Role::Courier, courier, food::OrderState::Delivered);
    if (status == food::Status::Ok) couriers_.orderDelivered(id);
    return status;
  }

  food::CancelResult cancel(food::OrderId id, const std::string& customer) override {
    const food::Status status = book_.check(id, Role::Customer, customer, food::OrderState::Cancelled);
    if (status != food::Status::Ok) return food::CancelResult{status};
    const Order& order = *book_.find(id);
    const food::Money fee = fee_->feeFor(order.state, order.food);
    book_.move(id, food::OrderState::Cancelled);
    couriers_.orderCancelled(id);
    return food::CancelResult{food::Status::Ok, fee};
  }

  food::OrderInfo order(food::OrderId id) const override {
    const Order* found = book_.find(id);
    if (found == nullptr) return food::OrderInfo{food::Status::UnknownOrder};
    return food::OrderInfo{food::Status::Ok, found->state, found->customer, found->restaurant, found->courier, found->total};
  }

 private:
  Menu menu_;
  PromoBook promos_;
  std::unique_ptr<CancellationFee> fee_;
  OrderBook book_;
  CourierPool couriers_;
  KitchenLoad kitchens_;
  OrderDesk desk_;
};
