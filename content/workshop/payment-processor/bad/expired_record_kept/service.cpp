#include <memory>
#include <string>
#include <utility>

#include "api_storm1.h"

// Lets a plain Gateway be used where a RefundGateway is expected. Before refunds exist there is nothing to refund
// with, so any refund call is declined. An Adapter, so the processor has one gateway type to talk to.
class ChargeOnlyGateway : public pay::RefundGateway {
 public:
  explicit ChargeOnlyGateway(pay::Gateway& gateway) : gateway_(gateway) {}

  pay::Reply charge(const std::string& key, const std::string& card, pay::Money amount) override {
    return gateway_.charge(key, card, amount);
  }

  pay::Reply refund(const std::string&, const std::string&, pay::Money) override { return pay::Reply::Declined; }

 private:
  pay::Gateway& gateway_;
};

#include <map>
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"

// How long a recorded answer stays valid. A Strategy: the key book asks and never looks at a clock itself.
class Lifetime {
 public:
  virtual ~Lifetime() = default;
  virtual long long stamp() const = 0;
  virtual bool expired(long long stamp) const = 0;
};

class NoExpiry : public Lifetime {
 public:
  long long stamp() const override { return 0; }
  bool expired(long long) const override { return false; }
};

class TtlLifetime : public Lifetime {
 public:
  TtlLifetime(const pay::Clock& clock, long long ttlSeconds) : clock_(clock), ttlSeconds_(ttlSeconds) {}
  long long stamp() const override { return clock_.seconds(); }
  bool expired(long long stamp) const override { return clock_.seconds() >= stamp + ttlSeconds_; }

 private:
  const pay::Clock& clock_;
  long long ttlSeconds_;
};

#include <string>

#include "api_storm1.h"

// What a request asked for, reduced to what must match for a repeated call to count as "the same request".
struct RequestShape {
  enum class Kind { Pay, Refund };
  Kind kind = Kind::Pay;
  std::string target;  // the card for a payment, the payment id for a refund
  pay::Money amount = 0;
};

inline bool operator==(const RequestShape& a, const RequestShape& b) {
  return a.kind == b.kind && a.target == b.target && a.amount == b.amount;
}

// The final answer a request got. A temporary error is never an answer.
struct Answer {
  pay::Reply reply = pay::Reply::Declined;
  pay::PaymentId id = pay::kNoPayment;
};


// Remembers the final answer to every request by its idempotency key, for payments and refunds alike. A key is one
// namespace: the shape of the request it was first used for decides whether a later call is a replay or a conflict.
class KeyBook {
 public:
  struct Verdict {
    enum class Kind { Fresh, Replay, Conflict };
    Kind kind = Kind::Fresh;
    Answer answer;
  };

  explicit KeyBook(std::unique_ptr<Lifetime> lifetime) : lifetime_(std::move(lifetime)) {}

  Verdict check(const std::string& key, const RequestShape& shape) const {
    const auto it = records_.find(key);
    if (it == records_.end() || lifetime_->expired(it->second.stamp)) return Verdict{};
    if (!(it->second.shape == shape)) return Verdict{Verdict::Kind::Conflict, Answer{}};
    return Verdict{Verdict::Kind::Replay, it->second.answer};
  }

  void remember(const std::string& key, const RequestShape& shape, const Answer& answer) {
    records_.emplace(key, Record{shape, answer, lifetime_->stamp()});
  }

 private:
  struct Record {
    RequestShape shape;
    Answer answer;
    long long stamp = 0;
  };

  std::unique_ptr<Lifetime> lifetime_;
  std::map<std::string, Record> records_;
};

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

#include <functional>

#include "api.h"

// The retry policy: repeat a call while the gateway says "temporary", at most kMaxAttempts calls. Anything else is an
// answer and ends the loop. It knows nothing about payments, keys or ledgers.
class Retrier {
 public:
  pay::Reply run(const std::function<pay::Reply()>& attempt) const {
    pay::Reply reply = pay::Reply::TemporaryError;
    for (int calls = 0; calls < pay::kMaxAttempts && reply == pay::Reply::TemporaryError; ++calls) reply = attempt();
    return reply;
  }
};


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


std::unique_ptr<pay::Processor> pay::makeProcessor(pay::Gateway& gateway) {
  return std::make_unique<ProcessorImpl>(gateway, std::make_unique<NoExpiry>());
}

std::unique_ptr<pay::RefundingProcessor> pay::makeRefundingProcessor(pay::RefundGateway& gateway) {
  return std::make_unique<ProcessorImpl>(gateway, std::make_unique<NoExpiry>());
}

std::unique_ptr<pay::RefundingProcessor> pay::makeExpiringProcessor(pay::RefundGateway& gateway, const pay::Clock& clock,
                                                                    long long ttlSeconds) {
  if (ttlSeconds < 1) return nullptr;
  return std::make_unique<ProcessorImpl>(gateway, std::make_unique<TtlLifetime>(clock, ttlSeconds));
}
