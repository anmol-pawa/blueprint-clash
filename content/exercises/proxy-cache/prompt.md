A `Store` is expensive to reach, so callers should not pay for it more than needed. A **Proxy** has the same interface as the real object and controls access to it. `api.h` gives the `Store` interface and a counting `MemoryStore`. Write two proxies in `solution.h`; both are themselves `Store`s, so clients cannot tell them apart from the real thing and they can be stacked.

- `CachingStore(Store& real)`: remembers values it has read.
  - `get(key)` returns `std::optional<std::string>`: a cached key is answered without touching the real store. A miss reads the real store once and remembers the answer.
  - `put(key, value)` writes through to the real store and must never leave a stale value behind: the next `get` of that key returns the new value.
  - A missing key (`std::nullopt` from the real store) is returned as `std::nullopt` and **not cached**: a later `get`, after the key appears behind the proxy's back, must find it.
- `LazyStore(std::function<std::unique_ptr<Store>()> make)`: a virtual proxy. Nothing is created until the first `get` or `put`; the real store is then built exactly once with `make`, owned by the proxy, and every call is forwarded to it. A `LazyStore` that is never used never calls `make`.

The caching proxy holds a reference (it does not own the real store); the lazy proxy owns what it creates.
