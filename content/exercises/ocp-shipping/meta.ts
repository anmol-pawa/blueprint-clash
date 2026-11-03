import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "ocp-shipping",
  title: "Shipping quotes: add a carrier without editing the calculator",
  concepts: ["open/closed principle", "registry of strategies", "unique_ptr ownership", "polymorphic collection"],
  hints: [
    "Which part changes every time marketing invents a carrier, and which part (pick the cheapest, handle none) never does? Put only the stable part in the calculator.",
    "Keep a `std::vector<std::unique_ptr<ShippingRule>>`. `add` moves the rule in; `quote` loops over the rules and never names a concrete class.",
    "`quote`: `long long best = -1; for (const auto& r : rules_) { if (!r->matches(p)) continue; const long long c = r->cents(p); if (best < 0 || c < best) best = c; } return best;`",
  ],
  wrong: [
    { dir: "first_match", failingTests: ["Quote.PicksTheCheapestMatchingRule"], reason: "Returns the first matching rule instead of the cheapest, so registration order silently changes the price." },
    { dir: "hardcoded", failingTests: ["Quote.UsesRegisteredRules", "Quote.PicksTheCheapestMatchingRule"], reason: "Keeps the if-ladder for known countries and ignores the registry, so a new carrier needs an edit to the calculator (the open/closed violation the exercise is about)." },
    { dir: "no_match_zero", failingTests: ["Quote.NoMatchingRuleIsMinusOne"], reason: "Returns 0 when nothing matches, which looks like free shipping." },
  ],
};
