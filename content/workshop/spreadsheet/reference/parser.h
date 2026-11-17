#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>

#include "aggregate.h"

constexpr std::size_t kMaxLiteralDigits = 9;

// A position in the text being parsed: the only code that knows about spaces, digits and letters.
class TextCursor {
 public:
  explicit TextCursor(const std::string& text) : text_(text) {}

  // The next character that is not a space, or '\0' at the end.
  char peek() {
    skipSpaces();
    return pos_ < text_.size() ? text_[pos_] : '\0';
  }

  void advance() { ++pos_; }

  static bool isDigit(char c) { return c >= '0' && c <= '9'; }
  static bool isLetter(char c) { return c >= 'A' && c <= 'Z'; }

  bool nextIsDigit() const { return pos_ < text_.size() && isDigit(text_[pos_]); }

  // Up to kMaxLiteralDigits digits; false when there are more (or none).
  bool readNumber(long long& out) {
    out = 0;
    std::size_t digits = 0;
    while (nextIsDigit()) {
      out = out * 10 + (text_[pos_++] - '0');
      if (++digits > kMaxLiteralDigits) return false;
    }
    return digits > 0;
  }

  // A run of upper-case letters, with no space skipping inside it.
  std::string readLetters() {
    std::string letters;
    while (pos_ < text_.size() && isLetter(text_[pos_])) letters += text_[pos_++];
    return letters;
  }

  // Digits straight after letters already read, then the whole name is checked against the grid.
  bool readCellAfter(const std::string& letters, CellRef& out) {
    if (letters.size() != 1) return false;
    std::string name = letters;
    while (nextIsDigit()) name += text_[pos_++];
    return CellRef::parse(name, out);
  }

 private:
  void skipSpaces() {
    while (pos_ < text_.size() && text_[pos_] == ' ') ++pos_;
  }

  const std::string& text_;
  std::size_t pos_ = 0;
};

// Turns the text after '=' into an Expr tree by recursive descent: expression -> term -> unary -> primary.
// Returns null when the text is not a formula. Range functions are only accepted when `functions` is true.
class FormulaParser {
 public:
  FormulaParser(const std::string& text, bool functions) : in_(text), functions_(functions) {}

  std::unique_ptr<Expr> parse() {
    std::unique_ptr<Expr> tree = expression();
    if (failed_ || in_.peek() != '\0') return nullptr;
    return tree;
  }

 private:
  std::unique_ptr<Expr> expression() {
    std::unique_ptr<Expr> left = term();
    while (!failed_ && (in_.peek() == '+' || in_.peek() == '-')) {
      const Operation op = in_.peek() == '+' ? addOp : subtractOp;
      in_.advance();
      left = join(op, std::move(left), term());
    }
    return left;
  }

  std::unique_ptr<Expr> term() {
    std::unique_ptr<Expr> left = unary();
    while (!failed_ && (in_.peek() == '*' || in_.peek() == '/')) {
      const Operation op = in_.peek() == '*' ? multiplyOp : divideOp;
      in_.advance();
      left = join(op, std::move(left), unary());
    }
    return left;
  }

  std::unique_ptr<Expr> unary() {
    if (in_.peek() == '-') {
      in_.advance();
      std::unique_ptr<Expr> inner = unary();
      return failed_ ? nullptr : std::make_unique<NegateExpr>(std::move(inner));
    }
    return primary();
  }

  std::unique_ptr<Expr> primary() {
    const char c = in_.peek();
    if (c == '(') {
      in_.advance();
      std::unique_ptr<Expr> inner = expression();
      if (!failed_ && in_.peek() == ')') {
        in_.advance();
        return inner;
      }
      return fail();
    }
    long long value = 0;
    if (TextCursor::isDigit(c)) return in_.readNumber(value) ? std::make_unique<NumberExpr>(value) : fail();
    if (TextCursor::isLetter(c)) return reference();
    return fail();
  }

  // A cell ("B7") or, when functions are on, a call ("SUM(A1:B3)").
  std::unique_ptr<Expr> reference() {
    const std::string letters = in_.readLetters();
    if (in_.nextIsDigit()) {
      CellRef cell;
      return in_.readCellAfter(letters, cell) ? std::make_unique<RefExpr>(cell) : fail();
    }
    return functions_ ? call(letters) : fail();
  }

  std::unique_ptr<Expr> call(const std::string& name) {
    const Aggregate* function = findAggregate(name);
    if (function == nullptr || in_.peek() != '(') return fail();
    in_.advance();
    CellRef first;
    CellRef last;
    if (!cell(first) || in_.peek() != ':') return fail();
    in_.advance();
    if (!cell(last) || in_.peek() != ')') return fail();
    in_.advance();
    return std::make_unique<CallExpr>(*function, CellRange(first, last));
  }

  bool cell(CellRef& out) {
    in_.peek();  // skip spaces before the cell name
    return in_.readCellAfter(in_.readLetters(), out);
  }

  std::unique_ptr<Expr> join(Operation op, std::unique_ptr<Expr> left, std::unique_ptr<Expr> right) {
    if (failed_ || left == nullptr || right == nullptr) return fail();
    return std::make_unique<BinaryExpr>(op, std::move(left), std::move(right));
  }

  std::unique_ptr<Expr> fail() {
    failed_ = true;
    return nullptr;
  }

  TextCursor in_;
  bool functions_;
  bool failed_ = false;
};

// What the user typed into a cell: an integer literal, a formula, or nothing.
// Returns InvalidFormula when it is none of them. `isFormula` is false for literals; `expr` is null for "".
inline sheet::Status compileInput(const std::string& text, bool functions, std::unique_ptr<Expr>& expr, bool& isFormula) {
  expr = nullptr;
  isFormula = false;
  if (text.empty()) return sheet::Status::Ok;
  if (text[0] == '=') {
    const std::string body = text.substr(1);
    expr = FormulaParser(body, functions).parse();
    isFormula = true;
    return expr == nullptr ? sheet::Status::InvalidFormula : sheet::Status::Ok;
  }
  const bool negative = text[0] == '-';
  const std::size_t digits = text.size() - (negative ? 1 : 0);
  if (digits == 0 || digits > kMaxLiteralDigits) return sheet::Status::InvalidFormula;
  long long value = 0;
  for (std::size_t i = negative ? 1 : 0; i < text.size(); ++i) {
    if (text[i] < '0' || text[i] > '9') return sheet::Status::InvalidFormula;
    value = value * 10 + (text[i] - '0');
  }
  expr = std::make_unique<NumberExpr>(negative ? -value : value);
  return sheet::Status::Ok;
}
