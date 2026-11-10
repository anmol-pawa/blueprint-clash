A `Topic` tells its subscribers about messages without knowing what they do with them: the **Observer** pattern. The classic C++ trap is ownership. A topic that keeps raw pointers dangles when a listener dies; a topic that keeps `shared_ptr`s silently keeps every listener alive forever (the "lapsed listener" leak). The topic should *observe* its listeners, not *own* them.

Write `Topic` in `solution.h` (the `Listener` interface is in `api.h`):

- `void subscribe(const std::shared_ptr<Listener>& listener)` registers a listener **without extending its lifetime**. Subscribing the same listener twice has no extra effect.
- `void unsubscribe(const Listener& listener)` removes it (nothing happens if it is not subscribed).
- `std::size_t publish(const std::string& message)` calls `onMessage` on every live subscriber, in subscription order, and returns how many were called. Listeners that have been destroyed are skipped and forgotten.
- `std::size_t subscriberCount() const` is the number of listeners that are currently alive and subscribed.

A listener may call `unsubscribe` (even on itself) or `subscribe` another listener from inside `onMessage`. That must be safe: listeners added during a publish hear the *next* message, not the current one.
