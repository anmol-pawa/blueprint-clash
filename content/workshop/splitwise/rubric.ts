import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Checks a request in the documented order and sequences the collaborators; no rule of its own about how a bill is cut, how debts are netted or how a plan is built", phase: "base", owners: ["LedgerImpl", "SplitwiseImpl", "ExpenseManager", "GroupLedger", "ExpenseService", "LedgerService", "SplitService"] },
  { id: "res-book", text: "Owns the money: who owes whom, the netting of opposite debts, balances, and what a payment does, so no other class does arithmetic on debts", phase: "base", owners: ["DebtBook", "DebtLedger", "BalanceSheet", "Balances", "BalanceBook", "DebtGraph", "LedgerBook", "BalanceTracker"] },
  { id: "res-split", text: "Owns how one bill is cut into portions, including who gets the leftover cents, so that the portions add up to the bill exactly", phase: "base", owners: ["SplitRule", "SplitStrategy", "EqualSplit", "SplitPolicy", "Splitter", "EqualSplitStrategy", "SplitCalculator"] },
  { id: "res-members", text: "Owns who is in the group: the registration rules and the membership check", phase: "base", owners: ["Members", "MemberRegistry", "MemberDirectory", "UserRegistry", "Group", "MemberSet"] },
  { id: "res-kinds", text: "Adds exact and percentage splits as new rules next to the equal one, without editing the equal rule or the way debts are recorded", phase: "storm1", owners: ["ExactSplit", "PercentSplit", "PercentageSplit", "ExactSplitStrategy", "PercentSplitStrategy", "PercentageSplitStrategy", "SplitRules"] },
  { id: "res-plan", text: "Turns net balances into a short list of payments as a pure computation that does not touch the ledger", phase: "storm2", owners: ["DebtSimplifier", "Simplifier", "SettlementPlanner", "DebtOptimizer", "SettlementPlan", "SettlementSimplifier", "DebtResolver"] },
];
