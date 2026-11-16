#include "bus_impl.h"

std::unique_ptr<bus::EventBus> bus::makeBus() { return std::make_unique<BusImpl>(); }

std::unique_ptr<bus::EventBus> bus::makePatternBus() { return std::make_unique<BusImpl>(); }

std::unique_ptr<bus::OrderedBus> bus::makeOrderedBus() { return std::make_unique<BusImpl>(); }
