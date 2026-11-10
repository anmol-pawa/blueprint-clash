An expense must be approved by someone whose limit covers it: a manager for small amounts, a director for bigger ones, a VP above that. Putting every `if (cents <= ...)` rule into one function means each new approver edits it. In the **Chain of Responsibility** pattern each approver decides whether the request is theirs and otherwise passes it along, so the chain can be rebuilt (or extended with a new kind of approver) without touching existing code.

`api.h` gives you `Expense { employee, cents }`. Write in `solution.h`:

- `class Approver`, the chain link and base class:
  - `virtual ~Approver()`.
  - `Approver& then(std::unique_ptr<Approver> next)` stores `next` as this link's successor (the link owns it) and **returns a reference to `next`**, so chains read left to right: `a->then(std::move(b)).then(std::move(c))` builds `a -> b -> c`.
  - `std::string handle(const Expense&) const` (public, non-virtual). If this link can approve, it returns `role()`. Otherwise it forwards to the next link. If there is no next link it returns `"rejected"`. **Stop at the first link that can approve**: later links are never consulted.
  - Two **protected pure virtuals** that subclasses override: `bool canApprove(const Expense&) const` and `std::string role() const`.
- `class LimitApprover final : public Approver`, constructed as `LimitApprover(std::string role, long long limitCents)`. It approves an expense when `0 < cents <= limitCents` (the limit is inclusive; zero or negative amounts are nobody's to approve).

Hidden tests also define their own `Approver` subclasses (for example one that blocks certain employees), so nothing in `Approver` may assume `LimitApprover`.
