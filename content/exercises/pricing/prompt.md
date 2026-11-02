`api.h` defines the abstraction `PricingStrategy` with `long long price(long long unitCents, int quantity) const`. Write, in `solution.h`:

- `RegularPrice`: `unitCents * quantity`.
- `BulkDiscount(int minQuantity, int percentOff)`: when `quantity >= minQuantity`, the gross price is reduced by `gross * percentOff / 100` (integer division, truncating the discount). Below the minimum there is no discount.
- `Checkout`: constructed with a `std::unique_ptr<PricingStrategy>`, with `void setStrategy(std::unique_ptr<PricingStrategy>)` and `long long total(long long unitCents, int quantity) const`. A null strategy means regular pricing.

The tests plug in a strategy of their own, so `Checkout` must not know the concrete types.
