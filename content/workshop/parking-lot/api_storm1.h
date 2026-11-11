#pragma once
// Change Storm 1 adds vehicle-based pricing. Everything from api.h still holds, and makeParkingLot()
// keeps its flat pricing. Only the lots made by makePricedParkingLot() use the new rules.
#include "api.h"

namespace park {

std::unique_ptr<ParkingLot> makePricedParkingLot();

}  // namespace park
