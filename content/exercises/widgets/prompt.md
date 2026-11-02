`api.h` gives you an abstract `Widget` with a virtual `clone()` and two concrete widgets, `Label` and `Button`. A `Panel` **owns** its widgets. Write `Panel` in `solution.h`:

- `void add(std::unique_ptr<Widget> w)`: takes ownership (ignore a null pointer).
- `std::size_t size() const`
- `Widget* at(std::size_t i)` and `const Widget* at(std::size_t i) const`
- **Copying a Panel makes a deep copy**: every widget is cloned, keeping its real type (a `Button` stays a `Button`). Editing the copy never changes the original.
- Copy assignment *replaces* the contents and is safe for `p = p`.
- Moving a Panel just transfers the widgets.

No `new` or `delete` in your class.
