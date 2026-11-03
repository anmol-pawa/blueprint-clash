A single `Invoice` class used to hold line items, add up the total, format the text *and* save it. Four reasons to change in one class. Split it so each class has one job. In `solution.h` write:

- `Invoice`: holds data and the arithmetic of its own data only. `void add(const LineItem&)`, `long long totalCents() const` (sum of `unitCents * quantity`), `const std::vector<LineItem>& items() const`. It must **not** know how to render or store itself.
- `InvoiceFormatter` with `std::string render(const Invoice&) const`. One line per item in the form `"<name> x<quantity> = <money>\n"`, then `"TOTAL <money>\n"`. `<money>` is cents as dollars with two digits: `1250` is `12.50`, `5` is `0.05`, `0` is `0.00`.
- `InvoiceArchiver` constructed with an `InvoiceSink&`, with `void archive(const Invoice&)` that renders the invoice (using `InvoiceFormatter`) and passes the text to the sink's `store` exactly once.

A test checks with a compile-time trait that `Invoice` has no `render` or `store` member.
