The `os` namespace in `api.h` hands out numeric ids you must give back with `os::close`. Forgetting leaks an id; closing twice is an error.

Write `FileHandle` in `solution.h` so that nobody ever has to remember:

- `explicit FileHandle(const std::string& path)` opens the file; the destructor closes it.
- `int id() const` returns the id, or `0` for a moved-from handle.
- It **cannot be copied** (two owners would close twice) but it **can be moved**: a move transfers the id and leaves the source empty (`id() == 0`), and the empty source closes nothing.
- Move assignment closes whatever the target already held before taking the new id. Self-move-assignment must not close anything.
