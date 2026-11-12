#include "logger_impl.h"

std::unique_ptr<logx::Logger> logx::makeLogger(std::unique_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<LoggerImpl>(std::move(clock));
}

std::unique_ptr<logx::ConfigurableLogger> logx::makeConfigurableLogger(std::unique_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<LoggerImpl>(std::move(clock));
}
