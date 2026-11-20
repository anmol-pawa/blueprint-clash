#include "brokerage_impl.h"

std::unique_ptr<broker::Brokerage> broker::makeBrokerage() { return std::make_unique<BrokerageImpl>(FeeSchedule()); }
std::unique_ptr<broker::FeeBrokerage> broker::makeFeeBrokerage(const FeeSchedule& schedule) {
  return std::make_unique<BrokerageImpl>(schedule);
}
std::unique_ptr<broker::CorporateBrokerage> broker::makeCorporateBrokerage(const FeeSchedule& schedule) {
  return std::make_unique<BrokerageImpl>(schedule);
}
