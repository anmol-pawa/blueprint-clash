A shop prices shipping with rules. Today it has a big `if (country == ...) ... else if (grams > ...)` ladder, and every new carrier means editing it. Make the calculator **closed for modification, open for extension**. `api.h` gives `Parcel` and the `ShippingRule` interface. Write `ShippingCalculator` in `solution.h`:

- `void add(std::unique_ptr<ShippingRule> rule)`: the calculator takes ownership of the rule. A null rule is ignored.
- `long long quote(const Parcel& parcel) const`: the **cheapest** price among the rules that `matches` the parcel; `-1` when no rule matches.
- `std::size_t ruleCount() const`.

The calculator must not know any concrete rule: the tests register rules you have never seen, and destroying the calculator must destroy every rule it owns.
