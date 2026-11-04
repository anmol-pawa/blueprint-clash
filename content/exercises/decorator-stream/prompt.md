Output goes through a stack of optional behaviours: upper-casing, truncating, bracketing, counting. Subclassing every combination would explode, so each behaviour is a **Decorator**: a `Writer` that wraps another `Writer` and adds one thing. `api.h` gives the `Writer` interface and a `MemoryWriter` destination. Write in `solution.h`; every wrapper takes the writer it wraps as `std::unique_ptr<Writer>` and owns it.

- `UpperWriter(std::unique_ptr<Writer> next)`: forwards the text with ASCII letters upper-cased.
- `TruncateWriter(std::unique_ptr<Writer> next, std::size_t maxChars)`: forwards at most the first `maxChars` characters of each write.
- `BracketWriter(std::unique_ptr<Writer> next)`: forwards `[` + text + `]`, including for empty text.
- `CountingWriter(std::unique_ptr<Writer> next)`: forwards unchanged and counts. `writes()` is the number of `write` calls it saw and `chars()` the total length of the text it received (before anything further down changes it).
- Every wrapper's `flush()` reaches the innermost writer. Destroying the outermost wrapper destroys the whole chain exactly once.

The order of wrapping matters and callers choose it: `Bracket(Truncate(sink, 3))` and `Truncate(Bracket(sink), 3)` give different output for the same input. Do not hard-code an order.
