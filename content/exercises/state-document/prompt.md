A `Document` moves through a workflow, and what each action does depends on where it is. The tempting implementation is one class full of `if (state == ...)` checks repeated in every method. The **State** pattern moves each state's behaviour into its own class, and the document delegates.

Rules, for a `Document` that starts in **draft** with revision 0:

| State | `edit()` | `submit()` | `approve()` | `reject()` |
|---|---|---|---|---|
| draft | allowed: revision +1, stays draft | moves to **review** | not allowed | not allowed |
| review | not allowed | not allowed | moves to **published** | moves back to **draft** |
| published | not allowed | not allowed | not allowed | not allowed |

Write `Document` in `solution.h` with:

- `bool edit()`, `bool submit()`, `bool approve()`, `bool reject()`: return `true` if the action was allowed and happened, `false` if it is not allowed in the current state (and then **nothing** changes).
- `std::string stateName() const`: `"draft"`, `"review"` or `"published"`.
- `int revision() const`: the number of allowed `edit()` calls so far (a rejected document keeps its revision).

Use one class per state behind a private interface, and have each state hand back the next one. `Document` must not contain a `switch` or an `if` chain on the state.
