#include <cstdint>
#include <map>
#include <memory>
#include <set>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

using pay::Reply;
using pay::Status;

namespace {
struct Call {
  std::string key;
  std::string card;
  pay::Money amount;
};

// Replies are taken from the script in order; when it runs out the gateway answers `fallback`.
class FakeGateway : public pay::Gateway {
 public:
  void script(std::vector<Reply> replies) {
    script_ = std::move(replies);
    next_ = 0;
  }
  Reply charge(const std::string& key, const std::string& card, pay::Money amount) override {
    calls.push_back(Call{key, card, amount});
    if (next_ < script_.size()) return script_[next_++];
    return fallback;
  }
  std::vector<Call> calls;
  Reply fallback = Reply::Approved;

 private:
  std::vector<Reply> script_;
  std::size_t next_ = 0;
};

struct Fixture {
  FakeGateway gateway;
  std::unique_ptr<pay::Processor> processor = pay::makeProcessor(gateway);
  std::size_t calls() const { return gateway.calls.size(); }
};
}  // namespace

TEST(Pay, AnApprovedPaymentGetsAnIdAndIsRecorded) {
  Fixture f;
  const pay::PayResult r = f.processor->pay("k1", "visa-1", 2500);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.id > 0);
  EXPECT_FALSE(r.replayed);
  const auto stored = f.processor->payment(r.id);
  ASSERT_TRUE(stored.has_value());
  EXPECT_EQ(stored->card, std::string("visa-1"));
  EXPECT_EQ(stored->amount, 2500);
  ASSERT_EQ(f.calls(), static_cast<std::size_t>(1));
  EXPECT_EQ(f.gateway.calls[0].key, std::string("k1"));
  EXPECT_EQ(f.gateway.calls[0].card, std::string("visa-1"));
  EXPECT_EQ(f.gateway.calls[0].amount, 2500);
  EXPECT_FALSE(f.processor->payment(0).has_value());
  EXPECT_FALSE(f.processor->payment(r.id + 100).has_value());
}

TEST(Pay, RejectsInvalidRequestsWithoutCallingTheGateway) {
  Fixture f;
  EXPECT_TRUE(f.processor->pay("", "visa-1", 100).status == Status::InvalidRequest);
  EXPECT_TRUE(f.processor->pay("k", "", 100).status == Status::InvalidRequest);
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 0).status == Status::InvalidRequest);
  EXPECT_TRUE(f.processor->pay("k", "visa-1", -5).status == Status::InvalidRequest);
  EXPECT_TRUE(f.processor->pay("k", "visa-1", pay::kMaxAmount + 1).status == Status::InvalidRequest);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(0));
  const pay::PayResult bad = f.processor->pay("k", "visa-1", 0);
  EXPECT_EQ(bad.id, pay::kNoPayment);
  EXPECT_FALSE(bad.replayed);
}

TEST(Pay, AmountBoundsAreInclusive) {
  Fixture f;
  EXPECT_TRUE(f.processor->pay("low", "visa-1", 1).status == Status::Ok);
  EXPECT_TRUE(f.processor->pay("high", "visa-1", pay::kMaxAmount).status == Status::Ok);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(2));
}

TEST(Pay, AnInvalidRequestIsNotRecordedUnderItsKey) {
  Fixture f;
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 0).status == Status::InvalidRequest);
  const pay::PayResult r = f.processor->pay("k", "visa-2", 700);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_FALSE(r.replayed);
}

TEST(Pay, ValidationComesBeforeTheKeyCheck) {
  Fixture f;
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 100).status == Status::Ok);
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 0).status == Status::InvalidRequest);
  EXPECT_TRUE(f.processor->pay("k", "", 100).status == Status::InvalidRequest);
  EXPECT_TRUE(f.processor->pay("k", "visa-2", pay::kMaxAmount + 1).status == Status::InvalidRequest);
}

TEST(Pay, EveryApprovedPaymentGetsItsOwnPositiveId) {
  Fixture f;
  std::set<pay::PaymentId> ids;
  for (int i = 0; i < 20; ++i) {
    const pay::PayResult r = f.processor->pay("key-" + std::to_string(i), "visa-1", 100 + i);
    EXPECT_TRUE(r.id > 0);
    ids.insert(r.id);
    const auto stored = f.processor->payment(r.id);
    ASSERT_TRUE(stored.has_value());
    EXPECT_EQ(stored->amount, 100 + i);
  }
  EXPECT_EQ(ids.size(), static_cast<std::size_t>(20));
}

