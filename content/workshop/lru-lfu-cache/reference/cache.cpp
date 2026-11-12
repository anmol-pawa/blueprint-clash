#include "cache_impl.h"

namespace {
// The plain cache never expires anything, so its clock can stand still.
class StillClock : public cache::Clock {
 public:
  long long now() const override { return 0; }
};

std::unique_ptr<EvictionPolicy> policyFor(cache::Policy policy) {
  if (policy == cache::Policy::Lfu) return std::make_unique<LfuPolicy>();
  return std::make_unique<LruPolicy>();
}
}  // namespace

std::unique_ptr<cache::Cache> cache::makeCache(int capacity) { return makePolicyCache(capacity, Policy::Lru); }

std::unique_ptr<cache::Cache> cache::makePolicyCache(int capacity, Policy policy) {
  static const StillClock still;
  return makeExpiringCache(capacity, policy, still);
}

std::unique_ptr<cache::ExpiringCache> cache::makeExpiringCache(int capacity, Policy policy, const Clock& clock) {
  if (capacity < 1) return nullptr;
  return std::make_unique<CacheImpl>(capacity, policyFor(policy), clock);
}
