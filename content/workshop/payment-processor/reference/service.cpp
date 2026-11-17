#include "processor_impl.h"

std::unique_ptr<pay::Processor> pay::makeProcessor(pay::Gateway& gateway) {
  return std::make_unique<ProcessorImpl>(gateway, std::make_unique<NoExpiry>());
}

std::unique_ptr<pay::RefundingProcessor> pay::makeRefundingProcessor(pay::RefundGateway& gateway) {
  return std::make_unique<ProcessorImpl>(gateway, std::make_unique<NoExpiry>());
}

std::unique_ptr<pay::RefundingProcessor> pay::makeExpiringProcessor(pay::RefundGateway& gateway, const pay::Clock& clock,
                                                                    long long ttlSeconds) {
  if (ttlSeconds < 1) return nullptr;
  return std::make_unique<ProcessorImpl>(gateway, std::make_unique<TtlLifetime>(clock, ttlSeconds));
}
