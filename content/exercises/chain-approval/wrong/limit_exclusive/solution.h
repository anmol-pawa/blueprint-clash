#pragma once
#include <memory>
#include <string>
#include <utility>
#include "api.h"

// One link in the chain. Each link owns its successor, so destroying the head destroys the chain.
class Approver {
 public:
  virtual ~Approver() = default;

  // Returns the appended link so calls can be chained left to right.
  Approver& then(std::unique_ptr<Approver> next) {
    next_ = std::move(next);
    return *next_;
  }

  std::string handle(const Expense& expense) const {
    if (canApprove(expense)) {
      return role();
    }
    if (next_) {
      return next_->handle(expense);
    }
    return "rejected";  // fell off the end: say so explicitly
  }

 protected:
  virtual bool canApprove(const Expense& expense) const = 0;
  virtual std::string role() const = 0;

 private:
  std::unique_ptr<Approver> next_;
};

class LimitApprover final : public Approver {
 public:
  LimitApprover(std::string role, long long limitCents) : role_(std::move(role)), limitCents_(limitCents) {}

 protected:
  bool canApprove(const Expense& expense) const override { return expense.cents > 0 && expense.cents < limitCents_; }
  std::string role() const override { return role_; }

 private:
  std::string role_;
  long long limitCents_;
};
