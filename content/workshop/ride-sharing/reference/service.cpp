#include "api_storm2.h"
#include "ride_impl.h"

std::unique_ptr<ride::Dispatch> ride::makeDispatch() {
  return std::make_unique<RideImpl>(std::make_unique<NearestMatcher>(), std::make_unique<NoSurge>());
}

std::unique_ptr<ride::Dispatch> ride::makeSurgeDispatch(int freeDriverThreshold, int surgePercent) {
  if (!ScarcitySurge::isValid(freeDriverThreshold, surgePercent)) return nullptr;
  return std::make_unique<RideImpl>(std::make_unique<NearestMatcher>(),
                                    std::make_unique<ScarcitySurge>(freeDriverThreshold, surgePercent));
}

std::unique_ptr<ride::Dispatch> ride::makeRatedDispatch(int freeDriverThreshold, int surgePercent, long long radius) {
  if (!ScarcitySurge::isValid(freeDriverThreshold, surgePercent) || !BestRatedMatcher::isValid(radius)) return nullptr;
  return std::make_unique<RideImpl>(std::make_unique<BestRatedMatcher>(radius),
                                    std::make_unique<ScarcitySurge>(freeDriverThreshold, surgePercent));
}
