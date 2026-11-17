#pragma once
// Change Storm 1 adds promo codes. Everything from api.h still holds.
#include "api.h"

namespace food {

enum class PromoKind { PercentOff, AmountOff };

struct Promo {
  std::string code;
  PromoKind kind = PromoKind::PercentOff;
  int value = 0;           // PercentOff: 1..100. AmountOff: cents, at least 1.
  Money minimumFood = 0;   // the code only applies when the food (before the discount) is at least this much
};

class PromoFood : public Food {
 public:
  // Like place(), with a code. Checks in order: InvalidRequest (as for place, or an empty code), UnknownRestaurant,
  // UnknownItem, UnknownPromo, PromoNotApplicable (food below the code's minimum). The discount comes off the FOOD
  // only, never off kDeliveryFee: PercentOff takes food * value / 100 rounded down, AmountOff takes
  // min(value, food). total = food - discount + kDeliveryFee, fixed now. From then on, "the food" for the
  // cancellation fee is the DISCOUNTED food: what the customer would actually have paid the restaurant.
  virtual PlaceResult placeWithCode(const std::string& customer, const std::string& restaurant,
                                    const std::vector<Line>& lines, const std::string& code) = 0;
};

// Promo codes are fixed when the system is built. Invalid or repeated codes in the list are ignored (the first
// valid one wins). makeFood() has no codes and place() never discounts.
std::unique_ptr<PromoFood> makePromoFood(const std::vector<Promo>& promos);

}  // namespace food