TEST(Pay, ADeclineIsFinalAndNotRetried) {
  Fixture f;
  f.gateway.script({Reply::Declined, Reply::Approved});
  const pay::PayResult r = f.processor->pay("k", "visa-1", 900);
  EXPECT_TRUE(r.status == Status::Declined);
  EXPECT_EQ(r.id, pay::kNoPayment);
  EXPECT_FALSE(r.replayed);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(1));
}

TEST(Retry, TemporaryErrorsAreRetriedUntilTheGatewayAnswers) {
  Fixture f;
  f.gateway.script({Reply::TemporaryError, Reply::TemporaryError, Reply::Approved});
  const pay::PayResult r = f.processor->pay("k", "visa-1", 900);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.id > 0);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(3));
}

TEST(Retry, AtMostThreeAttemptsThenGaveUp) {
  Fixture f;
  f.gateway.script({Reply::TemporaryError, Reply::TemporaryError, Reply::TemporaryError, Reply::Approved});
  const pay::PayResult r = f.processor->pay("k", "visa-1", 900);
  EXPECT_TRUE(r.status == Status::GaveUp);
  EXPECT_EQ(r.id, pay::kNoPayment);
  EXPECT_FALSE(r.replayed);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(pay::kMaxAttempts));
}

TEST(Retry, ADeclineAfterATemporaryErrorStopsTheRetries) {
  Fixture f;
  f.gateway.script({Reply::TemporaryError, Reply::Declined, Reply::Approved});
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 900).status == Status::Declined);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(2));
}

TEST(Retry, EveryAttemptCarriesTheSameKeyCardAndAmount) {
  Fixture f;
  f.gateway.script({Reply::TemporaryError, Reply::TemporaryError, Reply::Approved});
  f.processor->pay("order-77", "visa-9", 1234);
  ASSERT_EQ(f.calls(), static_cast<std::size_t>(3));
  for (const Call& c : f.gateway.calls) {
    EXPECT_EQ(c.key, std::string("order-77"));
    EXPECT_EQ(c.card, std::string("visa-9"));
    EXPECT_EQ(c.amount, 1234);
  }
}

TEST(Retry, AGaveUpRequestLeavesTheKeyFree) {
  Fixture f;
  f.gateway.script({Reply::TemporaryError, Reply::TemporaryError, Reply::TemporaryError});
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).status == Status::GaveUp);
  const pay::PayResult again = f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(again.status == Status::Ok);
  EXPECT_FALSE(again.replayed);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(4));
}

TEST(Retry, AGaveUpKeyCanBeUsedForADifferentRequest) {
  Fixture f;
  f.gateway.script({Reply::TemporaryError, Reply::TemporaryError, Reply::TemporaryError});
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).status == Status::GaveUp);
  const pay::PayResult other = f.processor->pay("k", "visa-2", 800);
  EXPECT_TRUE(other.status == Status::Ok);
  EXPECT_FALSE(other.replayed);
}

TEST(Idempotency, AReplayDoesNotCallTheGatewayAgain) {
  Fixture f;
  const pay::PayResult first = f.processor->pay("k", "visa-1", 500);
  f.gateway.fallback = Reply::TemporaryError;  // a replay must not need the gateway to be up
  for (int i = 0; i < 3; ++i) {
    const pay::PayResult again = f.processor->pay("k", "visa-1", 500);
    EXPECT_TRUE(again.status == Status::Ok);
    EXPECT_TRUE(again.replayed);
    EXPECT_EQ(again.id, first.id);
  }
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(1));
}

TEST(Idempotency, AReplayRecordsNothingNew) {
  Fixture f;
  const pay::PayResult first = f.processor->pay("k", "visa-1", 500);
  f.processor->pay("k", "visa-1", 500);
  f.processor->pay("k", "visa-1", 500);
  EXPECT_FALSE(f.processor->payment(first.id + 1).has_value());
  EXPECT_FALSE(f.processor->payment(first.id + 2).has_value());
}

TEST(Idempotency, ADeclineIsAnAnswerAndIsReplayed) {
  Fixture f;
  f.gateway.script({Reply::Declined});
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).status == Status::Declined);
  const pay::PayResult again = f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(again.status == Status::Declined);
  EXPECT_TRUE(again.replayed);
  EXPECT_EQ(again.id, pay::kNoPayment);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(1));
}

