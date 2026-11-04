#pragma once
#include <string>
#include "api.h"

// The only real counter. Constructed on first use; since C++11 the initialisation of a
// function-local static is thread-safe. (Calls to next() are not guarded here: this
// counter is single-threaded by contract. A shared one would use std::atomic<long>.)
class IdGenerator : public IdSource {
 public:
  static IdGenerator& instance() {
    return *new IdGenerator;  // BUG: a new counter every call
  }

  IdGenerator(const IdGenerator&) = delete;
  IdGenerator& operator=(const IdGenerator&) = delete;
  IdGenerator(IdGenerator&&) = delete;
  IdGenerator& operator=(IdGenerator&&) = delete;

  long next() override { return ++last_; }

 private:
  IdGenerator() = default;
  long last_ = 0;
};

// Needs numbers, not a singleton: the source arrives through the constructor.
class OrderService {
 public:
  explicit OrderService(IdSource& ids) : ids_(ids) {}

  std::string place(const std::string& item) {
    return "ORD-" + std::to_string(ids_.next()) + ":" + item;
  }

 private:
  IdSource& ids_;
};
