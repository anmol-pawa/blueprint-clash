A tiny calculator language has numbers, variables and the four arithmetic operators. A loop that reads tokens left to right gets `2 + 3 * 4` wrong (20, not 14) and cannot be reused with different variable values. The **Interpreter** pattern gives each grammar rule its own class and evaluates a *tree*: precedence is baked into the tree's shape, and the same tree can be evaluated under many `Context`s.

There are no exceptions in this judge, so failure is a value: evaluation returns `std::optional<long long>`, and `std::nullopt` means "this expression has no value" (unknown variable or division by zero).

Write in `solution.h`:

- `class Context`: variable bindings. `Context& set(const std::string& name, long long value)` stores (or overwrites) a binding and returns `*this` so calls chain; `std::optional<long long> lookup(const std::string& name) const`.
- `class Expr`: virtual destructor, `virtual std::optional<long long> eval(const Context&) const = 0` and `virtual std::string show() const = 0`. Define `using ExprPtr = std::unique_ptr<Expr>;`.
- Concrete rules, each owning its children by `ExprPtr` and built by a free function:
  - `ExprPtr num(long long)`: evaluates to itself; `show()` is the number (`"7"`, `"-2"`).
  - `ExprPtr var(std::string name)`: evaluates to the binding, or `nullopt` if the context has none; `show()` is the name.
  - `ExprPtr add(ExprPtr, ExprPtr)`, `sub`, `mul` and `divide`: `divide` truncates toward zero like C++ `/` and yields `nullopt` when the right side is `0`.
  - A binary node's value is `nullopt` whenever **either** child's value is `nullopt` (errors propagate, nothing is silently treated as 0). `show()` is fully parenthesised: `(left op right)` with `+`, `-`, `*`, `/` and single spaces.
- Evaluating the same tree again under a different `Context` must use the new bindings.

Hidden tests also define their own `Expr` subclass (a `Negate` node) and nest it in your trees, so nothing may assume only your node types exist.
