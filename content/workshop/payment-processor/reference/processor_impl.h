#pragma once
#include <memory>
#include <string>
#include <utility>

#include "charge_only_gateway.h"
#include "key_book.h"
#include "payment_ledger.h"
#include "retrier.h"

namespace {
inline pay::Status payStatus(pay::Reply reply) { return reply == pay::Reply::Approved ? pay::Status::Ok : pay::Status::Declined; }

inline pay::RefundStatus refundStatus(pay::Reply reply) {
  return reply == pay::Reply::Approved ? pay::RefundStatus::Ok : pay::RefundStatus::Declined;
}

inline pay::RefundResult refusedRefund(pay::RefundStatus status) { return pay::RefundResult{status, false}; }
}  // namespace

// The public face. It validates in the documented order, asks the key book whether this is a replay, calls the gateway
// through the retry policy and records the outcome. The rules live in the collaborators.
class ProcessorImpl : public pay::RefundingProcessor {
 public:
  ProcessorImpl(pay::Gateway& gateway, std::unique_ptr<Lifetime> lifetime)
      : adapter_(std::make_unique<ChargeOnlyGateway>(gateway)), gateway_(*adapter_), keys_(std::move(lifetime)) {}

  ProcessorImpl(pay::RefundGateway& gateway, std::unique_ptr<Lifetime> lifetime)
      : gateway_(gateway), keys_(std::move(lifetime)) {}

  pay::PayResult pay(const std::string& key, const std::string& card, pay::Money amount) override {
    if (key.empty() || card.empty() || amount < 1 || amount > pay::kMaxAmount) {
      return pay::PayResult{pay::Status::InvalidRequest, pay::kNoPayment, false};
    }
    const RequestShape shape{RequestShape::Kind::Pay, card, amount};
    const KeyBook::Verdict verdict = keys_.check(key, shape);
    if (verdict.kind == KeyBook::Verdict::Kind::Conflict) return pay::PayResult{pay::Status::KeyConflict, pay::kNoPayment, false};
    if (verdict.kind == KeyBook::Verdict::Kind::Replay) {
      return pay::PayResult{payStatus(verdict.answer.reply), verdict.answer.id, true};
    }
    const pay::Reply reply = retrier_.run([&] { return gateway_.charge(key, card, amount); });
    if (reply == pay::Reply::TemporaryError) return pay::PayResult{pay::Status::GaveUp, pay::kNoPayment, false};
    const pay::PaymentId id = reply == pay::Reply::Approved ? ledger_.record(pay::Payment{card, amount}) : pay::kNoPayment;
    keys_.remember(key, shape, Answer{reply, id});
    return pay::PayResult{payStatus(reply), id, false};
  }

  std::optional<pay::Payment> payment(pay::PaymentId id) const override {
    const pay::Payment* found = ledger_.find(id);
    if (found == nullptr) return std::nullopt;
    return *found;
  }

  pay::RefundResult refund(const std::string& key, pay::PaymentId id, pay::Money amount) override {
    if (key.empty() || amount < 1) return refusedRefund(pay::RefundStatus::InvalidRequest);
    const pay::Payment* paid = ledger_.find(id);
    if (paid == nullptr) return refusedRefund(pay::RefundStatus::UnknownPayment);
    const RequestShape shape{RequestShape::Kind::Refund, std::to_string(id), amount};
    const KeyBook::Verdict verdict = keys_.check(key, shape);
    if (verdict.kind == KeyBook::Verdict::Kind::Conflict) return refusedRefund(pay::RefundStatus::KeyConflict);
    if (verdict.kind == KeyBook::Verdict::Kind::Replay) return pay::RefundResult{refundStatus(verdict.answer.reply), true};
    if (amount > paid->amount - ledger_.refunded(id)) return refusedRefund(pay::RefundStatus::ExceedsPayment);
    const std::string card = paid->card;
    const pay::Reply reply = retrier_.run([&] { return gateway_.refund(key, card, amount); });
    if (reply == pay::Reply::TemporaryError) return refusedRefund(pay::RefundStatus::GaveUp);
    if (reply == pay::Reply::Approved) ledger_.addRefund(id, amount);
    keys_.remember(key, shape, Answer{reply, id});
    return pay::RefundResult{refundStatus(reply), false};
  }

  pay::Money refunded(pay::PaymentId id) const override { return ledger_.refunded(id); }

 private:
  std::unique_ptr<ChargeOnlyGateway> adapter_;
  pay::RefundGateway& gateway_;
  KeyBook keys_;
  PaymentLedger ledger_;
  Retrier retrier_;
};
