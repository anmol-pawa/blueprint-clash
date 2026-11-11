A metrics collector is shared by many request handlers. Write `SafeStats` in `solution.h`: it keeps a running **count**, **sum** and **max** of recorded latencies and must never expose a half-updated state.

The class does **not** create its own mutex. It receives a `Lock&` (see `api.h`) in its constructor and uses it for every access. That seam is what lets the tests *watch* your locking deterministically, with no real threads.

- `bool record(int value)`: values below zero are invalid. Return `false` and change nothing. Otherwise update count, sum and max together and return `true`.
- `std::size_t recordAll(const std::vector<int>& values)`: record every valid value as **one atomic batch** and return how many were valid. No other thread may see a state that contains only part of the batch, so take the lock **once** for the whole batch.
- `Stats snapshot() const`: return a consistent copy of `{count, sum, max}`. Reads need the lock too.
- `void reset()`: back to zero.

Rules the tests probe: every method that touches the numbers takes the lock (reads included); the lock is released on **every** path, including the early `return false`; and the lock is never held when a method returns. Prefer an RAII guard (`std::lock_guard`) over calling `lock()` and `unlock()` by hand. (A `Lock&` member can be locked inside a `const` method, because constness does not reach through a reference. With an owned `std::mutex` you would declare it `mutable`.)
