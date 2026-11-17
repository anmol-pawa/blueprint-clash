#include "ride_impl.h"

std::unique_ptr<ride::Rides> ride::makeRides() {
  return std::make_unique<RidesImpl>(std::make_unique<NearestMatcher>(), std::make_unique<FlatFare>());
}

std::unique_ptr<ride::Rides> ride::makeSurgeRides() {
  return std::make_unique<RidesImpl>(std::make_unique<NearestMatcher>(), std::make_unique<SurgeFare>());
}

std::unique_ptr<ride::DecliningRides> ride::makeDecliningRides() {
  return std::make_unique<RidesImpl>(std::make_unique<NearestMatcher>(), std::make_unique<SurgeFare>());
}
