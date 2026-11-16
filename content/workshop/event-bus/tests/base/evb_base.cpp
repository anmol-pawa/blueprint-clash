#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
// Collects what handlers saw, as a string such as "ab".
struct Log {
  std::string text;
  std::vector<evb::Event> events;
  evb::Handler writer(const std::string& tag) {
    return [this, tag](const evb::Event& e) {
      text += tag;
      events.push_back(e);
    };
  }
};
}  // namespace

TEST(Subscribe, AnIdIsReturned) {
  auto bus = evb::makeBus();
  Log log;
  EXPECT_GT(bus->subscribe("t", log.writer("a")), 0);
}

TEST(Subscribe, IdsGrowAndAreNeverReused) {
  auto bus = evb::makeBus();
  Log log;
  const auto a = bus->subscribe("t", log.writer("a"));
  const auto b = bus->subscribe("t", log.writer("b"));
  EXPECT_GT(b, a);
  EXPECT_TRUE(bus->unsubscribe(a));
  const auto c = bus->subscribe("t", log.writer("c"));
  EXPECT_NE(c, a);
  EXPECT_NE(c, b);
  EXPECT_GT(c, b);
  EXPECT_TRUE(bus->unsubscribe(c));
  const auto d = bus->subscribe("t", log.writer("d"));
  EXPECT_GT(d, c);
}

TEST(Subscribe, AnEmptyTopicOrAnEmptyHandlerIsRefused) {
  auto bus = evb::makeBus();
  Log log;
  EXPECT_EQ(bus->subscribe("", log.writer("a")), evb::kInvalid);
  EXPECT_EQ(bus->subscribe("t", nullptr), evb::kInvalid);
  EXPECT_EQ(bus->publish("t", "x"), 0u);
  EXPECT_EQ(bus->publish("", "x"), 0u);
  EXPECT_EQ(log.text, "");
}

TEST(Publish, TheHandlerReceivesTheEvent) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("orders", log.writer("a"));
  EXPECT_EQ(bus->publish("orders", "o-17"), 1u);
  ASSERT_EQ(log.events.size(), 1u);
  EXPECT_EQ(log.events[0].topic, "orders");
  EXPECT_EQ(log.events[0].payload, "o-17");
}

TEST(Publish, NoSubscribersMeansZeroDeliveries) {
  auto bus = evb::makeBus();
  EXPECT_EQ(bus->publish("nobody", "x"), 0u);
}

TEST(Publish, OnlyTheTopicsOwnSubscribersAreCalled) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("a", log.writer("1"));
  bus->subscribe("b", log.writer("2"));
  bus->subscribe("a", log.writer("3"));
  EXPECT_EQ(bus->publish("a", ""), 2u);
  EXPECT_EQ(log.text, "13");
  EXPECT_EQ(bus->publish("b", ""), 1u);
  EXPECT_EQ(log.text, "132");
}

TEST(Publish, TopicsMatchExactly) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("order", log.writer("a"));
  EXPECT_EQ(bus->publish("orders", ""), 0u);
  EXPECT_EQ(bus->publish("ord", ""), 0u);
  EXPECT_EQ(bus->publish("Order", ""), 0u);
  EXPECT_EQ(bus->publish("order.created", ""), 0u);
  EXPECT_EQ(bus->publish("order", ""), 1u);
  EXPECT_EQ(log.text, "a");
}

TEST(Publish, HandlersRunInTheOrderTheySubscribed) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("t", log.writer("1"));
  bus->subscribe("t", log.writer("2"));
  bus->subscribe("t", log.writer("3"));
  bus->subscribe("t", log.writer("4"));
  bus->publish("t", "");
  EXPECT_EQ(log.text, "1234");
}

TEST(Publish, AnEventIsDeliveredAgainOnEveryPublish) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("t", log.writer("a"));
  bus->publish("t", "1");
  bus->publish("t", "2");
  ASSERT_EQ(log.events.size(), 2u);
  EXPECT_EQ(log.events[1].payload, "2");
}

