Some state belongs to the **class**, not to any one object. Write `Counter` in `solution.h`:

- Each new `Counter` gets the next id: 1, 2, 3, ... (`int id() const`). Ids are never reused.
- `void increment()` and `int value() const`: a per-object count, starting at 0.
- `static int alive()`: how many `Counter` objects exist right now.
- `static void resetIds()`: the next id will be 1 again (it does not change `alive()`).
- A **copy** is a new object: it gets a fresh id, keeps the source's value, and counts as alive. Assigning one `Counter` to another copies only the value, not the id.
