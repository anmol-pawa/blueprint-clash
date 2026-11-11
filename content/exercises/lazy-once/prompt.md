A service needs a setting that is expensive to load, so it loads it on first use. Many threads may ask at the same moment. Write `LazyValue` in `solution.h`:

```cpp
LazyValue(Lock& lock, Loader& loader);
bool get(int& out);   // true and `out` filled; false if loading failed
```

- **Load at most once**, even if several threads arrive together. The tests simulate "another thread finished loading while I was waiting for the lock".
- **Failure is not cached.** If `load` returns `false`, `get` returns `false` and the next call tries again. A half-initialised value must never be handed out.
- **Warm reads must not take the lock.** Once the value is loaded, `get` should read it without touching `lock` (that is the whole point of double-checked locking). Use a `std::atomic<bool>` with `memory_order_acquire` to read it and `memory_order_release` to publish it.
- Take the lock with a `std::lock_guard<Lock>` so every path, including a failed load, unlocks.

Think about it while you write: why is a plain `bool` flag a data race even though it only goes `false -> true`? When is `std::call_once` (or a function-local static) the better answer, and why does it not fit when a failed load must be retried?
