#pragma once
#include <string>
#include <vector>

#include "menu.h"
#include "order_book.h"
#include "promos.h"

// Turns a request into an order: validates it in the documented order, prices it from the menu, applies a promo code
// if one is given, and records it. A failed request leaves nothing behind.
class OrderDesk {
 public:
  OrderDesk(const Menu& menu, const PromoBook& promos, OrderBook& book) : menu_(menu), promos_(promos), book_(book) {}

  food::PlaceResult place(const std::string& customer, const std::string& restaurant,
                          const std::vector<food::Line>& lines, const std::string* code) {
    if (!wellFormed(customer, lines) || (code != nullptr && code->empty())) {
      return food::PlaceResult{food::Status::InvalidRequest};
    }
    if (!menu_.knows(restaurant)) return food::PlaceResult{food::Status::UnknownRestaurant};
    food::Money cost = 0;
    for (const food::Line& line : lines) {
      const std::optional<food::Money> price = menu_.priceOf(restaurant, line.item);
      if (!price) return food::PlaceResult{food::Status::UnknownItem};
      cost += *price * line.quantity;
    }
    if (code != nullptr) {
      const PromoRule* rule = promos_.find(*code);
      if (rule == nullptr) return food::PlaceResult{food::Status::UnknownPromo};
      if (cost < rule->minimumFood) return food::PlaceResult{food::Status::PromoNotApplicable};
      cost -= rule->discount->amount(cost);
    }
    const food::Money total = cost + food::kDeliveryFee;
    const food::OrderId id = book_.open(Order{customer, restaurant, "", cost, total, food::OrderState::Placed});
    return food::PlaceResult{food::Status::Ok, id, total};
  }

 private:
  static bool wellFormed(const std::string& customer, const std::vector<food::Line>& lines) {
    if (customer.empty() || lines.empty()) return false;
    for (const food::Line& line : lines) {
      if (line.quantity < 1 || line.quantity > food::kMaxQuantity) return false;
    }
    return true;
  }

  const Menu& menu_;
  const PromoBook& promos_;
  OrderBook& book_;
};
