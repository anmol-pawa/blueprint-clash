An order service needs unique, increasing order numbers. Today it reaches for a global counter, so nothing can test it with known numbers and nothing stops two counters from existing. Do both halves in `solution.h`; `api.h` gives the `IdSource` interface.

**1. `IdGenerator`**: the one real counter, as a *Meyers singleton* implementing `IdSource`.
- `static IdGenerator& instance()`: always the same object (a function-local `static`, so construction is thread-safe).
- `long next() override`: returns 1, 2, 3, ... across **all** callers of `instance()`.
- Nobody else can create one: private constructor, and no copy or move (a stray `auto g = IdGenerator::instance();` must not compile).

**2. `OrderService`**: takes an `IdSource&` in its constructor and never names `IdGenerator`. `std::string place(const std::string& item)` returns `"ORD-<id>:<item>"`, for example `"ORD-7:tea"`.

The tests build `OrderService` with a fake `IdSource` that returns known numbers, and with the real singleton. The singleton exists once, at the edge; the logic that needs numbers does not know it is a singleton.
