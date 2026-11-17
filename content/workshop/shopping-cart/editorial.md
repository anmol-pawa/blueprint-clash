# Editorial: Shopping cart and discount engine

## Requirements
Functional: products with a unit price and a stock; one cart per customer; checkout turns a cart into an order and moves stock; an order can be cancelled by its customer. The cart holds no stock. Money is whole cents in a 64-bit integer.

Hidden in the brief and revealed by good questions: a line is 1 to 99 units and merges on repeated adds; adding never looks at the shelf; checkout is all or nothing and a failure changes nothing, the cart included; cancel puts the units back and spends the id; the order of checks is part of the API.

**Change Storm 1, coupons:** `addCoupon(code, rule)` with three kinds (percent off the cart, an amount off the cart, a percent off one product's line) and an optional minimum spend. One coupon per cart, applying another replaces it. `total()` is the price checkout will charge; percentages round down; the total never goes below zero; a coupon that is ineligible at pricing time stays attached and gives nothing. Checkout uses the coupon up; a failed checkout keeps it. Revealable by asking what discounts marketing will want.

**Change Storm 2, stacking:** `addStackableCoupon` registers coupons that combine. Ordinary coupons still replace everything; a stackable one drops an ordinary coupon and joins the stackable ones; coupons fold in attach order, each taking from what is left; eligibility is decided against the pre-coupon subtotal.

## Reference design
- `Catalog` is the only place that knows a unit price.
- `Inventory` counts units on the shelf and moves stock for a whole set of lines all or nothing: `canTake` is asked first and `take` then cannot fail.
- `CartBook` keeps one wish list per customer and the rules about lines: merge on add, remove a line at zero, drop an empty cart. It knows no prices and no stock.
- `OrderLedger` records what was bought, by whom and for how much, issues ids and spends them on cancel.
- `Pricer` prices the lines of a cart into a `Basket` (line totals and subtotal) and folds a list of `Discount`s over it. It owns the arithmetic and nothing else.
- `Discount` is the Strategy: `reduction(basket, running)`. `PercentOffCart`, `AmountOffCart` and `PercentOffSku` are the kinds, and `MinimumSpend` is a Decorator that adds the eligibility rule to any of them, once. `makeDiscount` builds the right object for a rule and validates it.
- `CouponBook` knows which coupons exist and which are attached to whose cart, in order, and enforces what may combine.
- `ShopImpl` is the facade: it validates in the documented order and sequences the collaborators. It holds no rule about prices, stock or discounts, and `checkout` calls `total()` so the quote and the charge cannot disagree.

**Storm 1 in the reference:** `Discount`, three subclasses, the `MinimumSpend` Decorator, `Pricer::total` and `CouponBook` are new; `ShopImpl` gets four small methods and `checkout` charges `total()` and clears the coupon. Nothing from the base phase is edited except those lines.

**Storm 2 in the reference:** one flag per coupon and one method, `CouponBook::apply`, change; the pricing loop already folded a list in order, so it is untouched. That is what the storm tests: whether stacking is a change in one class or a rewrite.

## Alternatives
- **Reserving stock when the item is added** feels safe and is wrong for a shop: abandoned carts lock stock. The deciding moment is checkout. A time-limited hold is a separate feature (see the ticket-booking problem).
- **Taking stock line by line while checking** is the first draft of most candidates. It is correct until a later line fails, and then it needs a rollback that is easy to get wrong. Checking all, then taking all, needs no rollback.
- **A discount flag on each cart line** (`discountPercent`) works for one kind of coupon. A second kind adds another field and a branch in the pricing loop, and the third kind rewrites it. The Strategy interface is what keeps the loop closed.
- **A `switch` on the coupon kind inside the pricer** is simple and honest for three kinds. It fails the change storm test: each new kind edits the pricer. Say that out loud; the switch is acceptable if you name when you would stop.
- **Minimum spend as a field inside every discount** repeats a rule and lets the copies drift. The Decorator (or a Specification object that can be combined) writes it once.
- **Re-pricing an order from the current price list** at cancel or refund time makes every old order depend on today's prices. The order stores the total it was charged.
- **Floating point for percentages** loses cents in ways that depend on the order of operations. Integer arithmetic with an explicit rounding rule is reproducible.

## Trade-offs
A map from sku to quantity per customer makes every cart operation O(log lines) and the pricing of a cart O(lines), which is small. Keeping the cart ignorant of stock and prices makes it trivially correct and puts the two decisions that matter (can I buy it, what does it cost) at checkout where they are made once. The price of that choice is that a customer can hold an item that is gone by checkout; the product answer is to show stock on the cart page as a hint and let checkout decide.

Folding discounts as a list in attach order is the simplest rule that is deterministic and explainable. The alternative, always applying percentages before amounts or choosing the best order for the customer, is a policy a business may prefer; it is a different `Pricer` ordering rule, and the test that pins attach order is the one to change. Deciding eligibility against the pre-coupon subtotal costs the shop some margin (a cart can qualify for a coupon it would not qualify for after another one) and buys predictability: adding a coupon never turns another one off.

## What breaks at 10x
At 10x the customers, nothing in the model changes: carts are per customer, so shard by customer. The shared structures are the shelf and the order ids. The shelf is where contention appears: a popular product is one hot counter, and the check-then-take of a whole cart is a critical section across several of them. Take locks in a fixed order (by sku) or move to conditional decrements inside one database transaction. Order ids come from a sequence, not a counter in memory. The coupon table is read-mostly and cacheable; what must be transactional is "use up the coupon" together with "write the order". At 100x, a flash sale on one product needs a waiting room in front of the counter and idempotent checkout so retries do not double-buy.

## Level signals
- **SDE2:** a cart that does not hold stock, all-or-nothing checkout that leaves nothing changed on failure, integer money, ids spent on cancel, and a clear order of checks.
- **Senior:** asks what a cart means before coding; separates catalogue, inventory, carts and orders with one reason to change each; makes discounts a Strategy and writes eligibility once; makes the quote and the charge one function; names the concurrency hazard and the lock order.
- **Staff:** treats stacking and eligibility as policy that changes without a deploy (rules as data with a dry run and a version on each order); moves the last-unit decision to a conditional write; designs the flash-sale path with a waiting room, idempotency keys and holds; says what to reconcile afterwards.
