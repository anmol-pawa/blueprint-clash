import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "lsp-account",
  title: "Accounts: subtypes that keep the base's promises",
  concepts: ["Liskov substitution", "behavioural contracts (pre/postconditions)", "weaker preconditions are allowed", "not every is-a belongs in a hierarchy"],
  hints: [
    "Read the contract in `api.h`: after a failed withdraw nothing may change, and after a successful one the balance falls by exactly the amount. Which kind of subclass would break that?",
    "`CheckingAccount` may accept more (overdraft) but must never refuse something the base promises. `FixedDeposit` cannot promise anything about `withdraw`, so it should not claim to be an `Account` at all.",
    "Both accounts: ignore non-positive amounts, check the limit (`balance_` for savings, `balance_ + overdraft_` for checking), then `balance_ -= cents`. `FixedDeposit::redeem` deposits the principal into `into` only when matured, then zeroes it.",
  ],
  wrong: [
    { dir: "fixed_is_account", failingTests: ["Lsp.FixedDepositIsNotAnAccount"], reason: "FixedDeposit derives from Account and refuses every withdrawal: generic code that withdraws within the balance now fails, so it is not substitutable." },
    { dir: "savings_cap", failingTests: ["Savings.WithdrawsUpToTheWholeBalanceInOneCall", "Substitution.EveryAccountHonoursTheBasePromise"], reason: "SavingsAccount refuses withdrawals above a per-call cap even when the balance covers them: a strengthened precondition that breaks callers written against the base contract." },
    { dir: "failed_withdraw_fee", failingTests: ["Contract.FailedWithdrawLeavesBalanceUntouched"], reason: "A refused withdrawal still charges a fee, so a failure changes the balance (a broken postcondition)." },
  ],
};
