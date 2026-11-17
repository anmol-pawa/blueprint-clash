#include "booking_impl.h"

std::unique_ptr<tix::Booking> tix::makeBooking(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (clock == nullptr || holdTicks <= 0) return nullptr;
  return std::make_unique<BookingImpl>(std::move(clock), holdTicks, std::make_unique<NoLimit>());
}

std::unique_ptr<tix::SmartBooking> tix::makeSmartBooking(std::shared_ptr<Clock> clock, long long holdTicks) {
  if (clock == nullptr || holdTicks <= 0) return nullptr;
  return std::make_unique<BookingImpl>(std::move(clock), holdTicks, std::make_unique<NoLimit>());
}

std::unique_ptr<tix::LimitedBooking> tix::makeLimitedBooking(std::shared_ptr<Clock> clock, long long holdTicks,
                                                             int maxSeatsPerUser) {
  if (clock == nullptr || holdTicks <= 0 || maxSeatsPerUser < 1) return nullptr;
  return std::make_unique<BookingImpl>(std::move(clock), holdTicks, std::make_unique<PerUserCap>(maxSeatsPerUser));
}
