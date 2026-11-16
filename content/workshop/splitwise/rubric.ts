import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Validates a request in the documented order and sequences the collaborators; no rule of its own about rounding, split kinds or simplification", phase: "base", owners: ["LedgerImpl", "ExpenseLedger", "LedgerService", "ExpenseService", "GroupLedger", "ExpenseManager"] },
  { id: "res-books", text: "Owns the money state as one source of truth (net amount per pair of members) and derives balances and the debt list from it, so the views cannot disagree", phase: "base", owners: ["PairLedger", "DebtBook", "BalanceSheet", "DebtLedger", "PairwiseDebts", "BalanceBook", "Ledgers"] },
  { id: "res-members", text: "Owns who is in the group and the rules for adding a person", phase: "base", owners: ["MemberBook", "MemberRegistry", "Members", "Group", "MemberStore"] },
  { id: "res-split", text: "Turns an amount and some people into what each owes, one class per kind of split, chosen without a type switch in the facade", phase: "storm1", owners: ["SplitRule", "SplitStrategy", "SplitPolicy", "ExpenseSplitter", "Splitter", "SplitCalculator"] },
  { id: "res-round", text: "Owns the rounding rule: divides whole cents in proportion to weights without losing or inventing a cent, and decides who gets the leftover", phase: "storm1", owners: ["Apportioner", "CentDivider", "Allocator", "Rounder", "ShareCalculator", "RemainderPolicy", "Distributor"] },
  { id: "res-simplify", text: "Owns turning balances into a short list of payments, separate from the books and from the facade", phase: "storm2", owners: ["DebtSimplifier", "Simplifier", "SettlementPlanner", "DebtMinimizer", "SettlementCalculator", "PaymentPlanner"] },
];
