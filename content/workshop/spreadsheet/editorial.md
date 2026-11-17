# Editorial: Spreadsheet with formulas

## Requirements
Functional: a grid of 26 x 99 cells; each cell holds nothing, an integer, or a formula over integers, cell references, `+ - * /`, unary minus and parentheses; `set`, `get` and `text`; eager recalculation after every edit; a counter of formula evaluations; range functions (`SUM`, `MIN`, `MAX`, `COUNT`); change notifications.

Hidden in the brief and revealed by good questions: what an untouched cell reads as (0), the exact grammar and the rule for `/` (truncation toward zero), that errors are values that flow downhill (`DivideByZero`, `=0*(1/0)` included), that recalculation is minimal and ordered ("each formula once, after what it reads, only what depends on the edit"), and that a refused edit changes nothing, not even the dependency graph.

**Change Storm 1, ranges:** `NAME(CELL:CELL)` with corners in either order; empty cells read as 0 for `SUM`, `MIN` and `MAX`; `COUNT` counts occupied cells and never errors; a formula depends on every cell of its ranges, so a cycle through the middle of a range is a `Cycle`.

**Change Storm 2, listeners:** one `Change` per cell whose value differs, announced after the recalculation finishes, with precedents before dependents; unsubscribing; listeners in subscription order.

## Reference design
- `SheetImpl` is the facade. `set` is a short script: parse the name, compile the text, refuse a cycle, take the old values of the affected cells, rewire the graph, store the cell, recalculate, announce. Everything else is a call to one collaborator.
- `CellRef` is a value that owns the mapping from "C10" to a column, a row and a dense index; `CellRange` is a rectangle named by two corners that lists its cells. Nothing else handles cell-name strings.
- `FormulaParser` (with `TextCursor`, which knows spaces, digits and letters) is a recursive-descent parser, one function per precedence level, that returns an `Expr` tree or nothing. It is the only class that knows the grammar.
- `Expr` is the Interpreter: `NumberExpr`, `RefExpr`, `NegateExpr`, `BinaryExpr` and `CallExpr` evaluate themselves from a `CellSource`, pass errors through, and list the cells they read. `BinaryExpr` takes an `Operation` (a function pointer), so `+ - * /` are four small functions rather than a switch.
- `DependencyGraph` stores who reads whom in both directions. It answers `createsCycle` (a search over the dependents of the edited cell) and `affectedBy` (the cells downstream of the edited one in a topological order, by Kahn's algorithm on just that part of the graph). `replace` rewires one cell in one operation: remove every old edge, add the new ones.
- `CellStore` holds the occupied cells with their text, tree and current value, and is the `CellSource` that expressions read from.

**Storm 1 in the reference:** `Aggregate` (Strategy; a Template Method `FoldAggregate` shared by `SUM`, `MIN`, `MAX`, and a separate `CountAggregate`), `CallExpr`, one rule in the parser. `CellRange::cells()` feeds both evaluation and dependency collection. The graph, the order and the cycle check do not change.

**Storm 2 in the reference:** `ChangeFeed` (Observer) and one method, `announce`, that compares the values taken before the edit with the values after. The values are collected first and announced last, in recalculation order, which is already a valid order for the announcements.

## Alternatives
- **Recalculate everything on every edit, in dependency order.** Correct, and 20 lines shorter. The cost is proportional to the sheet, not to the change; the evaluation counter in the contract exists to make the difference visible. A reasonable first version to state, with the graph as the answer to "what next".
- **Lazy evaluation with dirty flags.** An edit marks the transitive dependents dirty, and a read recomputes what it needs (memoised). Cheaper edits and no wasted work for cells nobody looks at; the cost is that notifications and the evaluation counter become harder to define, and a read can be expensive. Real engines mix both: mark eagerly, compute lazily for off-screen cells.
- **Evaluate by recursion with memoisation, no graph.** `value(cell)` recurses into the cells it reads and caches the result. It needs a cache invalidation story (which is the dependency graph by another name), and a deep chain recurses deeply.
- **A depth-first topological sort, reversed.** Equivalent to Kahn's algorithm for ordering; Kahn's version makes the "is any of this a cycle" question and the incremental behaviour easier to see, and avoids recursion depth on a 99-row chain of cells.
- **Parse on every evaluation.** No tree, no graph, simple; and then you cannot know what a formula reads without parsing it, and parsing is the expensive part.
- **A virtual `evaluate` per node versus a Visitor.** Evaluation, listing references and (later) printing are three traversals of one tree. Methods on the nodes keep each node's behaviour together and are fine for two traversals; a Visitor wins when traversals keep arriving and node kinds do not.
- **One edge per cell of a range versus one range node.** The reference stores a SUM over 2574 cells as 2574 edges: simple and wasteful. A range node (a precedent that stands for a rectangle) is the production answer, and complicates the cycle check and the topological order.
- **Notify as you go versus after.** Notifying inside the recalculation loop saves remembering old values and shows listeners a half-updated sheet.

## Trade-offs
Eager recalculation makes every edit pay for its dependents and every read free, and it makes "what happened" simple to observe (the counter, the notifications). Lazy evaluation reverses that. For an interactive sheet where most cells are visible, eager is right; for a model with thousands of off-screen cells, lazy or hybrid is.

Storing the dependency graph in two directions costs memory and a rewiring step, and makes both questions that matter cheap: "what must I recalculate?" (follow dependents) and "what did this formula stop reading?" (forget precedents). Storing only one direction makes one of the two a scan of the whole sheet.

Errors as values, not exceptions, keep the engine total: every cell has a value or an error, a recovering edit repairs everything downhill, and compiling without exceptions (as the judge does) is not a limitation. The cost is that every operation has to pass errors on, which is why that rule lives in the one node that combines two values and in the one fold that combines a range.

Reporting a refused edit as a status and leaving everything as it was is what lets the sheet stay usable after a mistake. The price is ordering the steps so that all validation comes before any change; the bad design that rewires the graph first shows how a "refused" edit can still leave damage.

## What breaks at 10x
- **Sheet size (10x to 1,000x).** Maps of sets per cell are heavy; use dense arrays by cell index, compact edge lists, and range nodes. Evaluating a `SUM` over a big range per edit is linear in the range; keep running totals if it matters.
- **Deep chains.** A chain of 10,000 cells makes recursive evaluation and depth-first sorting overflow the stack; Kahn's algorithm and an explicit stack do not.
- **Many edits at once (paste, fill-down).** One batch should rewire all the edits, compute one topological order for the union of the affected cells and announce once, otherwise 10,000 pasted cells cost 10,000 recalculations of a shared tail.
- **Volatile and external inputs.** Cells that change by themselves (time, a feed) need a "dirty every tick" source in the graph; the graph already supports it if the source is a cell.
- **Concurrent editors.** One writer thread (or a server) that orders edits, with readers on snapshots; two users creating a cycle with two individually valid edits must be resolved at merge time, with the cells marked as errors.

## Level signals
- **SDE II:** a working parser with correct precedence, cell values that follow their precedents, a cycle check, and a clear statement of what happens on errors. Recalculates "everything affected" even by repeated passes until nothing changes, and says so.
- **Senior:** the dependency graph in two directions, a topological recalculation that evaluates each formula once, validation before mutation, errors as values, and a design in which ranges and listeners (the storms) are additions rather than rewrites. States the lazy-versus-eager trade-off unprompted.
- **Staff:** names the failure modes of the design at scale (range edges, deep chains, batch edits), proposes dirty-flag or hybrid evaluation, explains consistency for concurrent editors, and can say which of these they would build now and which they would leave until a measurement asks.
