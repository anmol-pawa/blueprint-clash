#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using pay::Reply;
using pay::RefundStatus;
using pay::Status;

namespace {
struct Call {
  std::string key;
  std::string card;
  pay::Money amount;
};

class FakeGateway : public pay::RefundGateway {
 public:
  void scriptRefunds(std::vector<Reply> replies) {
    refundScript_ = std::move(replies);
    nextRefund_ = 0;
  }
  Reply charge(const std::string& key, const std::string& card, pay::Money amount) override {
    charges.push_back(Call{key, card, amount});
    return Reply::Approved;
  }
  Reply refund(const std::string& key, const std::string& card, pay::Money amount) override {
    refunds.push_back(Call{key, card, amount});
    if (nextRefund_ < refundScript_.size()) return refundScript_[nextRefund_++];
    return Reply::Approved;
  }
  std::vector<Call> charges;
  std::vector<Call> refunds;

 private:
  std::vector<Reply> refundScript_;
  std::size_t nextRefund_ = 0;
};

struct Fixture {
  FakeGateway gateway;
  std::unique_ptr<pay::RefundingProcessor> processor = pay::makeRefundingProcessor(gateway);
  pay::PaymentId paid(const std::string& key, pay::Money amount, const std::string& card = "visa-1") {
    return processor->pay(key, card, amount).id;
  }
  std::size_t refundCalls() const { return gateway.refunds.size(); }
};
}  // namespace

TEST(Refund, PartialRefundsAddUpAndReachTheGatewayWithTheCard) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 10000, "visa-7");
  const pay::RefundResult a = f.processor->refund("r1", id, 3000);
  EXPECT_TRUE(a.status == RefundStatus::Ok);
  EXPECT_FALSE(a.replayed);
  EXPECT_EQ(f.processor->refunded(id), 3000);
  EXPECT_TRUE(f.processor->refund("r2", id, 7000).status == RefundStatus::Ok);
  EXPECT_EQ(f.processor->refunded(id), 10000);
  ASSERT_EQ(f.refundCalls(), static_cast<std::size_t>(2));
  EXPECT_EQ(f.gateway.refunds[0].key, std::string("r1"));
  EXPECT_EQ(f.gateway.refunds[0].card, std::string("visa-7"));
  EXPECT_EQ(f.gateway.refunds[0].amount, 3000);
}

TEST(Refund, TotalRefundsNeverExceedThePayment) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  EXPECT_TRUE(f.processor->refund("r1", id, 600).status == RefundStatus::Ok);
  EXPECT_TRUE(f.processor->refund("r2", id, 500).status == RefundStatus::ExceedsPayment);
  EXPECT_EQ(f.processor->refunded(id), 600);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(1));
  EXPECT_TRUE(f.processor->refund("r3", id, 400).status == RefundStatus::Ok);
  EXPECT_EQ(f.processor->refunded(id), 1000);
  EXPECT_TRUE(f.processor->refund("r4", id, 1).status == RefundStatus::ExceedsPayment);
}

TEST(Refund, RefundingTheWholePaymentInOneGoIsAllowed) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  EXPECT_TRUE(f.processor->refund("r1", id, 1000).status == RefundStatus::Ok);
  EXPECT_EQ(f.processor->refunded(id), 1000);
  EXPECT_TRUE(f.processor->refund("r2", id, 1001).status == RefundStatus::ExceedsPayment);
}

TEST(Refund, RefundsAreTrackedPerPayment) {
  Fixture f;
  const pay::PaymentId a = f.paid("pa", 1000);
  const pay::PaymentId b = f.paid("pb", 500);
  EXPECT_TRUE(f.processor->refund("r1", a, 1000).status == RefundStatus::Ok);
  EXPECT_TRUE(f.processor->refund("r2", b, 500).status == RefundStatus::Ok);
  EXPECT_EQ(f.processor->refunded(a), 1000);
  EXPECT_EQ(f.processor->refunded(b), 500);
  EXPECT_EQ(f.processor->refunded(a + b + 100), 0);
}

TEST(Refund, ChecksAreInTheDocumentedOrder) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  EXPECT_TRUE(f.processor->refund("", 99, 5).status == RefundStatus::InvalidRequest);
  EXPECT_TRUE(f.processor->refund("r", id, 0).status == RefundStatus::InvalidRequest);
  EXPECT_TRUE(f.processor->refund("r", id, -3).status == RefundStatus::InvalidRequest);
  EXPECT_TRUE(f.processor->refund("r", 99, 5).status == RefundStatus::UnknownPayment);
  EXPECT_TRUE(f.processor->refund("r", 0, 5).status == RefundStatus::UnknownPayment);
  // The payment key "p1" is taken, but an unknown payment is reported before any key check.
  EXPECT_TRUE(f.processor->refund("p1", 99, 5).status == RefundStatus::UnknownPayment);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(0));
}

TEST(Refund, ADeclinedPaymentHasNoIdToRefund) {
  Fixture f;
  EXPECT_TRUE(f.processor->refund("r", pay::kNoPayment, 5).status == RefundStatus::UnknownPayment);
}

