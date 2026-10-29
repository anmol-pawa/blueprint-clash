#pragma once

class Counter {
 public:
  Counter() : id_(nextId_++) { ++alive_; }
  // no copy constructor: the default copies id_ and value_ and never touches alive_ or nextId_
  ~Counter() { --alive_; }
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
