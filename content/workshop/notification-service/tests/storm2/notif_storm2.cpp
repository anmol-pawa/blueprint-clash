#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using notif::SendResult;
using notif::Status;

class FakeChannel : public notif::Channel {
 public:
  explicit FakeChannel(std::vector<SendResult> script = {}) : script_(std::move(script)) {}

  SendResult send(const std::string& recipient, const std::string& body) override {
    recipients.push_back(recipient);
    bodies.push_back(body);
    return next_ < script_.size() ? script_[next_++] : SendResult::Delivered;
  }

  std::vector<std::string> recipients;
  std::vector<std::string> bodies;

 private:
  std::vector<SendResult> script_;
  std::size_t next_ = 0;
};

struct Rig {
  Rig() {
    notif::RetryConfig config;
    config.pause = [this](long long ms) { pauses.push_back(ms); };
    service = notif::makeIdempotentService(config);
    service->addTemplate("hello", "Hi {name}");
  }

  std::shared_ptr<FakeChannel> channel(const std::string& name, std::vector<SendResult> script = {}) {
    auto fake = std::make_shared<FakeChannel>(std::move(script));
    service->addChannel(name, fake);
    return fake;
  }

  notif::ChainRequest chain(std::vector<std::string> channels, const std::string& recipient = "ann") {
    notif::ChainRequest r;
    r.recipient = recipient;
    r.templateId = "hello";
    r.channels = std::move(channels);
    r.params = {{"name", "Ann"}};
    return r;
  }

  std::unique_ptr<notif::IdempotentService> service;
  std::vector<long long> pauses;
};

const SendResult T = SendResult::Transient;
const SendResult P = SendResult::Permanent;
}  // namespace

TEST(Once, TheFirstCallWithAKeyIsSentNormally) {
  Rig rig;
  auto email = rig.channel("email");
  const auto result = rig.service->sendOnce("order-17", rig.chain({"email"}));
  EXPECT_FALSE(result.duplicate);
  EXPECT_EQ(result.receipt.status, Status::Delivered);
  EXPECT_EQ(result.receipt.channel, "email");
  EXPECT_EQ(email->bodies.size(), 1u);
}

TEST(Once, ASecondCallWithTheSameKeySendsNothing) {
  Rig rig;
  auto email = rig.channel("email");
  rig.service->sendOnce("order-17", rig.chain({"email"}));
  const auto again = rig.service->sendOnce("order-17", rig.chain({"email"}));
  EXPECT_TRUE(again.duplicate);
  EXPECT_EQ(email->bodies.size(), 1u);
}

TEST(Once, ADuplicateReturnsTheReceiptOfTheOriginalDelivery) {
  Rig rig;
  rig.channel("push", {P});
  rig.channel("email");
  const auto first = rig.service->sendOnce("k", rig.chain({"push", "email"}));
  const auto again = rig.service->sendOnce("k", rig.chain({"push", "email"}));
  ASSERT_TRUE(again.duplicate);
  EXPECT_EQ(again.receipt.status, Status::Delivered);
  EXPECT_EQ(again.receipt.channel, "email");
  EXPECT_EQ(again.receipt.attempts, first.receipt.attempts);
  EXPECT_EQ(again.receipt.attempts, 2);
  EXPECT_EQ(again.receipt.body, "Hi Ann");
}

TEST(Once, DifferentKeysAreIndependent) {
  Rig rig;
  auto email = rig.channel("email");
  EXPECT_FALSE(rig.service->sendOnce("a", rig.chain({"email"})).duplicate);
  EXPECT_FALSE(rig.service->sendOnce("b", rig.chain({"email"})).duplicate);
  EXPECT_TRUE(rig.service->sendOnce("a", rig.chain({"email"})).duplicate);
  EXPECT_EQ(email->bodies.size(), 2u);
}

TEST(Once, AFailedSendLeavesTheKeyFreeForARetry) {
  Rig rig;
  auto email = rig.channel("email", {P});
  const auto first = rig.service->sendOnce("k", rig.chain({"email"}));
  EXPECT_FALSE(first.duplicate);
  EXPECT_EQ(first.receipt.status, Status::Failed);
  const auto second = rig.service->sendOnce("k", rig.chain({"email"}));
  EXPECT_FALSE(second.duplicate);
  EXPECT_EQ(second.receipt.status, Status::Delivered);
  EXPECT_EQ(email->bodies.size(), 2u);
  EXPECT_TRUE(rig.service->sendOnce("k", rig.chain({"email"})).duplicate);
}

TEST(Once, ARefusedRequestLeavesTheKeyFreeToo) {
  Rig rig;
  auto email = rig.channel("email");
  auto r = rig.chain({"email"});
  r.templateId = "later";
  EXPECT_EQ(rig.service->sendOnce("k", r).receipt.status, Status::UnknownTemplate);
  rig.service->addTemplate("later", "Hello {name}");
  const auto result = rig.service->sendOnce("k", r);
  EXPECT_FALSE(result.duplicate);
  EXPECT_EQ(result.receipt.status, Status::Delivered);
  EXPECT_EQ(email->bodies.size(), 1u);
}

TEST(Once, AnEmptyKeyNeverDeduplicates) {
  Rig rig;
  auto email = rig.channel("email");
  EXPECT_FALSE(rig.service->sendOnce("", rig.chain({"email"})).duplicate);
  EXPECT_FALSE(rig.service->sendOnce("", rig.chain({"email"})).duplicate);
  EXPECT_EQ(email->bodies.size(), 2u);
}

TEST(Once, AKeyBelongsToTheWholeService) {
  Rig rig;
  auto email = rig.channel("email");
  auto sms = rig.channel("sms");
  rig.service->sendOnce("k", rig.chain({"email"}, "ann"));
  const auto other = rig.service->sendOnce("k", rig.chain({"sms"}, "bob"));
  EXPECT_TRUE(other.duplicate);
  EXPECT_EQ(sms->bodies.size(), 0u);
  EXPECT_EQ(email->bodies.size(), 1u);
}

TEST(Once, PlainSendsNeitherReadNorRecordKeys) {
  Rig rig;
  auto email = rig.channel("email");
  rig.service->sendVia(rig.chain({"email"}));
  rig.service->sendVia(rig.chain({"email"}));
  EXPECT_EQ(email->bodies.size(), 2u);
  EXPECT_FALSE(rig.service->sendOnce("k", rig.chain({"email"})).duplicate);
  EXPECT_EQ(email->bodies.size(), 3u);
}

TEST(Once, ADuplicateDoesNotWaitOrRetry) {
  Rig rig;
  rig.channel("email", {T, T});
  const auto first = rig.service->sendOnce("k", rig.chain({"email"}));
  EXPECT_EQ(first.receipt.attempts, 3);
  const auto pausesAfterFirst = rig.pauses.size();
  rig.service->sendOnce("k", rig.chain({"email"}));
  EXPECT_EQ(rig.pauses.size(), pausesAfterFirst);
}

TEST(Once, TheEarlierStormsStillHold) {
  Rig rig;
  auto push = rig.channel("push", {P});
  auto email = rig.channel("email");
  const auto result = rig.service->sendOnce("k", rig.chain({"push", "email"}));
  EXPECT_EQ(result.receipt.channel, "email");
  notif::Request single;
  single.recipient = "ann";
  single.templateId = "hello";
  single.channel = "push";
  single.params = {{"name", "Ann"}};
  EXPECT_EQ(rig.service->send(single).status, Status::Delivered);
  EXPECT_EQ(push->bodies.size(), 2u);
  EXPECT_EQ(email->bodies.size(), 1u);
}
