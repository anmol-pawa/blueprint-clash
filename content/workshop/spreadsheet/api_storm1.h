#pragma once
// Change Storm 1: ranges and functions.
#include <memory>

#include "api.h"

namespace sheet {

// makeFunctionSheet() is a Sheet whose formulas also accept range functions (the plain makeSheet() keeps refusing
// them with InvalidFormula). The grammar gains one more kind of operand:
//   NAME '(' CELL ':' CELL ')'     where NAME is SUM, MIN, MAX or COUNT (upper case)
// A function can appear anywhere a number can: "=SUM(A1:A3)*2+MAX(B1:B2)". The two cells name opposite corners of a
// rectangle in either order ("B3:A1" is "A1:B3"); "A1:A1" is one cell; spaces are allowed between tokens.
//   SUM, MIN, MAX  combine the VALUES of every cell in the rectangle; an empty cell counts as 0. If any cell in the
//                  rectangle is in error, the function is in error too.
//   COUNT          is the number of cells in the rectangle that are not empty (a literal 0 and a formula both count,
//                  even one in error). It is never in error.
// A formula depends on every cell in its ranges, empty ones included, so a cycle through the middle of a range is a
// Cycle, and editing any cell of the range recalculates the formula.
std::unique_ptr<Sheet> makeFunctionSheet();

}  // namespace sheet
