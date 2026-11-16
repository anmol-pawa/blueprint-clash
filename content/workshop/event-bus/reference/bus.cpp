#include "bus_impl.h"
#include "segment_matcher.h"

std::unique_ptr<evb::EventBus> evb::makeBus() { return std::make_unique<BusImpl>(std::make_unique<ExactMatcher>()); }

std::unique_ptr<evb::EventBus> evb::makeHierarchicalBus() { return std::make_unique<BusImpl>(std::make_unique<SegmentMatcher>()); }

std::unique_ptr<evb::FilteredBus> evb::makeFilteredBus() { return std::make_unique<BusImpl>(std::make_unique<SegmentMatcher>()); }
