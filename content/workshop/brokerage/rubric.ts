import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-lot", text: "Is one purchase still held: the shares that remain and the cost of exactly those shares, giving both up together when part of it is sold", phase: "base", owners: ["Lot", "TaxLot", "PurchaseLot", "Tranche", "CostLot"] },
  { id: "res-position", text: "Keeps the lots of one symbol in purchase order and sells from the oldest first (FIFO), reporting the cost of what was sold", phase: "base", owners: ["Position", "Holding", "SymbolPosition", "LotQueue", "LotBook", "Lots"] },
  { id: "res-desk", text: "Is the one place that moves cash, lots and totals together for a buy or a sale, after the checks, so a refused order changes nothing", phase: "base", owners: ["TradeDesk", "Trader", "OrderDesk", "Exchange", "TradeExecutor", "Broker", "Executor"] },
  { id: "res-quotes", text: "Knows the latest price of each symbol and whether one exists, and knows nothing about accounts", phase: "base", owners: ["QuoteBoard", "Quotes", "PriceBoard", "MarketData", "PriceBook", "QuoteBook", "Prices"] },
  { id: "res-account", text: "Owns one customer's state (cash, positions, totals) behind small collaborators instead of loose numbers in the facade", phase: "base", owners: ["Account", "CustomerAccount", "BrokerageAccount"] },
  { id: "res-accounts", text: "Finds and opens accounts by id in one place, with the shared check order of a bad id before an unknown one", phase: "base", owners: ["Accounts", "AccountBook", "AccountRegistry", "AccountStore", "AccountTable", "Customers"] },
  { id: "res-rules", text: "Holds the legal ranges of every id, amount, quote and share count in one place", phase: "base", owners: ["Rules", "Limits", "Validator", "Validation", "InputRules", "Ranges"] },
  { id: "res-valuation", text: "Answers what an account is worth today from its cash, its positions and the current quotes, separately from how trades are done", phase: "base", owners: ["Valuation", "Valuer", "PortfolioValue", "Portfolio", "Pricing", "Valuator"] },
  { id: "res-facade", text: "Is a thin facade that validates, finds the account and delegates, owning no business rule itself", phase: "base", owners: ["BrokerageImpl", "BrokerageFacade", "Brokerage", "BrokerageService", "BrokerageDesk", "SimpleBrokerage"] },
  { id: "res-commission", text: "Owns the commission rule (flat plus percent rounded up, with a minimum) in one place that a trade asks, so a new schedule does not touch the trade code", phase: "storm1", owners: ["Commission", "FeeSchedule", "FeePolicy", "Fees", "CommissionPolicy", "FeeCalculator", "Pricing"] },
  { id: "res-actions", text: "Applies splits and dividends to every holder of a symbol from one class, without changing how a buy, a sale or a lot works", phase: "storm2", owners: ["CorporateActions", "Actions", "CorporateActionProcessor", "ActionProcessor", "Corporate", "Events"] },
];
