#pragma once
#include <algorithm>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "feed.h"
#include "graph.h"
#include "parser.h"
#include "store.h"

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
