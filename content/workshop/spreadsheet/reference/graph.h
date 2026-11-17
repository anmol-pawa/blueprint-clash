#pragma once
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
