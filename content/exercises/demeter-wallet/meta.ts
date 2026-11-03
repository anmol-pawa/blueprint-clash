import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "demeter-wallet",
  title: "Shop and customer: tell, don't ask",
  concepts: ["Law of Demeter", "tell, don't ask", "encapsulating a collaborator", "invariants live next to the data"],
  hints: [
    "Who knows whether a payment is allowed? The object that holds the money. The shop should not need to know a wallet exists.",
    "`Customer` owns a `Wallet` member and forwards `pay`, `topUp` and `funds` to it. The rule (positive amount, enough money) lives in `Wallet::charge`. `Shop::sell` only calls `buyer.pay(price)`.",
    "`Shop::sell`: `if (!buyer.pay(priceCents)) return false; revenue_ += priceCents; return true;`. `Wallet::charge`: `if (cents <= 0 || cents > balance_) return false; balance_ -= cents; return true;`.",
  ],
  wrong: [
    { dir: "exposes_wallet", failingTests: ["Demeter.CustomerDoesNotHandOutItsWallet"], reason: "Adds `Wallet& wallet()`, so Shop-like callers can chain `customer.wallet().balance()` and bypass the customer's rules (a train wreck of dots)." },
    { dir: "negative_charge", failingTests: ["Wallet.RejectsNonPositiveCharges"], reason: "Wallet::charge only checks the balance, so charging a negative amount succeeds and creates money." },
    { dir: "revenue_on_failure", failingTests: ["Shop.FailedPaymentIsNotRevenue"], reason: "Adds the price to revenue before checking that the customer could pay." },
  ],
};
