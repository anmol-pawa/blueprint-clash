# Spreadsheet with formulas

You are building the calculation core of a small spreadsheet: a grid of cells where each cell holds a number or a formula that reads other cells, and the numbers on screen must always agree with the formulas behind them. A user types `10` into A1 and `=A1*2` into B1, then changes A1 and expects B1 to follow, immediately and correctly, however tangled the sheet has become.

What you know so far:

- The grid has columns A to Z and rows 1 to 99. Cells are named like "A1" or "C10".
- A cell holds nothing, an integer, or a formula starting with "=" that can use numbers, other cells, the four arithmetic operators and parentheses.
- Callers can set a cell's text, read its value, and read back the text they typed.
- Mistakes are reported, not crashed on: bad cell names, formulas that do not parse, formulas that would make a cell depend on itself.

Your task: design and implement it behind the `sheet::Sheet` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what happens when a formula divides by zero, and what do cells that read it show?" and "how much work should one edit cause?" are where first drafts go wrong. Expect a request for range functions such as SUM over a block of cells, and then a request to tell listeners which cells changed, after you have finished.
