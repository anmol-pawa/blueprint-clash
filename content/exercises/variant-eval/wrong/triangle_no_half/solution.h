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

// Each visitor lists every alternative: adding a Shape alternative breaks the build until handled.
inline double area(const Shape& s) {
  return std::visit(detail::Overloaded{
                        [](const Circle& c) { return detail::kPi * c.r * c.r; },
                        [](const Rect& r) { return r.w * r.h; },
                        [](const Tri& t) { return t.base * t.height; },
                    },
                    s);
}

inline std::string label(const Shape& s) {
  return std::visit(detail::Overloaded{
                        [](const Circle&) { return std::string("circle"); },
                        [](const Rect&) { return std::string("rect"); },
                        [](const Tri&) { return std::string("tri"); },
                    },
                    s);
}

inline double totalArea(const std::vector<Shape>& shapes) {
  double sum = 0;
  for (const auto& s : shapes) sum += area(s);
  return sum;
}
