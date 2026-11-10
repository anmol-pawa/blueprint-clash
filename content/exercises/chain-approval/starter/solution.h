#pragma once
#include <memory>
#include <string>
#include <utility>
#include "api.h"

// TODO: a chain link that owns its successor. handle() answers with role() if canApprove(),
// otherwise forwards, otherwise returns "rejected".
class Approver {
 public:
  virtual ~Approver() = default;

  Approver& then(std::unique_ptr<Approver> next) {
    next_ = std::move(next);
    return *this;
  }

  std::string handle(const Expense&) const { return ""; }

 protected:
  virtual bool canApprove(const Expense& expense) const = 0;
  virtual std::string role() const = 0;

 private:
  std::unique_ptr<Approver> next_;
};

// TODO: approve when 0 < cents <= limitCents.
class LimitApprover final : public Approver {
 public:
  LimitApprover(std::string role, long long limitCents) : role_(std::move(role)), limitCents_(limitCents) {}

 protected:
  bool canApprove(const Expense&) const override { return false; }
  std::string role() const override { return role_; }

 private:
  std::string role_;
  long long limitCents_;
};
