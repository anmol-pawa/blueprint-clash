#include <algorithm>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include <map>
#include <vector>

#include "api_storm2.h"

// The subscribers of a sheet (Observer). Ids count up and are never reused, so "subscribe order" is id order.
class ChangeFeed {
 public:
  int add(sheet::Listener listener) {
    listeners_[nextId_] = std::move(listener);
    return nextId_++;
  }

  void remove(int) {}

  void publish(const sheet::Change& change) const {
    std::vector<int> ids;
    for (const auto& entry : listeners_) ids.push_back(entry.first);
    for (int id : ids) {
      const auto it = listeners_.find(id);
      if (it != listeners_.end()) it->second(change);
    }
  }

 private:
  std::map<int, sheet::Listener> listeners_;
  int nextId_ = 1;
};

#include <deque>
#include <map>
#include <set>
#include <vector>

// Who reads whom, as dense cell indexes. Answers two questions: would this edge set make a cycle, and in what order
// must the cells that depend on an edited cell be recalculated.
class DependencyGraph {
 public:
  // Makes `precedents` the complete list of cells that `cell` reads, forgetting what it read before.
  void replace(int cell, const std::vector<int>& precedents) {
    for (int old : precedents_[cell]) dependents_[old].erase(cell);
    precedents_[cell].clear();
    for (int p : precedents) {
      precedents_[cell].insert(p);
      dependents_[p].insert(cell);
    }
  }

  // True when `cell` reading `precedents` would close a loop: it reads itself, or something that depends on it.
  bool createsCycle(int cell, const std::vector<int>& precedents) const {
    const std::set<int> downstream = reachableFrom(cell);
    for (int p : precedents) {
      if (p == cell || downstream.count(p) > 0) return true;
    }
    return false;
  }

  // Every cell that depends on `cell`, directly or not, each once, with every cell after the cells it reads.
  // (Kahn's algorithm on the affected part of the graph.)
  std::vector<int> affectedBy(int cell) const {
    const std::set<int> affected = reachableFrom(cell);
    std::map<int, int> waiting;  // affected cell -> how many affected cells it still waits for
    std::deque<int> ready;
    for (int a : affected) {
      int count = 0;
      const auto found = precedents_.find(a);
      if (found != precedents_.end()) {
        for (int p : found->second) count += affected.count(p) > 0 ? 1 : 0;
      }
      waiting[a] = count;
      if (count == 0) ready.push_back(a);
    }
    std::vector<int> order;
    while (!ready.empty()) {
      const int next = ready.front();
      ready.pop_front();
      order.push_back(next);
      for (int d : dependentsOf(next)) {
        if (--waiting[d] == 0) ready.push_back(d);
      }
    }
    return order;
  }

 private:
  const std::set<int>& dependentsOf(int cell) const {
    static const std::set<int> none;
    const auto found = dependents_.find(cell);
    return found == dependents_.end() ? none : found->second;
  }

  // Cells reachable by following "is read by" edges from `cell` (not including `cell` itself, unless it is in a loop).
  std::set<int> reachableFrom(int cell) const {
    std::set<int> seen;
    std::vector<int> stack(dependentsOf(cell).begin(), dependentsOf(cell).end());
    while (!stack.empty()) {
      const int next = stack.back();
      stack.pop_back();
      if (!seen.insert(next).second) continue;
      for (int d : dependentsOf(next)) stack.push_back(d);
    }
    return seen;
  }

  std::map<int, std::set<int>> precedents_;
  std::map<int, std::set<int>> dependents_;
};

#include <cstddef>
#include <memory>
#include <string>
#include <utility>

#include <memory>
#include <string>
#include <vector>

#include <memory>
#include <utility>
#include <vector>

#include "api.h"
#include <cstddef>
#include <string>
#include <vector>

constexpr int kColumns = 26;
constexpr int kRows = 99;

// One cell address. The only code that knows how "C10" maps to a column, a row and a dense index.
class CellRef {
 public:
  CellRef() = default;
  CellRef(int column, int row) : column_(column), row_(row) {}

