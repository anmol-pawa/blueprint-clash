Write a small shape hierarchy in `solution.h`:

- `Shape`: an abstract interface with `double area() const` and `std::string name() const`. It must be safe to destroy a derived shape through a `Shape*` or `std::unique_ptr<Shape>`.
- `Circle(double radius)`: `name()` is `"circle"`, area is `pi * r * r` (use `3.14159265358979`).
- `Rectangle(double width, double height)`: `name()` is `"rectangle"`.

Mark every overriding function with `override`. The tests derive their own shape from `Shape` and count destructor calls.
