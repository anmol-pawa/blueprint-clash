#pragma once
#include <string>
#include <variant>
#include <vector>
#include "api.h"

// TODO: use std::visit with a visitor that handles each alternative.
inline double area(const Shape&) { return 0; }
inline std::string label(const Shape&) { return ""; }
inline double totalArea(const std::vector<Shape>&) { return 0; }