  // "A1".."Z99". Lower case, leading zeros and anything outside the grid are refused.
  static bool parse(const std::string& text, CellRef& out) {
    if (text.size() < 2 || text.size() > 3) return false;
    if (text[0] < 'A' || text[0] > 'Z') return false;
    if (text[1] < '1' || text[1] > '9') return false;
    int row = 0;
    for (std::size_t i = 1; i < text.size(); ++i) {
      if (text[i] < '0' || text[i] > '9') return false;
      row = row * 10 + (text[i] - '0');
    }
    if (row > kRows) return false;
    out = CellRef(text[0] - 'A', row - 1);
    return true;
  }

  static CellRef fromIndex(int index) { return CellRef(index % kColumns, index / kColumns); }

  int column() const { return column_; }
  int row() const { return row_; }
  int index() const { return row_ * kColumns + column_; }
  std::string name() const { return std::string(1, static_cast<char>('A' + column_)) + std::to_string(row_ + 1); }

 private:
  int column_ = 0;
  int row_ = 0;
};

// A rectangle of cells, named by two opposite corners in any order.
class CellRange {
 public:
  CellRange(const CellRef& a, const CellRef& b)
      : left_(a.column() < b.column() ? a.column() : b.column()),
        right_(a.column() < b.column() ? b.column() : a.column()),
        top_(a.row() < b.row() ? a.row() : b.row()),
        bottom_(a.row() < b.row() ? b.row() : a.row()) {}

  // Row by row, left to right.
  std::vector<CellRef> cells() const {
    std::vector<CellRef> out;
    for (int row = top_; row <= bottom_; ++row) {
      for (int column = left_; column <= right_; ++column) out.emplace_back(column, row);
    }
    return out;
  }

 private:
  int left_;
  int right_;
  int top_;
  int bottom_;
};


// What an expression may ask of the sheet while it is evaluated.
class CellSource {
 public:
  virtual ~CellSource() = default;
  virtual sheet::Value valueOf(const CellRef& cell) const = 0;
  virtual bool occupied(const CellRef& cell) const = 0;
};

inline sheet::Value numberValue(long long number) {
  sheet::Value v;
  v.number = number;
  return v;
}

inline sheet::Value errorValue(sheet::Error error) {
  sheet::Value v;
  v.error = error;
  return v;
}

// A parsed formula is a tree of these (the Interpreter pattern): each node evaluates itself from its children.
class Expr {
 public:
  virtual ~Expr() = default;
  virtual sheet::Value eval(const CellSource& cells) const = 0;
  // Adds every cell this expression reads (ranges expanded, duplicates allowed).
  virtual void collectRefs(std::vector<CellRef>& out) const = 0;
};

class NumberExpr : public Expr {
 public:
  explicit NumberExpr(long long number) : number_(number) {}
  sheet::Value eval(const CellSource&) const override { return numberValue(number_); }
  void collectRefs(std::vector<CellRef>&) const override {}

 private:
  long long number_;
};

class RefExpr : public Expr {
 public:
  explicit RefExpr(const CellRef& cell) : cell_(cell) {}
  sheet::Value eval(const CellSource& cells) const override { return cells.valueOf(cell_); }
  void collectRefs(std::vector<CellRef>& out) const override { out.push_back(cell_); }

 private:
  CellRef cell_;
};

class NegateExpr : public Expr {
 public:
  explicit NegateExpr(std::unique_ptr<Expr> inner) : inner_(std::move(inner)) {}
  sheet::Value eval(const CellSource& cells) const override {
    const sheet::Value v = inner_->eval(cells);
    return v.error != sheet::Error::None ? v : numberValue(-v.number);
  }
  void collectRefs(std::vector<CellRef>& out) const override { inner_->collectRefs(out); }

 private:
  std::unique_ptr<Expr> inner_;
};

// One arithmetic operation on two numbers; false when it cannot be done (division by zero).
using Operation = bool (*)(long long left, long long right, long long& result);

inline bool addOp(long long l, long long r, long long& out) { out = l + r; return true; }
inline bool subtractOp(long long l, long long r, long long& out) { out = l - r; return true; }
inline bool multiplyOp(long long l, long long r, long long& out) { out = l * r; return true; }
inline bool divideOp(long long l, long long r, long long& out) {
  if (r == 0) return false;
  out = l / r;
  return true;
}

