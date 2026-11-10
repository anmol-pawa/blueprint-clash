A `Roster` keeps names in the order they joined. Removing someone must not shuffle the others, so a removed entry is only **marked dead** and stays in storage (a tombstone). Callers must never see it. The tempting API hands out the internal `vector` and makes every caller remember to skip dead entries; the **Iterator** pattern hides the storage and the skipping behind `begin()` and `end()`.

Write `Roster` in `solution.h`:

- `void add(std::string name)` appends a live entry. `bool remove(const std::string& name)` marks the **first live** entry with that name dead and returns `true`, or returns `false` if there is none. `std::size_t size() const` is the number of **live** entries.
- A nested forward iterator type `Roster::const_iterator`, returned by `begin() const` and `end() const`. It visits live entries only, in the order they were added.
  - `operator*` returns `const std::string&` (callers may not modify names through it) and `operator->` returns `const std::string*`.
  - Pre-increment and post-increment (post-increment returns the iterator as it was before moving). `==` and `!=`.
  - Must skip dead entries **at the start** (`begin()` when the first entries are dead), **in the middle** (several dead in a row) and **at the end** (trailing dead entries must not appear before `end()`).
  - Must work with standard algorithms such as `std::count_if`, `std::find` and `std::distance`, so give it the five iterator typedefs (`iterator_category`, `value_type`, `difference_type`, `pointer`, `reference`).
- A default-constructed `const_iterator` must be valid to create (it is what generic code value-initialises).
