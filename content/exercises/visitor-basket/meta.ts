import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "visitor-basket",
  title: "Visitor: totals and receipts over a basket",
  concepts: ["visitor", "double dispatch", "expression problem", "forward declaration", "open for new operations"],
  hints: [
    "Forward-declare `Goods`, `Service`, `Voucher`, then declare `ItemVisitor` with three `visit` overloads taking `const` references. Each item's `accept` is the one line `visitor.visit(*this);`: the call happens inside the concrete class, which is how the compiler picks the right overload.",
    "`Basket` keeps a `std::vector<std::unique_ptr<Item>>`; `add` ignores a null pointer; `accept` loops in order and calls `item->accept(visitor)`. `TotalVisitor` is an `ItemVisitor` with a running `long long total_`.",
    "Goods add `quantity() * unitCents()`, services add `hours() * rateCents()`, vouchers subtract `cents()`. Put none of this in the item classes: the whole point is that a receipt printer can be added later without editing them.",
  ],
  wrong: [
    { dir: "ignores_quantity", failingTests: ["Basket.TotalMultipliesQuantityAndHours"], reason: "Counts one unit of each goods line: three pens cost the same as one." },
    { dir: "service_as_goods", failingTests: ["Basket.TotalMultipliesQuantityAndHours"], reason: "Ignores the hours of a service line and bills the hourly rate once." },
    { dir: "voucher_adds", failingTests: ["Basket.VoucherReducesTheTotal"], reason: "Adds the voucher instead of subtracting it: a discount raises the bill." },
    { dir: "reverse_order", failingTests: ["Basket.ItemsAreVisitedInInsertionOrder"], reason: "Walks the basket backwards, so every receipt prints in the wrong order." },
    { dir: "voucher_never_accepts", failingTests: ["Basket.EachKindReachesItsOwnOverload", "Item.AcceptWorksThroughABasePointer"], reason: "Voucher::accept forgets to call back the visitor, so vouchers are silently skipped by every operation: the exact bug an unchecked dynamic_cast ladder produces." },
    { dir: "stores_null", failingTests: ["Basket.AddingNullIsIgnored"], reason: "Stores null items and then dereferences them while visiting: a crash instead of a guard at the boundary." },
  ],
};
