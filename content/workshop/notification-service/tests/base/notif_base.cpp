#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using notif::SendResult;
using notif::Status;

// A channel that answers from a script (then Delivered forever) and remembers every call.
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

// A service plus a record of the waits it asked for.
struct Rig {
  explicit Rig(int maxAttempts = 3, long long firstDelayMs = 100) {
    notif::RetryConfig config;
    config.maxAttempts = maxAttempts;
    config.firstDelayMs = firstDelayMs;
    config.pause = [this](long long ms) { pauses.push_back(ms); };
    service = notif::makeService(config);
  }

  std::shared_ptr<FakeChannel> channel(const std::string& name, std::vector<SendResult> script = {}) {
    auto fake = std::make_shared<FakeChannel>(std::move(script));
    service->addChannel(name, fake);
    return fake;
  }

  notif::Request request(const std::string& channel = "email", const std::string& tmpl = "hello") {
    notif::Request r;
    r.recipient = "ann";
    r.templateId = tmpl;
    r.channel = channel;
    r.params = {{"name", "Ann"}};
    return r;
  }

  std::unique_ptr<notif::NotificationService> service;
  std::vector<long long> pauses;
};

const SendResult T = SendResult::Transient;
const SendResult P = SendResult::Permanent;
}  // namespace

TEST(Registration, AChannelNeedsANameAndAnImplementation) {
  Rig rig;
  EXPECT_FALSE(rig.service->addChannel("", std::make_shared<FakeChannel>()));
  EXPECT_FALSE(rig.service->addChannel("email", nullptr));
  EXPECT_TRUE(rig.service->addChannel("email", std::make_shared<FakeChannel>()));
}

TEST(Registration, ANameCannotBeRegisteredTwoTimes) {
  Rig rig;
  auto first = rig.channel("email");
  auto second = std::make_shared<FakeChannel>();
  EXPECT_FALSE(rig.service->addChannel("email", second));
  rig.service->addTemplate("hello", "Hi {name}");
  EXPECT_EQ(rig.service->send(rig.request()).status, Status::Delivered);
  EXPECT_EQ(first->bodies.size(), 1u);
  EXPECT_EQ(second->bodies.size(), 0u);
}

TEST(Registration, ATemplateNeedsAnIdAndCannotBeStoredTwice) {
  Rig rig;
  EXPECT_FALSE(rig.service->addTemplate("", "text"));
  EXPECT_TRUE(rig.service->addTemplate("hello", "Hi {name}"));
  EXPECT_FALSE(rig.service->addTemplate("hello", "Other"));
  auto email = rig.channel("email");
  rig.service->send(rig.request());
  ASSERT_EQ(email->bodies.size(), 1u);
  EXPECT_EQ(email->bodies[0], "Hi Ann");
}

TEST(Registration, TheRetryConfigurationIsChecked) {
  notif::RetryConfig bad;
  bad.maxAttempts = 0;
  EXPECT_TRUE(notif::makeService(bad) == nullptr);
  notif::RetryConfig negative;
  negative.firstDelayMs = -1;
  EXPECT_TRUE(notif::makeService(negative) == nullptr);
  notif::RetryConfig fine;
  EXPECT_TRUE(notif::makeService(fine) != nullptr);
}

TEST(Validation, AnEmptyRecipientIsInvalid) {
  Rig rig;
  auto email = rig.channel("email");
  rig.service->addTemplate("hello", "Hi {name}");
  auto r = rig.request();
  r.recipient = "";
  const auto receipt = rig.service->send(r);
  EXPECT_EQ(receipt.status, Status::InvalidRequest);
  EXPECT_EQ(receipt.attempts, 0);
  EXPECT_EQ(email->bodies.size(), 0u);
}

TEST(Validation, AnUnknownTemplateIsRefused) {
  Rig rig;
  auto email = rig.channel("email");
  const auto receipt = rig.service->send(rig.request("email", "nope"));
  EXPECT_EQ(receipt.status, Status::UnknownTemplate);
  EXPECT_EQ(receipt.attempts, 0);
  EXPECT_EQ(email->bodies.size(), 0u);
}

