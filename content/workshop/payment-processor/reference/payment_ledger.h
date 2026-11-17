#pragma once
#include <map>
#include <utility>

#include "api.h"

// The payments that were approved and how much of each has been given back. Issues ids: positive, never reused.
class PaymentLedger {
 public:
  pay::PaymentId record(pay::Payment payment) {
    entries_.emplace(++lastId_, Entry{std::move(payment), 0});
    return lastId_;
  }

  const pay::Payment* find(pay::PaymentId id) const {
    const auto it = entries_.find(id);
    return it == entries_.end() ? nullptr : &it->second.payment;
  }

  pay::Money refunded(pay::PaymentId id) const {
    const auto it = entries_.find(id);
    return it == entries_.end() ? 0 : it->second.refunded;
  }

  void addRefund(pay::PaymentId id, pay::Money amount) { entries_.at(id).refunded += amount; }

 private:
  struct Entry {
    pay::Payment payment;
    pay::Money refunded = 0;
  };

  pay::PaymentId lastId_ = pay::kNoPayment;
  std::map<pay::PaymentId, Entry> entries_;
};
