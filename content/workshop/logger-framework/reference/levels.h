#pragma once
#include "api.h"

namespace levels {
inline bool atLeast(logx::Level level, logx::Level minimum) { return static_cast<int>(level) >= static_cast<int>(minimum); }

inline const char* name(logx::Level level) {
  static const char* const kNames[] = {"DEBUG", "INFO", "WARN", "ERROR"};
  return kNames[static_cast<int>(level)];
}
}  // namespace levels
