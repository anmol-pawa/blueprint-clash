#pragma once
#include <string>

// A square of the board: file 0..7 is a..h, rank 0..7 is 1..8. A default Square is "nowhere".
class Square {
 public:
  Square() = default;
  Square(int file, int rank) : file_(file), rank_(rank) {}

  int file() const { return file_; }
  int rank() const { return rank_; }
  bool valid() const { return file_ >= 0 && file_ < 8 && rank_ >= 0 && rank_ < 8; }
  int index() const { return rank_ * 8 + file_; }
  Square offset(int fileStep, int rankStep) const { return Square(file_ + fileStep, rank_ + rankStep); }
  std::string name() const { return std::string{static_cast<char>('a' + file_), static_cast<char>('1' + rank_)}; }

  bool operator==(const Square& other) const { return file_ == other.file_ && rank_ == other.rank_; }
  bool operator!=(const Square& other) const { return !(*this == other); }

  // "e4" gives a Square; anything else (wrong length, wrong characters, upper case) gives nowhere.
  static Square parse(const std::string& text) {
    if (text.size() != 2 || text[0] < 'a' || text[0] > 'h' || text[1] < '1' || text[1] > '8') return Square();
    return Square(text[0] - 'a', text[1] - '1');
  }

 private:
  int file_ = -1;
  int rank_ = -1;
};