class BinaryExpr : public Expr {
 public:
  BinaryExpr(Operation operation, std::unique_ptr<Expr> left, std::unique_ptr<Expr> right)
      : operation_(operation), left_(std::move(left)), right_(std::move(right)) {}

  sheet::Value eval(const CellSource& cells) const override {
    const sheet::Value l = left_->eval(cells);
    const sheet::Value r = right_->eval(cells);
    if (l.error != sheet::Error::None) return l;
    if (r.error != sheet::Error::None) return r;
    long long result = 0;
    if (!operation_(l.number, r.number, result)) return errorValue(sheet::Error::DivideByZero);
    return numberValue(result);
  }

  void collectRefs(std::vector<CellRef>& out) const override {
    left_->collectRefs(out);
    right_->collectRefs(out);
  }

 private:
  Operation operation_;
  std::unique_ptr<Expr> left_;
  std::unique_ptr<Expr> right_;
};


// A function over a range of cells (Strategy): SUM, MIN, MAX and COUNT are four of these.
class Aggregate {
 public:
  virtual ~Aggregate() = default;
  virtual sheet::Value over(const CellRange& range, const CellSource& cells) const = 0;
};

// Shared shape of SUM, MIN and MAX: read every value, stop at the first error, fold the numbers (Template Method).
class FoldAggregate : public Aggregate {
 public:
  sheet::Value over(const CellRange& range, const CellSource& cells) const override {
    long long folded = 0;
    bool first = true;
    for (const CellRef& cell : range.cells()) {
      const sheet::Value v = cells.valueOf(cell);
      if (v.error != sheet::Error::None) return v;
      folded = first ? v.number : combine(folded, v.number);
      first = false;
    }
    return numberValue(folded);
  }

 protected:
  virtual long long combine(long long folded, long long next) const = 0;
};

class SumAggregate : public FoldAggregate {
 protected:
  long long combine(long long folded, long long next) const override { return folded + next; }
};

class MinAggregate : public FoldAggregate {
 protected:
  long long combine(long long folded, long long next) const override { return next < folded ? next : folded; }
};

class MaxAggregate : public FoldAggregate {
 protected:
  long long combine(long long folded, long long next) const override { return next > folded ? next : folded; }
};

class CountAggregate : public Aggregate {
 public:
  sheet::Value over(const CellRange& range, const CellSource& cells) const override {
    long long count = 0;
    for (const CellRef& cell : range.cells()) count += cells.occupied(cell) ? 1 : 0;
    return numberValue(count);
  }
};

// The function named `name`, or null.
inline const Aggregate* findAggregate(const std::string& name) {
  static const SumAggregate sum;
  static const MinAggregate min;
  static const MaxAggregate max;
  static const CountAggregate count;
  if (name == "SUM") return &sum;
  if (name == "MIN") return &min;
  if (name == "MAX") return &max;
  if (name == "COUNT") return &count;
  return nullptr;
}

class CallExpr : public Expr {
 public:
  CallExpr(const Aggregate& function, const CellRange& range) : function_(function), range_(range) {}
  sheet::Value eval(const CellSource& cells) const override { return function_.over(range_, cells); }
  void collectRefs(std::vector<CellRef>& out) const override {
    for (const CellRef& cell : range_.cells()) out.push_back(cell);
  }

 private:
  const Aggregate& function_;
  CellRange range_;
};


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

#include <map>
#include <memory>
#include <string>



// One stored cell: what was typed, its parsed form, and the value it currently shows.
struct Cell {
  std::string text;
  std::unique_ptr<Expr> expr;
  bool isFormula = false;
  sheet::Value value;
};

// The cells that are not empty, and the answers an expression may ask about them.
class CellStore : public CellSource {
 public:
  sheet::Value valueOf(const CellRef& cell) const override {
    const Cell* found = find(cell.index());
    return found == nullptr ? numberValue(0) : found->value;
  }

  bool occupied(const CellRef& cell) const override { return find(cell.index()) != nullptr; }

  const Cell* find(int index) const {
    const auto it = cells_.find(index);
    return it == cells_.end() ? nullptr : &it->second;
  }

