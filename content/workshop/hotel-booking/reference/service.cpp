#include "hotel_impl.h"

std::unique_ptr<hotel::Hotel> hotel::makeHotel(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<HotelImpl>(std::move(clock), std::make_unique<NoRefund>());
}

std::unique_ptr<hotel::SeasonalHotel> hotel::makeSeasonalHotel(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<HotelImpl>(std::move(clock), std::make_unique<NoRefund>());
}

std::unique_ptr<hotel::RefundingHotel> hotel::makeRefundingHotel(std::shared_ptr<Clock> clock,
                                                                 std::vector<RefundTier> tiers) {
  if (clock == nullptr || !TieredRefund::areValid(tiers)) return nullptr;
  return std::make_unique<HotelImpl>(std::move(clock), std::make_unique<TieredRefund>(std::move(tiers)));
}
