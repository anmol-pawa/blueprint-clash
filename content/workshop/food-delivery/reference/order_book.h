#pragma once
#include <map>
#include <set>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

// One order, as a record. It has no behaviour: which moves are legal is OrderLifecycle's decision.
struct Order {
  std::string customer;
  std::string restaurant;
  std::string courier;  // empty until assigned
  food::Money food;     // what the food costs after any discount; the base of the cancellation fee
  food::Money total;
  food::OrderState state;
};

// Who is asking for a move.
enum class Role { Restaurant, Courier, Customer };

// The state machine, written once as a table of legal moves.
class OrderLifecycle {
 public:
  static bool allows(food::OrderState from, food::OrderState to) {
    using food::OrderState;
    static const std::set<std::pair<OrderState, OrderState>> moves = {
        {OrderState::Placed, OrderState::Accepted},    {OrderState::Placed, OrderState::Rejected},
        {OrderState::Placed, OrderState::Cancelled},   {OrderState::Accepted, OrderState::Ready},
        {OrderState::Accepted, OrderState::Cancelled}, {OrderState::Ready, OrderState::PickedUp},
        {OrderState::Ready, OrderState::Cancelled},    {OrderState::PickedUp, OrderState::Delivered},
    };
    return moves.count({from, to}) > 0;
  }
};

// Keeps every order for good, issues ids, and is the ONE place where an order changes state: every change goes
// through move(), which tells the listeners (the Observer subject of the design).
class OrderBook {
 public:
  food::OrderId open(Order order) {
    const food::OrderId id = nextId_++;
    orders_.emplace(id, std::move(order));
    return id;
  }

  const Order* find(food::OrderId id) const {
    const auto found = orders_.find(id);
    return found == orders_.end() ? nullptr : &found->second;
  }

  void subscribe(food::Listener listener) { listeners_.push_back(std::move(listener)); }

  // The checks every lifecycle call shares, in the documented order. Changes nothing.
  food::Status check(food::OrderId id, Role role, const std::string& who, food::OrderState to) const {
    const Order* order = find(id);
    if (order == nullptr) return food::Status::UnknownOrder;
    if (!isParty(*order, role, who)) return food::Status::WrongParty;
    if (!OrderLifecycle::allows(order->state, to)) return food::Status::InvalidState;
    return food::Status::Ok;
  }

  void move(food::OrderId id, food::OrderState to) {
    Order& order = orders_.at(id);
    const food::OrderState from = order.state;
    order.state = to;
    for (const food::Listener& listener : listeners_) listener(id, from, to);
  }

  food::Status advance(food::OrderId id, Role role, const std::string& who, food::OrderState to) {
    const food::Status status = check(id, role, who, to);
    if (status == food::Status::Ok) move(id, to);
    return status;
  }

  void assign(food::OrderId id, const std::string& courier) { orders_.at(id).courier = courier; }

 private:
  static bool isParty(const Order& order, Role role, const std::string& who) {
    switch (role) {
      case Role::Restaurant: return order.restaurant == who;
      case Role::Customer: return order.customer == who;
      case Role::Courier: return !order.courier.empty() && order.courier == who;
    }
    return false;
  }

  food::OrderId nextId_ = 1;
  std::map<food::OrderId, Order> orders_;
  std::vector<food::Listener> listeners_;
};
