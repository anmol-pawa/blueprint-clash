A server builds a response in a scratch `Buffer` (`api.h`: an alias for `std::string`) for every request, and allocating a big one each time is slow. Write `BufferPool` in `solution.h`: it owns a fixed number of buffers and **leases** them out.

- `explicit BufferPool(std::size_t capacity)` creates `capacity` buffers up front. `capacity()` and `available()` (idle buffers right now) report counts.
- `Lease acquire()` hands out an idle buffer. When none is idle it returns an **empty** lease (`explicit operator bool` is `false`); it never allocates a new one and never throws.
- `BufferPool::Lease` is the RAII handle: `*lease` / `lease->` reach the buffer. It is **move-only**. When a lease is destroyed, or overwritten by a move-assignment, its buffer goes back to the pool, **cleared**, so the next user never sees the previous request's data. A moved-from lease is empty and gives nothing back.

Pitfalls the tests probe: a returned buffer must be reset; a move must hand over ownership exactly once (no double release); move-assigning onto a live lease must first release what it held; and a pooled buffer is *reused* (same object), not recreated. The pool must outlive its leases; say so in a comment.
