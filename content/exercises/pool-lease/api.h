#pragma once
#include <cstddef>
#include <string>

// What a caller sees of a pooled resource: a scratch buffer it may fill and read.
using Buffer = std::string;
