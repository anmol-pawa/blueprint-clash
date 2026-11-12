#include "cache_impl.h"
#include "lru_policy.h"

std::unique_ptr<cachex::Cache> cachex::makeCache(int capacity) {
  if (capacity < 1) return nullptr;
  return std::make_unique<CacheImpl>(capacity, std::make_unique<LruPolicy>());
}

std::unique_ptr<cachex::Cache> cachex::makePolicyCache(int capacity, std::unique_ptr<EvictionPolicy> policy) {
  if (capacity < 1 || policy == nullptr) return nullptr;
  return std::make_unique<CacheImpl>(capacity, std::move(policy));
}

std::unique_ptr<cachex::ObservableCache> cachex::makeObservableCache(int capacity, std::unique_ptr<EvictionPolicy> policy) {
  if (capacity < 1 || policy == nullptr) return nullptr;
  return std::make_unique<CacheImpl>(capacity, std::move(policy));
}
