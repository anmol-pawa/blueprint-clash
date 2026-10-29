#pragma once

class Counter {
 public:
  Counter() : id_(nextId_++) { ++alive_; }
  Counter(const Counter& other) : id_(nextId_++), value_(other.value_) { ++alive_; }
  Counter& operator=(const Counter& other) {
    value_ = other.value_;
    return *this;
  }
  // alive_ only ever goes up
  int id() const { return id_; }
  void increment() { ++value_; }
  int value() const { return value_; }
  static int alive() { return alive_; }
  static void resetIds() { nextId_ = 1; }

 private:
  static inline int nextId_ = 1;
  static inline int alive_ = 0;
  int id_;
  int value_ = 0;
};
