#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

using pay::Reply;
using pay::RefundStatus;
using pay::Status;

namespace {
class FakeClock : public pay::Clock {
 public:
  long long seconds() const override { return now; }
  long long now = 1000;
};

class FakeGateway : public pay::RefundGateway {
 public:
  void scriptCharges(std::vector<Reply> replies) {
    script_ = std::move(replies);
    next_ = 0;
  }
  Reply charge(const std::string&, const std::string&, pay::Money) override {
    ++charges;
    if (next_ < script_.size()) return script_[next_++];
    return Reply::Approved;
  }
  Reply refund(const std::string&, const std::string&, pay::Money) override {
    ++refunds;
    return Reply::Approved;
  }
  int charges = 0;
  int refunds = 0;

 private:
  std::vector<Reply> script_;
  std::size_t next_ = 0;
};

struct Fixture {
  explicit Fixture(long long ttl) : processor(pay::makeExpiringProcessor(gateway, clock, ttl)) {}
  FakeClock clock;
  FakeGateway gateway;
  std::unique_ptr<pay::RefundingProcessor> processor;
};
}  // namespace

TEST(Expiry, TheLifetimeMustBePositive) {
  FakeClock clock;
  FakeGateway gateway;
  EXPECT_TRUE(pay::makeExpiringProcessor(gateway, clock, 0) == nullptr);
  EXPECT_TRUE(pay::makeExpiringProcessor(gateway, clock, -5) == nullptr);
  EXPECT_TRUE(pay::makeExpiringProcessor(gateway, clock, 1) != nullptr);
}

TEST(Expiry, AKeyIsLiveUntilExactlyTtlSecondsAfterItWasRecorded) {
  Fixture f(60);
  const pay::PayResult first = f.processor->pay("k", "visa-1", 500);
  f.clock.now = 1059;
  const pay::PayResult live = f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(live.replayed);
  EXPECT_EQ(live.id, first.id);
  EXPECT_EQ(f.gateway.charges, 1);
  f.clock.now = 1060;
  const pay::PayResult fresh = f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(fresh.status == Status::Ok);
  EXPECT_FALSE(fresh.replayed);
  EXPECT_TRUE(fresh.id != first.id);
  EXPECT_EQ(f.gateway.charges, 2);
}

TEST(Expiry, AnExpiredKeyCanBeUsedForADifferentRequest) {
  Fixture f(10);
  f.processor->pay("k", "visa-1", 500);
  f.clock.now = 1009;
  EXPECT_TRUE(f.processor->pay("k", "visa-2", 800).status == Status::KeyConflict);
  f.clock.now = 1010;
  const pay::PayResult other = f.processor->pay("k", "visa-2", 800);
  EXPECT_TRUE(other.status == Status::Ok);
  EXPECT_FALSE(other.replayed);
  const auto stored = f.processor->payment(other.id);
  ASSERT_TRUE(stored.has_value());
  EXPECT_EQ(stored->card, std::string("visa-2"));
}

TEST(Expiry, ReplaysDoNotExtendTheLifeOfAKey) {
  Fixture f(10);
  f.processor->pay("k", "visa-1", 500);
  f.clock.now = 1009;
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).replayed);
  f.clock.now = 1010;
  EXPECT_FALSE(f.processor->pay("k", "visa-1", 500).replayed);
}

TEST(Expiry, AFreshAnswerAfterExpiryStartsANewWindow) {
  Fixture f(10);
  f.processor->pay("k", "visa-1", 500);
  f.clock.now = 1010;
  EXPECT_FALSE(f.processor->pay("k", "visa-1", 500).replayed);
  f.clock.now = 1015;
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).replayed);
  EXPECT_EQ(f.gateway.charges, 2);
  f.clock.now = 1020;
  EXPECT_FALSE(f.processor->pay("k", "visa-1", 500).replayed);
}

TEST(Expiry, EachKeyHasItsOwnClock) {
  Fixture f(10);
  f.processor->pay("early", "visa-1", 500);
  f.clock.now = 1005;
  f.processor->pay("late", "visa-1", 500);
  f.clock.now = 1010;
  EXPECT_FALSE(f.processor->pay("early", "visa-1", 500).replayed);
  EXPECT_TRUE(f.processor->pay("late", "visa-1", 500).replayed);
  f.clock.now = 1015;
  EXPECT_FALSE(f.processor->pay("late", "visa-1", 500).replayed);
}

TEST(Expiry, ADeclinedAnswerExpiresToo) {
  Fixture f(10);
  f.gateway.scriptCharges({Reply::Declined});
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).status == Status::Declined);
  f.clock.now = 1005;
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).replayed);
  f.clock.now = 1010;
  const pay::PayResult again = f.processor->pay("k", "visa-1", 500);
  EXPECT_TRUE(again.status == Status::Ok);
  EXPECT_FALSE(again.replayed);
}

TEST(Expiry, RefundKeysExpireLikePaymentKeys) {
  Fixture f(10);
  const pay::PaymentId id = f.processor->pay("p1", "visa-1", 1000).id;
  f.clock.now = 1003;
  EXPECT_TRUE(f.processor->refund("r1", id, 300).status == RefundStatus::Ok);
  f.clock.now = 1008;
  EXPECT_TRUE(f.processor->refund("r1", id, 300).replayed);
  EXPECT_EQ(f.processor->refunded(id), 300);
  // The documented price of expiry: after the window the same call is a new refund.
  f.clock.now = 1013;
  const pay::RefundResult again = f.processor->refund("r1", id, 300);
  EXPECT_TRUE(again.status == RefundStatus::Ok);
  EXPECT_FALSE(again.replayed);
  EXPECT_EQ(f.processor->refunded(id), 600);
  EXPECT_EQ(f.gateway.refunds, 2);
}

TEST(Expiry, AnExpiredKeyNoLongerBlocksADifferentKindOfRequest) {
  Fixture f(10);
  const pay::PaymentId id = f.processor->pay("shared", "visa-1", 1000).id;
  f.clock.now = 1010;
  EXPECT_TRUE(f.processor->refund("shared", id, 100).status == RefundStatus::Ok);
}

TEST(Expiry, GiveUpAndRetryRulesAreUnchanged) {
  Fixture f(10);
  f.gateway.scriptCharges({Reply::TemporaryError, Reply::TemporaryError, Reply::TemporaryError});
  EXPECT_TRUE(f.processor->pay("k", "visa-1", 500).status == Status::GaveUp);
  EXPECT_EQ(f.gateway.charges, pay::kMaxAttempts);
  EXPECT_TRUE(f.processor->pay("k", "visa-2", 800).status == Status::Ok);
}
