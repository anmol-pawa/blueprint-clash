#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm1.h"
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
  explicit Rig(int maxAttempts = 3, long long firstDelayMs = 100) {
    notif::RetryConfig config;
    config.maxAttempts = maxAttempts;
    config.firstDelayMs = firstDelayMs;
    config.pause = [this](long long ms) { pauses.push_back(ms); };
    service = notif::makeFallbackService(config);
    service->addTemplate("hello", "Hi {name}");
  }

  std::shared_ptr<FakeChannel> channel(const std::string& name, std::vector<SendResult> script = {}) {
    auto fake = std::make_shared<FakeChannel>(std::move(script));
    service->addChannel(name, fake);
    return fake;
  }

  notif::ChainRequest chain(std::vector<std::string> channels) {
    notif::ChainRequest r;
    r.recipient = "ann";
    r.templateId = "hello";
    r.channels = std::move(channels);
    r.params = {{"name", "Ann"}};
    return r;
  }

  std::unique_ptr<notif::FallbackService> service;
  std::vector<long long> pauses;
};

const SendResult T = SendResult::Transient;
const SendResult P = SendResult::Permanent;
const SendResult D = SendResult::Delivered;
}  // namespace

TEST(Fallback, TheFirstChannelThatDeliversEndsTheChain) {
  Rig rig;
  auto push = rig.channel("push");
  auto email = rig.channel("email");
  const auto receipt = rig.service->sendVia(rig.chain({"push", "email"}));
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.channel, "push");
  EXPECT_EQ(receipt.attempts, 1);
  EXPECT_EQ(push->bodies.size(), 1u);
  EXPECT_EQ(email->bodies.size(), 0u);
}

TEST(Fallback, APermanentFailureHandsOverAtOnce) {
  Rig rig;
  auto push = rig.channel("push", {P});
  auto email = rig.channel("email");
  const auto receipt = rig.service->sendVia(rig.chain({"push", "email"}));
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.channel, "email");
  EXPECT_EQ(receipt.attempts, 2);
  EXPECT_EQ(push->bodies.size(), 1u);
  EXPECT_EQ(email->bodies.size(), 1u);
  EXPECT_TRUE(rig.pauses.empty());
}

TEST(Fallback, AChannelUsesItsWholeRetryBudgetBeforeTheNextOneIsTried) {
  Rig rig;
  auto push = rig.channel("push", {T, T, T, T});
  auto email = rig.channel("email");
  const auto receipt = rig.service->sendVia(rig.chain({"push", "email"}));
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.channel, "email");
  EXPECT_EQ(receipt.attempts, 4);
  EXPECT_EQ(push->bodies.size(), 3u);
  EXPECT_EQ(email->bodies.size(), 1u);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100, 200}));
}

TEST(Fallback, EveryChannelGetsAFullBudgetAndABackoffThatStartsOver) {
  Rig rig;
  auto push = rig.channel("push", {T, T, T});
  auto email = rig.channel("email", {T, D});
  const auto receipt = rig.service->sendVia(rig.chain({"push", "email"}));
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.attempts, 5);
  EXPECT_EQ(email->bodies.size(), 2u);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100, 200, 100}));
}

TEST(Fallback, WhenEveryChannelFailsTheReceiptNamesTheLastOneTried) {
  Rig rig;
  rig.channel("push", {P});
  rig.channel("email", {T, T, T});
  rig.channel("sms", {P});
  const auto receipt = rig.service->sendVia(rig.chain({"push", "email", "sms"}));
  EXPECT_EQ(receipt.status, Status::Failed);
  EXPECT_EQ(receipt.channel, "sms");
  EXPECT_EQ(receipt.attempts, 5);
  EXPECT_EQ(receipt.body, "Hi Ann");
}

TEST(Fallback, EveryChannelReceivesTheSameRenderedText) {
  Rig rig;
  auto push = rig.channel("push", {P});
  auto email = rig.channel("email");
  rig.service->sendVia(rig.chain({"push", "email"}));
  ASSERT_EQ(push->bodies.size(), 1u);
  ASSERT_EQ(email->bodies.size(), 1u);
  EXPECT_EQ(push->bodies[0], "Hi Ann");
  EXPECT_EQ(email->bodies[0], "Hi Ann");
  EXPECT_EQ(email->recipients[0], "ann");
}

TEST(Fallback, ANameThatIsNotRegisteredIsSkipped) {
  Rig rig;
  auto email = rig.channel("email");
  const auto receipt = rig.service->sendVia(rig.chain({"ghost", "email"}));
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.channel, "email");
  EXPECT_EQ(receipt.attempts, 1);
  EXPECT_EQ(email->bodies.size(), 1u);
}

TEST(Fallback, AChainWithNoRegisteredChannelIsUnknownChannel) {
  Rig rig;
  rig.channel("email");
  const auto a = rig.service->sendVia(rig.chain({"ghost", "phantom"}));
  EXPECT_EQ(a.status, Status::UnknownChannel);
  EXPECT_EQ(a.attempts, 0);
  EXPECT_EQ(rig.service->sendVia(rig.chain({})).status, Status::UnknownChannel);
}

TEST(Fallback, ANameListedTwiceIsTriedOnce) {
  Rig rig;
  auto email = rig.channel("email", {P, D});
  auto sms = rig.channel("sms", {P});
  const auto receipt = rig.service->sendVia(rig.chain({"email", "sms", "email"}));
  EXPECT_EQ(receipt.status, Status::Failed);
  EXPECT_EQ(receipt.channel, "sms");
  EXPECT_EQ(receipt.attempts, 2);
  EXPECT_EQ(email->bodies.size(), 1u);
}

TEST(Fallback, ValidationMatchesTheSingleChannelSend) {
  Rig rig;
  auto email = rig.channel("email");
  auto r = rig.chain({"email"});
  r.recipient = "";
  EXPECT_EQ(rig.service->sendVia(r).status, Status::InvalidRequest);
  r = rig.chain({"ghost"});
  r.templateId = "nope";
  EXPECT_EQ(rig.service->sendVia(r).status, Status::UnknownTemplate);  // template before channel
  rig.service->addTemplate("needs", "Hi {name} {code}");
  r = rig.chain({"ghost"});
  r.templateId = "needs";
  EXPECT_EQ(rig.service->sendVia(r).status, Status::UnknownChannel);  // channel before params
  r = rig.chain({"email"});
  r.templateId = "needs";
  const auto receipt = rig.service->sendVia(r);
  EXPECT_EQ(receipt.status, Status::MissingParam);
  EXPECT_EQ(receipt.attempts, 0);
  EXPECT_EQ(email->bodies.size(), 0u);
}

TEST(Fallback, TheSingleChannelSendStillWorks) {
  Rig rig;
  auto email = rig.channel("email", {T, D});
  notif::Request r;
  r.recipient = "ann";
  r.templateId = "hello";
  r.channel = "email";
  r.params = {{"name", "Ann"}};
  const auto receipt = rig.service->send(r);
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.attempts, 2);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100}));
  r.channel = "ghost";
  EXPECT_EQ(rig.service->send(r).status, Status::UnknownChannel);
}
