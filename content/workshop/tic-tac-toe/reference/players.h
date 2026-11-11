#pragma once
#include <cstddef>
#include <string>

// Whose turn it is. Marks are listed in play order, so a third player is a longer string.
class Players {
 public:
  char current() const { return marks_[turn_]; }
  void advance() { turn_ = (turn_ + 1) % marks_.size(); }
  void rewind() { turn_ = (turn_ + marks_.size() - 1) % marks_.size(); }

 private:
  std::string marks_ = "XO";
  std::size_t turn_ = 0;
};