TEST(Idempotency, TheSameKeyForADifferentRequestIsAConflict) {
  Fixture f;
  const pay::PayResult first = f.processor->pay("k", "visa-1", 500);
  const pay::PayResult otherAmount = f.processor->pay("k", "visa-1", 501);
  const pay::PayResult otherCard = f.processor->pay("k", "visa-2", 500);
  EXPECT_TRUE(otherAmount.status == Status::KeyConflict);
  EXPECT_TRUE(otherCard.status == Status::KeyConflict);
  EXPECT_EQ(otherAmount.id, pay::kNoPayment);
  EXPECT_FALSE(otherAmount.replayed);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(1));
  EXPECT_FALSE(f.processor->payment(first.id + 1).has_value());
}

TEST(Idempotency, ADeclinedKeyAlsoConflictsWithADifferentRequest) {
  Fixture f;
  f.gateway.script({Reply::Declined});
  f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 600).status == Status::KeyConflict);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(1));
}

TEST(Idempotency, DifferentKeysAreIndependentEvenForTheSameRequest) {
  Fixture f;
  const pay::PayResult a = f.processor->pay("k1", "visa-1", 500);
  const pay::PayResult b = f.processor->pay("k2", "visa-1", 500);
  EXPECT_TRUE(a.status == Status::Ok);
  EXPECT_TRUE(b.status == Status::Ok);
  EXPECT_FALSE(b.replayed);
  EXPECT_TRUE(a.id != b.id);
  EXPECT_EQ(f.calls(), static_cast<std::size_t>(2));
}

namespace {
struct Rng {
  std::uint64_t state;
  std::uint32_t next() {
    state = state * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<std::uint32_t>(state >> 33);
  }
};

Reply drawReply(Rng& rng) {
  const std::uint32_t v = rng.next() % 10;
  if (v < 5) return Reply::Approved;
  if (v < 7) return Reply::Declined;
  return Reply::TemporaryError;
}

// The gateway draws its replies from a seeded stream; the model draws from a copy of the same stream, one draw per
// attempt it expects the processor to make. A processor that calls the gateway a different number of times drifts apart.
class RandomGateway : public pay::Gateway {
 public:
  explicit RandomGateway(std::uint64_t seed) : rng_{seed} {}
  Reply charge(const std::string&, const std::string&, pay::Money) override { return drawReply(rng_); }

 private:
  Rng rng_;
};

struct Known {
  std::string card;
  pay::Money amount;
  Status status;
  pay::PaymentId id;
};
}  // namespace

TEST(Contention, ManyRandomRequestsAgreeWithASimpleModel) {
  RandomGateway gateway(2024);
  auto processor = pay::makeProcessor(gateway);
  Rng modelReplies{2024};
  Rng pick{99};
  std::map<std::string, Known> known;
  std::set<pay::PaymentId> issued;
  for (int step = 0; step < 400; ++step) {
    const std::string key = "k" + std::to_string(pick.next() % 6);
    const std::string card = "card-" + std::to_string(pick.next() % 2);
    const pay::Money amount = 100 + pick.next() % 2;
    const pay::PayResult got = processor->pay(key, card, amount);
    const auto it = known.find(key);
    if (it != known.end()) {
      const bool same = it->second.card == card && it->second.amount == amount;
      EXPECT_TRUE(got.status == (same ? it->second.status : Status::KeyConflict));
      EXPECT_EQ(got.replayed, same);
      if (same) EXPECT_EQ(got.id, it->second.id);
      continue;
    }
    Reply reply = Reply::TemporaryError;
    for (int attempt = 0; attempt < pay::kMaxAttempts && reply == Reply::TemporaryError; ++attempt) reply = drawReply(modelReplies);
    EXPECT_FALSE(got.replayed);
    if (reply == Reply::TemporaryError) {
      EXPECT_TRUE(got.status == Status::GaveUp);
      continue;
    }
    const Status want = reply == Reply::Approved ? Status::Ok : Status::Declined;
    EXPECT_TRUE(got.status == want);
    if (reply == Reply::Approved) {
      EXPECT_TRUE(got.id > 0);
      EXPECT_TRUE(issued.insert(got.id).second);
    } else {
      EXPECT_EQ(got.id, pay::kNoPayment);
    }
    known[key] = Known{card, amount, want, got.id};
  }
  EXPECT_TRUE(known.size() > 3);
}
