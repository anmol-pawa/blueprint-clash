import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public calls and sequences the collaborators: check the name and text, refuse cycles, store the cell, recalculate what depends on it, announce changes", phase: "base", owners: ["SheetImpl", "SheetService", "SpreadsheetImpl", "Spreadsheet", "SheetFacade", "Sheet"] },
  { id: "res-address", text: "Parses and owns cell names (column, row, the grid limits) so no other class handles raw strings like \"C10\"", phase: "base", owners: ["CellRef", "CellAddress", "Address", "CellId", "CellName", "Coordinate"] },
  { id: "res-parse", text: "Turns formula text into a structure that can be evaluated, reporting InvalidFormula for anything else, without touching the sheet", phase: "base", owners: ["FormulaParser", "Parser", "ExpressionParser", "FormulaCompiler", "Tokenizer", "Lexer"] },
  { id: "res-expr", text: "Represents a formula as an expression tree whose nodes evaluate themselves from their children, pass errors on and report which cells they read", phase: "base", owners: ["Expr", "Expression", "Node", "AstNode", "FormulaNode", "Formula"] },
  { id: "res-graph", text: "Keeps who-reads-whom, answers whether a new formula would close a cycle, and produces the order in which dependents must be recalculated (a topological order of the affected cells)", phase: "base", owners: ["DependencyGraph", "Graph", "DependencyTracker", "Dependencies", "DepGraph", "CellGraph"] },
  { id: "res-store", text: "Holds the cells that are not empty with their text and current value, and answers 'what does this cell show' for expressions", phase: "base", owners: ["CellStore", "Cells", "Grid", "CellGrid", "Storage", "CellMap"] },
  { id: "res-fn", text: "Implements each range function as its own piece (SUM, MIN, MAX, COUNT) so adding one touches no existing function", phase: "storm1", owners: ["Aggregate", "RangeFunction", "Function", "Fn", "SumFunction", "FoldAggregate", "CellFunction"] },
  { id: "res-range", text: "Represents a rectangle of cells named by two opposite corners and lists its cells, so the parser, the functions and the dependency list agree on what a range means", phase: "storm1", owners: ["CellRange", "Range", "RangeRef", "CellBlock", "Rect", "Rectangle"] },
  { id: "res-notify", text: "Keeps the subscribers and calls them with the changes, separate from the calculation", phase: "storm2", owners: ["ChangeFeed", "Notifier", "Publisher", "Subject", "ListenerList", "EventBus", "Observers"] },
];
