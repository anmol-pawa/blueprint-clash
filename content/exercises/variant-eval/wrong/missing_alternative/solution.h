#pragma once
#include <string>
#include <variant>
#include <vector>
#include "api.h"

namespace detail {
template <class... Ts>
struct Overloaded : Ts... {
  using Ts::operator()...;
};
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;
constexpr double kPi = 3.14159265358979;
}  // namespace detail

inline double area(const Shape& s) {
  if (const auto* c = std::get_if<Circle>(&s)) return detail::kPi * c->r * c->r;
  if (const auto* r = std::get_if<Rect>(&s)) return r->w * r->h;
  return 0;  // bug: Tri forgotten, and nothing complains
}

inline std::string label(const Shape& s) {
  if (std::holds_alternative<Circle>(s)) return "circle";
  if (std::holds_alternative<Rect>(s)) return "rect";
  return "unknown";
}

inline double totalArea(const std::vector<Shape>& shapes) {
  double sum = 0;
  for (const auto& s : shapes) sum += area(s);
  return sum;
}
