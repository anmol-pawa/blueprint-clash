A producer thread pushes jobs and a consumer thread pops them. Write `BoundedQueue` in `solution.h`: a fixed-capacity FIFO of `int` whose `push` **blocks while the queue is full** and whose `pop` **blocks while it is empty**.

```cpp
BoundedQueue(std::size_t capacity, Lock& lock, Condition& notFull, Condition& notEmpty);  // capacity >= 1
void push(int value);        // waits while full
int pop();                   // waits while empty
std::size_t size() const;
```

- One lock guards all the state. Hold it (with a `std::lock_guard<Lock>`) for the whole operation, and let `Condition::wait(lock)` release it while sleeping.
- `push` waits on `notFull`; `pop` waits on `notEmpty`. Two conditions, not one: each side only wants the wake-ups meant for it.
- A wake-up does not mean the predicate is true. Another thread may have taken the item first, and `wait` may return spuriously. Re-check after every wake-up.
- After a successful `push`, wake a consumer; after a successful `pop`, wake a producer. Waking one waiter is enough here, because each operation frees exactly one slot or one item.

The tests are deterministic. They give you a spy `Condition` whose `wait` releases the lock, plays a script (first wake-up spurious, second one a real producer or consumer step) and takes the lock again. A solution that does not loop, waits on the wrong condition, forgets to notify or skips the lock fails.

Think about it while you write: what goes wrong with `if (full) wait();` when two producers wake up for one free slot? Why is `notify_one` safe on two condition variables, yet lossy on one shared by both sides? (Race Hunter has the bounded-queue puzzle.)