TEST(Refund, AReplayedRefundIsNotAppliedTwice) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 10000);
  EXPECT_TRUE(f.processor->refund("r1", id, 3000).status == RefundStatus::Ok);
  const pay::RefundResult again = f.processor->refund("r1", id, 3000);
  EXPECT_TRUE(again.status == RefundStatus::Ok);
  EXPECT_TRUE(again.replayed);
  EXPECT_EQ(f.processor->refunded(id), 3000);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(1));
}

TEST(Refund, AReplayOfTheLastRefundStillReplays) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  EXPECT_TRUE(f.processor->refund("r1", id, 1000).status == RefundStatus::Ok);
  const pay::RefundResult again = f.processor->refund("r1", id, 1000);
  EXPECT_TRUE(again.status == RefundStatus::Ok);
  EXPECT_TRUE(again.replayed);
  EXPECT_EQ(f.processor->refunded(id), 1000);
}

TEST(Refund, TheSameKeyForADifferentRefundIsAConflict) {
  Fixture f;
  const pay::PaymentId a = f.paid("pa", 1000);
  const pay::PaymentId b = f.paid("pb", 1000);
  EXPECT_TRUE(f.processor->refund("r1", a, 300).status == RefundStatus::Ok);
  EXPECT_TRUE(f.processor->refund("r1", a, 400).status == RefundStatus::KeyConflict);
  EXPECT_TRUE(f.processor->refund("r1", b, 300).status == RefundStatus::KeyConflict);
  EXPECT_EQ(f.processor->refunded(a), 300);
  EXPECT_EQ(f.processor->refunded(b), 0);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(1));
}

TEST(Refund, PaymentKeysAndRefundKeysAreOneNamespace) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  EXPECT_TRUE(f.processor->refund("p1", id, 100).status == RefundStatus::KeyConflict);
  EXPECT_TRUE(f.processor->refund("r1", id, 100).status == RefundStatus::Ok);
  const pay::PayResult clash = f.processor->pay("r1", "visa-1", 100);
  EXPECT_TRUE(clash.status == Status::KeyConflict);
  EXPECT_EQ(f.gateway.charges.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(f.processor->refunded(id), 100);
}

TEST(Refund, ADeclinedRefundConsumesNothingAndIsReplayed) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  f.gateway.scriptRefunds({Reply::Declined});
  EXPECT_TRUE(f.processor->refund("r1", id, 1000).status == RefundStatus::Declined);
  EXPECT_EQ(f.processor->refunded(id), 0);
  const pay::RefundResult again = f.processor->refund("r1", id, 1000);
  EXPECT_TRUE(again.status == RefundStatus::Declined);
  EXPECT_TRUE(again.replayed);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(1));
  EXPECT_TRUE(f.processor->refund("r2", id, 1000).status == RefundStatus::Ok);
  EXPECT_EQ(f.processor->refunded(id), 1000);
}

TEST(Refund, AnAbandonedRefundConsumesNothingAndLeavesTheKeyFree) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  f.gateway.scriptRefunds({Reply::TemporaryError, Reply::TemporaryError, Reply::TemporaryError});
  EXPECT_TRUE(f.processor->refund("r1", id, 1000).status == RefundStatus::GaveUp);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(pay::kMaxAttempts));
  EXPECT_EQ(f.processor->refunded(id), 0);
  const pay::RefundResult again = f.processor->refund("r1", id, 1000);
  EXPECT_TRUE(again.status == RefundStatus::Ok);
  EXPECT_FALSE(again.replayed);
  EXPECT_EQ(f.processor->refunded(id), 1000);
}

TEST(Refund, RefundsRetryLikeChargesWithTheSameKey) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000, "visa-3");
  f.gateway.scriptRefunds({Reply::TemporaryError, Reply::TemporaryError, Reply::Approved});
  EXPECT_TRUE(f.processor->refund("r1", id, 250).status == RefundStatus::Ok);
  ASSERT_EQ(f.refundCalls(), static_cast<std::size_t>(3));
  for (const Call& c : f.gateway.refunds) {
    EXPECT_EQ(c.key, std::string("r1"));
    EXPECT_EQ(c.card, std::string("visa-3"));
    EXPECT_EQ(c.amount, 250);
  }
}

TEST(Refund, ADeclinedRefundIsNotRetried) {
  Fixture f;
  const pay::PaymentId id = f.paid("p1", 1000);
  f.gateway.scriptRefunds({Reply::Declined, Reply::Approved});
  EXPECT_TRUE(f.processor->refund("r1", id, 250).status == RefundStatus::Declined);
  EXPECT_EQ(f.refundCalls(), static_cast<std::size_t>(1));
}

TEST(RefundRegression, PaymentsStillBehaveAsBefore) {
  Fixture f;
  const pay::PayResult first = f.processor->pay("k", "visa-1", 500);
  const pay::PayResult again = f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(again.replayed);
  EXPECT_EQ(again.id, first.id);
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 501).status == Status::KeyConflict);
  EXPECT_EQ(f.gateway.charges.size(), static_cast<std::size_t>(1));
}
