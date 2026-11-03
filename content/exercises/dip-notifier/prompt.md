An order service must tell customers their order is confirmed, but it must not know *how*. `api.h` gives the abstraction `MessageSender`. Write `OrderService` in `solution.h`:

- `explicit OrderService(MessageSender& sender)`: the service uses the sender it is given. It does not create one, and it does not use a global.
- `bool placeOrder(const std::string& customer, int quantity)`:
  - `quantity <= 0` is rejected: return `false` and send nothing.
  - otherwise send one message to `customer` with the body `"Order confirmed: <quantity> item(s)"` (for example `"Order confirmed: 3 item(s)"`).
  - return `true` only when the sender reports delivery; if `send` returns `false`, the order is not confirmed and `placeOrder` returns `false`.
- `int confirmedCount() const`: how many orders were confirmed (delivered) so far.

The tests pass in senders of their own: one that records messages and one that always fails.
