#pragma once
#include "api.h"

// Levels are an ordered scale; "at or above" is the only comparison the library needs.
inline bool atLeast(logx::Level level, logx::Level floor) { return static_cast<int>(level) >= static_cast<int>(floor); }