TEST(Validation, AnUnknownChannelIsRefused) {
  Rig rig;
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request("fax"));
  EXPECT_EQ(receipt.status, Status::UnknownChannel);
  EXPECT_EQ(receipt.attempts, 0);
  EXPECT_EQ(receipt.channel, "");
}

TEST(Validation, ChecksRunInTheDocumentedOrder) {
  Rig rig;
  rig.channel("email");
  rig.service->addTemplate("hello", "Hi {name}");
  auto r = rig.request("fax", "nope");
  r.params.clear();
  EXPECT_EQ(rig.service->send(r).status, Status::UnknownTemplate);  // template before channel
  r = rig.request("fax", "hello");
  r.params.clear();
  EXPECT_EQ(rig.service->send(r).status, Status::UnknownChannel);  // channel before params
  r.recipient = "";
  EXPECT_EQ(rig.service->send(r).status, Status::InvalidRequest);  // recipient before everything
}

TEST(Rendering, PlaceholdersAreFilledFromTheParams) {
  Rig rig;
  auto email = rig.channel("email");
  rig.service->addTemplate("shipped", "Hi {name}, order {order_id} left on {day2}.");
  auto r = rig.request("email", "shipped");
  r.params = {{"name", "Ann"}, {"order_id", "A-17"}, {"day2", "Monday"}};
  const auto receipt = rig.service->send(r);
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.body, "Hi Ann, order A-17 left on Monday.");
  ASSERT_EQ(email->bodies.size(), 1u);
  EXPECT_EQ(email->bodies[0], "Hi Ann, order A-17 left on Monday.");
}

TEST(Rendering, TheSameNameCanAppearTwiceAndExtraParamsAreIgnored) {
  Rig rig;
  rig.channel("email");
  rig.service->addTemplate("twice", "{who}-{who}");
  auto r = rig.request("email", "twice");
  r.params = {{"who", "x"}, {"unused", "y"}};
  EXPECT_EQ(rig.service->send(r).body, "x-x");
}

TEST(Rendering, AMissingParamStopsTheSendBeforeAnyChannelIsCalled) {
  Rig rig;
  auto email = rig.channel("email");
  rig.service->addTemplate("hello", "Hi {name}, code {code}");
  const auto receipt = rig.service->send(rig.request());  // carries name only
  EXPECT_EQ(receipt.status, Status::MissingParam);
  EXPECT_EQ(receipt.attempts, 0);
  EXPECT_EQ(email->bodies.size(), 0u);
}

TEST(Rendering, ValuesAreInsertedAsTheyAreAndNeverExpandedAgain) {
  Rig rig;
  rig.channel("email");
  rig.service->addTemplate("hello", "Hi {name}!");
  auto r = rig.request();
  r.params = {{"name", "{secret}"}, {"secret", "hunter2"}};
  EXPECT_EQ(rig.service->send(r).body, "Hi {secret}!");
}

TEST(Rendering, ABraceThatIsNotAPlaceholderStaysAsText) {
  Rig rig;
  rig.channel("email");
  rig.service->addTemplate("odd", "a {} b { x } c {a-b} d { e } f{");
  auto r = rig.request("email", "odd");
  r.params = {{"x", "X"}, {"a-b", "Y"}};
  const auto receipt = rig.service->send(r);
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.body, "a {} b { x } c {a-b} d { e } f{");
}

TEST(Rendering, OnlyTheInnerPairOfDoubledBracesIsAPlaceholder) {
  Rig rig;
  rig.channel("email");
  rig.service->addTemplate("braces", "{{x}} and {x}}");
  auto r = rig.request("email", "braces");
  r.params = {{"x", "1"}};
  EXPECT_EQ(rig.service->send(r).body, "{1} and 1}");
}

TEST(Delivery, AFirstTrySuccessIsReportedOnce) {
  Rig rig;
  auto email = rig.channel("email");
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request());
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.attempts, 1);
  EXPECT_EQ(receipt.channel, "email");
  ASSERT_EQ(email->recipients.size(), 1u);
  EXPECT_EQ(email->recipients[0], "ann");
  EXPECT_TRUE(rig.pauses.empty());
}

TEST(Delivery, OnlyTheNamedChannelIsUsed) {
  Rig rig;
  auto email = rig.channel("email");
  auto sms = rig.channel("sms");
  rig.service->addTemplate("hello", "Hi {name}");
  rig.service->send(rig.request("sms"));
  EXPECT_EQ(email->bodies.size(), 0u);
  EXPECT_EQ(sms->bodies.size(), 1u);
}

