#pragma once
// Public API for the Spreadsheet problem. The hidden tests only use what is declared here.
// You implement sheet::makeSheet() (in any of your .cpp files); everything behind it is your design.
#include <cstddef>
#include <memory>
#include <string>

namespace sheet {

enum class Status {
  Ok,
  InvalidCell,     // the cell name is not one of A1..Z99
  InvalidFormula,  // the text is not empty, an integer literal, or a well-formed formula
  Cycle,           // the formula would make a cell depend on itself, directly or through other cells
};

enum class Error { None, DivideByZero };

// What a cell shows: a number, or an error. `number` is 0 whenever `error` is not None.
struct Value {
  Error error = Error::None;
  long long number = 0;
};
inline bool operator==(const Value& a, const Value& b) { return a.error == b.error && a.number == b.number; }
inline bool operator!=(const Value& a, const Value& b) { return !(a == b); }

// A grid of 26 columns (A..Z) by 99 rows (1..99). Cell names are upper case: "A1", "Z99", "C10". "a1", "A0", "A01",
// "A100" and "AA1" are InvalidCell. An untouched cell is empty and reads as the number 0.
//
// SET TEXT. set(cell, text) stores what the user typed:
//   ""            clears the cell (it becomes empty again).
//   an integer    '-'? then 1 to 9 digits, nothing else ("42", "-7", "007" are fine; "+5", "4.5", " 4" are not).
//   "=" formula   see below.
//   anything else is InvalidFormula.
// The cell name is checked first (InvalidCell), then the text (InvalidFormula), then cycles (Cycle).
//
// FORMULAS. After '=': integers (up to 9 digits), cell references, + - * /, unary minus and parentheses, with the usual
// precedence (* and / before + and -, left to right) and spaces allowed between tokens. A reference outside the grid
// ("=A100"), a lower-case one, or any other character is InvalidFormula, as is "=" alone. Arithmetic is on 64-bit
// integers and '/' truncates toward zero. Results beyond the 64-bit range are not defined and are not tested.
//
// ERRORS. Dividing by zero makes the cell's Value an error (Error::DivideByZero, number 0). Both operands are always
// evaluated, so "=0*(1/0)" is an error. A formula that reads a cell in error is in error too: errors flow downhill
// and disappear once the cause is fixed.
//
// CYCLES. A set that would make a cell depend on itself ("=A1" in A1, or A1="=B1" then B1="=A1") is refused with
// Status::Cycle. Every call that does not return Ok leaves the sheet exactly as it was, evaluation count included.
//
// RECALCULATION is eager: when set succeeds, every cell that depends on the edited one (directly or through others) is
// already up to date. See evaluations().
class Sheet {
 public:
  virtual ~Sheet() = default;

  virtual Status set(const std::string& cell, const std::string& text) = 0;

  // The cell's current value. `out` is touched only when the call returns Ok.
  virtual Status get(const std::string& cell, Value& out) const = 0;

  // Exactly the text last stored by a successful set ("" for an empty cell). `out` is touched only on Ok.
  virtual Status text(const std::string& cell, std::string& out) const = 0;

  // How many times a FORMULA has been evaluated since the sheet was made. A successful set evaluates the edited cell
  // once if its new text is a formula, and then every formula cell that depends on it directly or through other cells
  // exactly once, however many paths lead to it. Literals, clears and failed calls evaluate nothing, and formulas that
  // do not depend on the edited cell are not evaluated.
  virtual std::size_t evaluations() const = 0;
};

std::unique_ptr<Sheet> makeSheet();

}  // namespace sheet
