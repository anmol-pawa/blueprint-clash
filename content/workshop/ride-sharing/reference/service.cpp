#include "ride_service_impl.h"

std::unique_ptr<ride::RideService> ride::makeRideService() {
  return std::make_unique<RideServiceImpl<ride::RideService>>(std::make_unique<NearestDriver>(),
                                                              std::make_unique<NoCancelFee>());
}

std::unique_ptr<ride::ClassedService> ride::makeClassedService() {
  return std::make_unique<ClassedServiceImpl<ride::ClassedService>>(std::make_unique<NearestDriver>(),
                                                                    std::make_unique<NoCancelFee>());
}

std::unique_ptr<ride::FeeService> ride::makeFeeService(Money cancelFee) {
  if (!FeeOnceArrived::isValid(cancelFee)) return nullptr;
  return std::make_unique<FeeServiceImpl>(std::make_unique<NearestDriver>(), std::make_unique<FeeOnceArrived>(cancelFee));
}