TEST(Retry, ATransientFailureIsRetriedWithADoublingWait) {
  Rig rig;
  auto email = rig.channel("email", {T, T, SendResult::Delivered});
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request());
  EXPECT_EQ(receipt.status, Status::Delivered);
  EXPECT_EQ(receipt.attempts, 3);
  EXPECT_EQ(email->bodies.size(), 3u);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100, 200}));
}

TEST(Retry, TheAttemptsRunOutAndThereIsNoWaitAfterTheLastOne) {
  Rig rig;
  auto email = rig.channel("email", {T, T, T, T, T});
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request());
  EXPECT_EQ(receipt.status, Status::Failed);
  EXPECT_EQ(receipt.attempts, 3);
  EXPECT_EQ(receipt.channel, "email");
  EXPECT_EQ(receipt.body, "Hi Ann");
  EXPECT_EQ(email->bodies.size(), 3u);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100, 200}));
}

TEST(Retry, APermanentFailureIsNeverRetried) {
  Rig rig;
  auto email = rig.channel("email", {P, SendResult::Delivered});
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request());
  EXPECT_EQ(receipt.status, Status::Failed);
  EXPECT_EQ(receipt.attempts, 1);
  EXPECT_EQ(email->bodies.size(), 1u);
  EXPECT_TRUE(rig.pauses.empty());
}

TEST(Retry, APermanentFailureAfterATransientOneStopsThere) {
  Rig rig;
  auto email = rig.channel("email", {T, P, SendResult::Delivered});
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request());
  EXPECT_EQ(receipt.status, Status::Failed);
  EXPECT_EQ(receipt.attempts, 2);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100}));
}

TEST(Retry, MaxAttemptsIsTheTotalNumberOfCalls) {
  Rig rig(1);
  auto email = rig.channel("email", {T, SendResult::Delivered});
  rig.service->addTemplate("hello", "Hi {name}");
  const auto receipt = rig.service->send(rig.request());
  EXPECT_EQ(receipt.status, Status::Failed);
  EXPECT_EQ(receipt.attempts, 1);
  EXPECT_EQ(email->bodies.size(), 1u);
  EXPECT_TRUE(rig.pauses.empty());
}

TEST(Retry, TheFirstDelayAndTheAttemptLimitAreConfigurable) {
  Rig rig(5, 50);
  rig.channel("email", {T, T, T, T, T});
  rig.service->addTemplate("hello", "Hi {name}");
  EXPECT_EQ(rig.service->send(rig.request()).attempts, 5);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{50, 100, 200, 400}));
}

TEST(Retry, EverySendStartsItsBackoffAgain) {
  Rig rig;
  rig.channel("email", {T, T, T, T, SendResult::Delivered});
  rig.service->addTemplate("hello", "Hi {name}");
  EXPECT_EQ(rig.service->send(rig.request()).status, Status::Failed);
  EXPECT_EQ(rig.service->send(rig.request()).status, Status::Delivered);
  EXPECT_EQ(rig.pauses, (std::vector<long long>{100, 200, 100}));
}

TEST(Retry, AServiceWithoutAPauseFunctionStillRetries) {
  notif::RetryConfig config;
  auto service = notif::makeService(config);
  auto email = std::make_shared<FakeChannel>(std::vector<SendResult>{T, T});
  service->addChannel("email", email);
  service->addTemplate("hello", "Hi {name}");
  notif::Request r;
  r.recipient = "ann";
  r.templateId = "hello";
  r.channel = "email";
  r.params = {{"name", "Ann"}};
  EXPECT_EQ(service->send(r).status, Status::Delivered);
  EXPECT_EQ(email->bodies.size(), 3u);
}

TEST(Retry, AFailureDoesNotSpoilTheNextSend) {
  Rig rig;
  rig.channel("email", {P});
  rig.service->addTemplate("hello", "Hi {name}");
  EXPECT_EQ(rig.service->send(rig.request()).status, Status::Failed);
  EXPECT_EQ(rig.service->send(rig.request()).status, Status::Delivered);
}