TEST(Unsubscribe, AnUnsubscribedHandlerIsNotCalled) {
  auto bus = evb::makeBus();
  Log log;
  const auto a = bus->subscribe("t", log.writer("a"));
  bus->subscribe("t", log.writer("b"));
  EXPECT_TRUE(bus->unsubscribe(a));
  EXPECT_EQ(bus->publish("t", ""), 1u);
  EXPECT_EQ(log.text, "b");
}

TEST(Unsubscribe, ItReportsWhetherSomethingWasRemoved) {
  auto bus = evb::makeBus();
  Log log;
  const auto a = bus->subscribe("t", log.writer("a"));
  EXPECT_TRUE(bus->unsubscribe(a));
  EXPECT_FALSE(bus->unsubscribe(a));
  EXPECT_FALSE(bus->unsubscribe(a + 100));
  EXPECT_FALSE(bus->unsubscribe(evb::kInvalid));
  EXPECT_FALSE(bus->unsubscribe(-5));
}

TEST(Unsubscribe, OneTopicsSubscribersAreUntouchedByAnotherUnsubscribing) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("a", log.writer("1"));
  const auto b = bus->subscribe("b", log.writer("2"));
  bus->subscribe("a", log.writer("3"));
  bus->unsubscribe(b);
  bus->publish("a", "");
  EXPECT_EQ(log.text, "13");
}

TEST(DuringDelivery, AHandlerRemovedByAnEarlierHandlerIsNotCalled) {
  auto bus = evb::makeBus();
  Log log;
  evb::SubscriptionId victim = evb::kInvalid;
  bus->subscribe("t", [&](const evb::Event&) {
    log.text += "a";
    bus->unsubscribe(victim);
  });
  victim = bus->subscribe("t", log.writer("b"));
  bus->subscribe("t", log.writer("c"));
  bus->publish("t", "");
  EXPECT_EQ(log.text, "ac");
}

TEST(DuringDelivery, TheCountIsHandlersActuallyCalled) {
  auto bus = evb::makeBus();
  Log log;
  evb::SubscriptionId victim = evb::kInvalid;
  bus->subscribe("t", [&](const evb::Event&) { bus->unsubscribe(victim); });
  victim = bus->subscribe("t", log.writer("b"));
  bus->subscribe("t", log.writer("c"));
  EXPECT_EQ(bus->publish("t", ""), 2u);
  EXPECT_EQ(log.text, "c");
}

TEST(DuringDelivery, ASubscriberAddedDuringDeliveryMissesTheCurrentEvent) {
  auto bus = evb::makeBus();
  Log log;
  bool added = false;
  bus->subscribe("t", [&](const evb::Event&) {
    log.text += "a";
    if (!added) {
      added = true;
      bus->subscribe("t", log.writer("n"));
    }
  });
  EXPECT_EQ(bus->publish("t", ""), 1u);
  EXPECT_EQ(log.text, "a");
  EXPECT_EQ(bus->publish("t", ""), 2u);
  EXPECT_EQ(log.text, "aan");
}

TEST(DuringDelivery, AHandlerMayRemoveItself) {
  auto bus = evb::makeBus();
  Log log;
  evb::SubscriptionId self = evb::kInvalid;
  self = bus->subscribe("t", [&](const evb::Event&) {
    log.text += "once";
    bus->unsubscribe(self);
  });
  bus->subscribe("t", log.writer("|b"));
  EXPECT_EQ(bus->publish("t", ""), 2u);
  EXPECT_EQ(bus->publish("t", ""), 1u);
  EXPECT_EQ(log.text, "once|b|b");
}

TEST(DuringDelivery, APublishFromAHandlerIsDeliveredBeforeTheOuterOneContinues) {
  auto bus = evb::makeBus();
  Log log;
  bus->subscribe("x", [&](const evb::Event&) {
    log.text += "a";
    EXPECT_EQ(bus->publish("y", ""), 1u);
    log.text += "A";
  });
  bus->subscribe("y", log.writer("b"));
  bus->subscribe("x", log.writer("c"));
  EXPECT_EQ(bus->publish("x", ""), 2u);
  EXPECT_EQ(log.text, "abAc");
}
