`api.h` defines three plain data shapes and `using Shape = std::variant<Circle, Rect, Tri>`. In `solution.h` write, using `std::visit` (not `if`/`get_if` chains):

- `double area(const Shape&)`: circle `pi*r*r` with `pi = 3.14159265358979`; rectangle `w*h`; triangle `base*height/2`.
- `std::string label(const Shape&)`: `"circle"`, `"rect"` or `"tri"`.
- `double totalArea(const std::vector<Shape>&)`: the sum of all areas, `0` for an empty vector.

Your visitor must handle every alternative explicitly, so adding a fourth shape later makes the build fail until it is handled.
