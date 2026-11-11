Worker threads pull jobs off a shared queue. Write `TaskQueue` in `solution.h`, including the worker loop and a clean shutdown:

```cpp
TaskQueue(Lock& lock, Condition& wakeup);
bool submit(Task task);   // false (and the task is dropped) once shutdown has begun
void shutdown();          // stop accepting work, wake every worker
void runWorker();         // the loop a worker thread runs; returns when shut down AND drained
```

- `runWorker` sleeps on `wakeup` while there is nothing to do and no shutdown (in a loop: wake-ups can be spurious). It runs tasks in submission order.
- **Run each task with the lock released.** A task may call `submit` (it needs the lock), and a slow task must not block every other worker. Copy or move the task out inside the critical section, leave it, then call it.
- **Drain on shutdown.** Tasks already queued when `shutdown()` is called still run; the worker returns only when the queue is empty *and* shutdown was requested.
- `submit` wakes one worker; `shutdown` wakes **all** of them (each must notice the flag and exit). `submit` after `shutdown` returns `false`.

Tests drive `runWorker` on the test thread: the spy `Condition::wait` releases the lock, plays a script (a spurious wake-up, then a `submit`, then a `shutdown`) and takes the lock again.

Think about it while you write: what happens if a task holding the queue lock calls `submit`? What does `notify_one` on shutdown strand? How would you add a way to wait for tasks to *finish*, not just to start?
