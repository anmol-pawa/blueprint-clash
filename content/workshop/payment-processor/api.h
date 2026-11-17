#pragma once
// Public API for the Payment processor problem. The hidden tests only use what is declared here.
// You implement pay::makeProcessor() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>

namespace pay {

using Money = long long;  // whole cents
using PaymentId = long long;
constexpr PaymentId kNoPayment = 0;  // ids that are issued are always positive and never reused

constexpr Money kMaxAmount = 100000000;  // cents per payment
constexpr int kMaxAttempts = 3;          // most gateway calls one request may make

// What a payment gateway answers to one call.
enum class Reply {
  Approved,
  Declined,        // the card was refused: a final answer
  TemporaryError,  // timeout, overload, "try again": says nothing about the card
};

// The remote payment gateway. The caller supplies it (the tests script it). `key` is the request's idempotency key: a
// real gateway that remembers keys will not charge twice for one key, so every attempt of one request must carry the
// same key.
class Gateway {
 public:
  virtual ~Gateway() = default;
  virtual Reply charge(const std::string& key, const std::string& card, Money amount) = 0;
};

enum class Status {
  Ok,              // approved now, or an earlier approval replayed
  Declined,        // the card was refused now, or an earlier refusal replayed
  GaveUp,          // every attempt got a temporary error; nothing was recorded and the key is still free
  InvalidRequest,  // empty key, empty card, or an amount outside 1..kMaxAmount
  KeyConflict,     // the key was already used for a different request
};

struct PayResult {
  Status status = Status::Ok;
  PaymentId id = kNoPayment;  // kNoPayment unless status is Ok
  bool replayed = false;      // true when the answer came from an earlier call with the same key
};

struct Payment {
  std::string card;
  Money amount = 0;
};

// Takes payments through a gateway. Retrying a call with the same key is always safe.
class Processor {
 public:
  virtual ~Processor() = default;

  // Charges `card` for `amount`. Checks, in order:
  //  1. InvalidRequest (empty key, empty card, amount outside 1..kMaxAmount). Nothing is recorded.
  //  2. The key. If it was used before for a different card or amount: KeyConflict. If it was used before for this same
  //     request: the earlier answer is returned with replayed = true and the gateway is NOT called.
  //  3. A fresh request calls the gateway. A TemporaryError is retried, at most kMaxAttempts calls in all, each with the
  //     same key. Approved: a new payment id is issued. Declined: no retry, no id. Still a TemporaryError after the last
  //     attempt: GaveUp.
  // Approved and Declined are recorded under the key and replayed later. GaveUp is not: the key stays free.
  virtual PayResult pay(const std::string& key, const std::string& card, Money amount) = 0;

  // The payment with this id; empty for an id that was never issued.
  virtual std::optional<Payment> payment(PaymentId id) const = 0;
};

std::unique_ptr<Processor> makeProcessor(Gateway& gateway);

}  // namespace pay
