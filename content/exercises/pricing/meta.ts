import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "pricing",
  title: "Checkout: a pricing Strategy that stays open",
  concepts: ["Strategy pattern", "dependency injection by unique_ptr", "open/closed principle", "null-object fallback"],
  hints: [
    "Checkout must work with a pricing rule it has never seen. What type should it depend on: a concrete rule or an abstraction?",
    "Hold a `std::unique_ptr<PricingStrategy>`; `total` just forwards to `strategy_->price(...)`. A new rule then needs no change to Checkout.",
    "BulkDiscount: `gross = unitCents * qty`; if `qty >= minQty`, discount is `gross * percentOff / 100` (integer division); price is `gross - discount`. If the strategy is null, behave like RegularPrice.",
  ],
  wrong: [
    { dir: "hardcoded_types", failingTests: ["Open.CheckoutAcceptsAStrategyItHasNeverSeen", "Open.SwitchingStrategyChangesTotals"], reason: "Checkout switches on the concrete strategy type with dynamic_cast, so any new rule is ignored: adding a rule means editing Checkout (violates open/closed)." },
    { dir: "bulk_below_threshold", failingTests: ["Bulk.NoDiscountBelowThreshold"], reason: "Applies the discount to every order, ignoring the minimum quantity." },
    { dir: "null_crashes", failingTests: ["Checkout.NullStrategyFallsBackToRegular"], reason: "Dereferences a null strategy instead of falling back to regular pricing." },
  ],
};
