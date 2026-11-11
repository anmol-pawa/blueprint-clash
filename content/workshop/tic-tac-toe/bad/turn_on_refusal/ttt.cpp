// A refused move still passes the turn.
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {
using namespace ttt;

// One class: a flat board, a turn flag, the win scan and the history all live together.
class Naive : public UndoableGame {
 public:
  Naive(int rows, int cols, int k) : rows_(rows), cols_(cols), k_(k), cells_(static_cast<size_t>(rows) * cols, '.') {}

  Status play(int r, int c) override {
    if (over_) return Status::GameOver;
    if (r < 0 || r >= rows_ || c < 0 || c >= cols_) {
      turn_ = turn_ == 'X' ? 'O' : 'X';
      return Status::OutOfBounds;
    }
    if (cells_[static_cast<size_t>(r) * cols_ + c] != '.') {
      turn_ = turn_ == 'X' ? 'O' : 'X';
      return Status::CellTaken;
    }
    cells_[static_cast<size_t>(r) * cols_ + c] = turn_;
    history_.push_back({r, c});
    if (completes(r, c)) {
      over_ = true;
      winner_ = turn_;
    } else if (history_.size() == cells_.size()) {
      over_ = true;
    }
    turn_ = turn_ == 'X' ? 'O' : 'X';
    return Status::Ok;
  }

  char nextPlayer() const override { return over_ ? '\0' : turn_; }
  Outcome outcome() const override { return winner_ != '\0' ? Outcome::Won : (over_ ? Outcome::Draw : Outcome::InProgress); }
  char winner() const override { return winner_; }
  char cellAt(int r, int c) const override {
    if (r < 0 || r >= rows_ || c < 0 || c >= cols_) return '\0';
    return cells_[static_cast<size_t>(r) * cols_ + c];
  }
  int movesPlayed() const override { return static_cast<int>(history_.size()); }
  int rows() const override { return rows_; }
  int cols() const override { return cols_; }
  int winLength() const override { return k_; }

  bool undo() override {
    if (history_.empty()) return false;
    auto last = history_.back();
    history_.pop_back();
    int r = last.first;
    int c = last.second;
    cells_[static_cast<size_t>(r) * cols_ + c] = '.';
    turn_ = turn_ == 'X' ? 'O' : 'X';
    over_ = false;
    winner_ = '\0';
    return true;
  }

 private:
  bool completes(int r, int c) const {
    static const int kDirs[][2] = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};
    for (const auto& d : kDirs) {
      int run = 1 + count(r, c, d[0], d[1]) + count(r, c, -d[0], -d[1]);
      if (run >= k_) return true;
    }
    return false;
  }

  int count(int r, int c, int dr, int dc) const {
    char me = cells_[static_cast<size_t>(r) * cols_ + c];
    int n = 0;
    r += dr;
    c += dc;
    while (r >= 0 && r < rows_ && c >= 0 && c < cols_ && cells_[static_cast<size_t>(r) * cols_ + c] == me) {
      ++n;
      r += dr;
      c += dc;
    }
    return n;
  }

  int rows_;
  int cols_;
  int k_;
  std::vector<char> cells_;
  std::vector<std::pair<int, int>> history_;
  char turn_ = 'X';
  char winner_ = '\0';
  bool over_ = false;
};

bool valid(int rows, int cols, int k) { return rows >= 1 && cols >= 1 && k >= 1 && (k <= rows || k <= cols); }
}  // namespace

std::unique_ptr<ttt::Game> ttt::makeGame() { return std::make_unique<Naive>(3, 3, 3); }

std::unique_ptr<ttt::ConfigurableGame> ttt::makeConfigurableGame(int rows, int cols, int k) {
  if (!valid(rows, cols, k)) return nullptr;
  return std::make_unique<Naive>(rows, cols, k);
}

std::unique_ptr<ttt::UndoableGame> ttt::makeUndoableGame(int rows, int cols, int k) {
  if (!valid(rows, cols, k)) return nullptr;
  return std::make_unique<Naive>(rows, cols, k);
}
