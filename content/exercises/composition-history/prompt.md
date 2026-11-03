A text editor keeps the last few commands. The quick way is `class History : public std::vector<std::string>`, and it works until someone calls `push_back` in a loop, `insert` in the middle or `clear` and the "at most N entries" rule is gone. Inheritance gave away the whole `vector` interface; you only wanted storage. Use **composition**. Write `BoundedHistory` in `solution.h`:

- `explicit BoundedHistory(std::size_t capacity)`.
- `void add(const std::string& entry)`: appends; when the history is already at capacity the **oldest** entry is dropped first. A capacity of `0` keeps nothing.
- `std::size_t size() const`.
- `const std::string& at(std::size_t index) const`: index `0` is the oldest kept entry (the caller passes `index < size()`).
- `std::string latest() const`: the newest entry, or `""` when empty.

`BoundedHistory` must not derive from `std::vector` and must not offer `push_back`.
