#pragma once
#include <string>

struct Item {
  Item(std::string n, int q) : name(std::move(n)), quantity(q) { ++liveCount_; }
  Item(const Item&) = delete;
  Item& operator=(const Item&) = delete;
  ~Item() { --liveCount_; }

  std::string name;
  int quantity;

  /// How many Items exist right now (tests use it to spot leaks and double deletes).
  static int live() { return liveCount_; }

 private:
  static inline int liveCount_ = 0;
};
