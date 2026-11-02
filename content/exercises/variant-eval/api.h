#pragma once
#include <variant>

struct Circle { double r; };
struct Rect { double w; double h; };
struct Tri { double base; double height; };

using Shape = std::variant<Circle, Rect, Tri>;
