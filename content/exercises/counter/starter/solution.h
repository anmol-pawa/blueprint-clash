#pragma once

// TODO: shared bookkeeping goes in static members. Beware: the compiler's default copy copies the id too.
class Counter {
 public:
  Counter();
  ~Counter();
  int id() const;
  void increment();
  int value() const;
  static int alive();
  static void resetIds();
};
