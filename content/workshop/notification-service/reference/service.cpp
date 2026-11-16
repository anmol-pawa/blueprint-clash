#include "idempotent_service.h"
#include "service_impl.h"

namespace {
bool usable(const notif::RetryConfig& config) { return config.maxAttempts >= 1 && config.firstDelayMs >= 0; }
}  // namespace

std::unique_ptr<notif::NotificationService> notif::makeService(const RetryConfig& config) {
  if (!usable(config)) return nullptr;
  return std::make_unique<ServiceImpl>(config);
}

std::unique_ptr<notif::FallbackService> notif::makeFallbackService(const RetryConfig& config) {
  if (!usable(config)) return nullptr;
  return std::make_unique<ServiceImpl>(config);
}

std::unique_ptr<notif::IdempotentService> notif::makeIdempotentService(const RetryConfig& config) {
  if (!usable(config)) return nullptr;
  return std::make_unique<IdempotentServiceImpl>(std::make_unique<ServiceImpl>(config));
}
