import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "bank-account",
  title: "BankAccount: an invariant the type defends",
  concepts: ["invariants", "encapsulation", "strong exception-free failure"],
  hints: [
    "Which member would let a caller break the rule if it were public? Make it private and expose only operations.",
    "Validate the whole request first, and only then change the balance, so a refused call leaves no trace.",
    "Compare against the balance before subtracting: `cents > balance_` is the guard, and `cents <= 0` is the other one.",
  ],
  wrong: [
    { dir: "allows_overdraft", failingTests: ["Withdraw.RefusesOverdraftAndChangesNothing", "Invariant.BalanceNeverNegativeUnderAMixOfCalls"], reason: "Subtracts without checking the balance, so the invariant lives in callers' good manners instead of in the type." },
    { dir: "negative_deposit", failingTests: ["Deposit.RefusesZeroAndNegative"], reason: "A negative deposit is a withdrawal that bypasses the overdraft check." },
    { dir: "partial_withdraw", failingTests: ["Withdraw.RefusesOverdraftAndChangesNothing"], reason: "Mutates the balance and then reports failure. A refused operation must leave the object untouched." },
  ],
};
