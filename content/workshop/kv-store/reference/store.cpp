#include "store_impl.h"

std::unique_ptr<kv::Store> kv::makeStore(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<StoreImpl>(std::move(clock));
}

std::unique_ptr<kv::TransactionalStore> kv::makeTransactionalStore(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<StoreImpl>(std::move(clock));
}

std::unique_ptr<kv::ScannableStore> kv::makeScannableStore(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<StoreImpl>(std::move(clock));
}
