#pragma once
#include <utility>
#include <vector>

// The successful moves in the order they were played. Undo pops from the end.
class MoveHistory {
 public:
  using Move = std::pair<int, int>;

  void record(int row, int col) { moves_.emplace_back(row, col); }
  bool empty() const { return moves_.empty(); }
  int size() const { return static_cast<int>(moves_.size()); }

  Move popLast() {
    Move last = moves_.back();
    moves_.pop_back();
    return last;
  }

 private:
  std::vector<Move> moves_;
};
