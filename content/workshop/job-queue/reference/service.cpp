#include "queue_impl.h"

std::unique_ptr<jobq::Queue> jobq::makeQueue() { return std::make_unique<QueueImpl>(); }

std::unique_ptr<jobq::PolicyQueue> jobq::makePolicyQueue() { return std::make_unique<QueueImpl>(); }

std::unique_ptr<jobq::DrainingQueue> jobq::makeDrainingQueue() { return std::make_unique<QueueImpl>(); }
