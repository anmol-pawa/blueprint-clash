#include "service_impl.h"

namespace {
bool usable(const std::shared_ptr<booking::Clock>& clock, long long holdTicks) { return clock != nullptr && holdTicks > 0; }
}  // namespace

std::unique_ptr<booking::BookingService> booking::makeService(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (!usable(clock, holdTicks)) return nullptr;
  return std::make_unique<ServiceImpl>(std::move(clock), holdTicks);
}

std::unique_ptr<booking::ExtendableService> booking::makeExtendableService(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (!usable(clock, holdTicks)) return nullptr;
  return std::make_unique<ServiceImpl>(std::move(clock), holdTicks);
}

std::unique_ptr<booking::SeatingService> booking::makeSeatingService(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (!usable(clock, holdTicks)) return nullptr;
  return std::make_unique<ServiceImpl>(std::move(clock), holdTicks);
}