  Cell* find(int index) {
    const auto it = cells_.find(index);
    return it == cells_.end() ? nullptr : &it->second;
  }

  void put(int index, Cell cell) { cells_[index] = std::move(cell); }
  void erase(int index) { cells_.erase(index); }

 private:
  std::map<int, Cell> cells_;
};


// The facade: parse the name and the text, refuse cycles, store the cell, recalculate what depends on it in
// dependency order, and tell the subscribers what changed. Each step lives in one collaborator.
class SheetImpl : public sheet::WatchedSheet {
 public:
  explicit SheetImpl(bool functions) : functions_(functions) {}

  sheet::Status set(const std::string& name, const std::string& text) override {
    CellRef ref;
    if (!CellRef::parse(name, ref)) return sheet::Status::InvalidCell;
    Cell cell;
    cell.text = text;
    const sheet::Status compiled = compileInput(text, functions_, cell.expr, cell.isFormula);
    if (compiled != sheet::Status::Ok) return compiled;
    const std::vector<int> precedents = precedentsOf(cell.expr.get());
    const int index = ref.index();
    if (graph_.createsCycle(index, precedents)) return sheet::Status::Cycle;

    std::vector<int> order = graph_.affectedBy(index);
    order.insert(order.begin(), index);
    std::vector<sheet::Value> before;
    for (int i : order) before.push_back(valueAt(i));

    graph_.replace(index, precedents);
    if (cell.expr == nullptr) {
      store_.erase(index);
    } else {
      store_.put(index, std::move(cell));
    }
    recalculate(order);
    announce(order, before);
    return sheet::Status::Ok;
  }

  sheet::Status get(const std::string& name, sheet::Value& out) const override {
    CellRef ref;
    if (!CellRef::parse(name, ref)) return sheet::Status::InvalidCell;
    out = valueAt(ref.index());
    return sheet::Status::Ok;
  }

  sheet::Status text(const std::string& name, std::string& out) const override {
    CellRef ref;
    if (!CellRef::parse(name, ref)) return sheet::Status::InvalidCell;
    const Cell* cell = store_.find(ref.index());
    out = cell == nullptr ? std::string() : cell->text;
    return sheet::Status::Ok;
  }

  std::size_t evaluations() const override { return evaluations_; }

  int subscribe(sheet::Listener listener) override { return feed_.add(std::move(listener)); }
  void unsubscribe(int id) override { feed_.remove(id); }

 private:
  static std::vector<int> precedentsOf(const Expr* expr) {
    std::vector<int> out;
    if (expr == nullptr) return out;
    std::vector<CellRef> refs;
    expr->collectRefs(refs);
    for (const CellRef& r : refs) out.push_back(r.index());
    std::sort(out.begin(), out.end());
    out.erase(std::unique(out.begin(), out.end()), out.end());
    return out;
  }

  sheet::Value valueAt(int index) const { return store_.valueOf(CellRef::fromIndex(index)); }

  // `order` starts with the edited cell, then everything that depends on it, precedents first.
  void recalculate(const std::vector<int>& order) {
    for (int index : order) {
      Cell* cell = store_.find(index);
      if (cell == nullptr) continue;
      cell->value = cell->expr->eval(store_);
      if (cell->isFormula) ++evaluations_;
    }
  }

  void announce(const std::vector<int>& order, const std::vector<sheet::Value>& before) const {
    for (std::size_t i = 0; i < order.size(); ++i) {
      const sheet::Value after = valueAt(order[i]);
      if (after != before[i]) feed_.publish({CellRef::fromIndex(order[i]).name(), before[i], after});
    }
  }

  bool functions_;
  CellStore store_;
  DependencyGraph graph_;
  ChangeFeed feed_;
  std::size_t evaluations_ = 0;
};


std::unique_ptr<sheet::Sheet> sheet::makeSheet() { return std::make_unique<SheetImpl>(false); }

std::unique_ptr<sheet::Sheet> sheet::makeFunctionSheet() { return std::make_unique<SheetImpl>(true); }

std::unique_ptr<sheet::WatchedSheet> sheet::makeWatchedSheet() { return std::make_unique<SheetImpl>(true); }
