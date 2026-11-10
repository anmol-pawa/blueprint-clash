A shop basket holds three kinds of line: **goods** (a quantity of something at a unit price), **services** (hours at an hourly rate) and **vouchers** (a fixed discount). Totals, receipts and tax summaries are all different operations over the same three kinds. Adding a method per operation to every item class means editing three classes each time; a `dynamic_cast` ladder compiles happily and silently skips the next kind someone adds. The **Visitor** pattern fixes the family and lets you add operations from outside: each item has one tiny `accept` that calls back the overload for its own concrete type (*double dispatch*).

Write in `solution.h` (all money is in cents):

- `class ItemVisitor`: an interface with a virtual destructor and three pure virtuals `visit(const Goods&)`, `visit(const Service&)` and `visit(const Voucher&)`. Forward-declare the three item classes above it.
- `class Item`: virtual destructor and `virtual void accept(ItemVisitor&) const = 0`.
- `class Goods final : public Item`, built as `Goods(std::string name, int quantity, long long unitCents)`, with getters `name()`, `quantity()`, `unitCents()`.
- `class Service final : public Item`, built as `Service(std::string name, int hours, long long rateCents)`, with `name()`, `hours()`, `rateCents()`.
- `class Voucher final : public Item`, built as `Voucher(std::string name, long long cents)`, with `name()`, `cents()`.
- Each concrete `accept` calls `visitor.visit(*this)` and nothing else.
- `class Basket` owns its items: `void add(std::unique_ptr<Item>)` (a null pointer is ignored), `std::size_t size() const`, and `void accept(ItemVisitor&) const` which offers the visitor every item **in the order they were added**.
- `class TotalVisitor final : public ItemVisitor` with `long long totalCents() const`, starting at 0: goods add `quantity * unitCents`, services add `hours * rateCents`, vouchers **subtract** `cents`.

The hidden tests write their own visitors (a receipt printer, a counter) without editing any item class: that is the point of the pattern.
