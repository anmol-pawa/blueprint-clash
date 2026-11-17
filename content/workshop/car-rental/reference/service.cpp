#include "rentals_impl.h"

std::unique_ptr<rental::Rentals> rental::makeRentals(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<RentalsImpl>(std::move(clock), std::make_unique<LowestPlate>(), std::make_unique<NoLateFee>());
}

std::unique_ptr<rental::Rentals> rental::makeLateFeeRentals(std::shared_ptr<Clock> clock, int graceHours,
                                                            int percentPerHour) {
  if (clock == nullptr || !GraceThenPercent::isValid(graceHours, percentPerHour)) return nullptr;
  return std::make_unique<RentalsImpl>(std::move(clock), std::make_unique<LowestPlate>(),
                                       std::make_unique<GraceThenPercent>(graceHours, percentPerHour));
}

std::unique_ptr<rental::Rentals> rental::makeRotatingRentals(std::shared_ptr<Clock> clock, int graceHours,
                                                             int percentPerHour) {
  if (clock == nullptr || !GraceThenPercent::isValid(graceHours, percentPerHour)) return nullptr;
  return std::make_unique<RentalsImpl>(std::move(clock), std::make_unique<LongestIdle>(),
                                       std::make_unique<GraceThenPercent>(graceHours, percentPerHour));
}
