#pragma once
// Change Storm 2 limits what a kitchen can cook at once. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace food {

// Every restaurant has `slots` cooking places (a value below 1 counts as 1). An order occupies one from the moment it is Accepted
// until it leaves Accepted (it becomes Ready, or the customer cancels it). accept() on a restaurant whose places are
// all taken is KitchenFull and changes nothing: the order stays Placed and can be accepted later. The checks of
// accept() are UnknownOrder, WrongParty, InvalidState, then KitchenFull. Promo codes work as in Storm 1.
std::unique_ptr<PromoFood> makeBusyKitchens(const std::vector<Promo>& promos, int slots);

}  // namespace food
