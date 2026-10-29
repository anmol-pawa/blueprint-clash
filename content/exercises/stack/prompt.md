Write a class template `Stack<T>` in `solution.h` with value semantics for its elements and **no needless copies**:

- `void push(const T& value)` and `void push(T&& value)`.
- `std::optional<T> pop()`: removes and returns the top element; `std::nullopt` when empty.
- `const T* peek() const`: the top element, or `nullptr` when empty.
- `std::size_t size() const` and `bool empty() const`.

It must work for **move-only** element types such as `std::unique_ptr<int>`, and pushing an rvalue then popping it must not copy the element at all.
