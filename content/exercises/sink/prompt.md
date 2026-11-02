Write an abstract `Sink` in `solution.h` using the **non-virtual interface** idiom:

- `void write(const std::string& message)` is public and **not virtual**. It ignores empty messages. Otherwise it increments the counter and passes `"[n] " + message` to `emit`, where `n` is the new count (1, 2, 3, ...).
- `std::size_t written() const`: how many non-empty messages were written.
- `emit(const std::string& line)` is a **private pure virtual** function: subclasses implement it to decide where the line goes.
- Give `Sink` a virtual destructor.

Tests derive their own sinks from `Sink` by overriding `emit` only.
