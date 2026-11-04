Placing an order touches four subsystems (`Inventory`, `Payments`, `Shipping`, `Mailer`) that must be called in the right order, with the right clean-up when something fails. Callers should not have to know that script. Write a **Facade** `Checkout` in `solution.h` with one entry point; `api.h` gives the subsystem interfaces, `Order` and `CheckoutResult`.

- `Checkout(Inventory&, Payments&, Shipping&, Mailer&)` keeps references to the subsystems (it does not own or copy them).
- `CheckoutResult place(const Order&)`:
  1. **Invalid** orders (empty customer or sku, `quantity <= 0`, `unitCents <= 0`) return `InvalidOrder` without calling any subsystem.
  2. `reserve(sku, quantity)`; if it fails return `OutOfStock` and call nothing else.
  3. `charge(customer, quantity * unitCents)`; if it is declined, `release(sku, quantity)` and return `PaymentDeclined` (no shipping, no email).
  4. `schedule(customer, sku, quantity)`, then `sendConfirmation(customer, trackingId)`, then return `Ok` with the tracking id and the cents charged.

The facade only orchestrates. It adds no pricing rules and hides nothing: the subsystems stay usable on their own.
