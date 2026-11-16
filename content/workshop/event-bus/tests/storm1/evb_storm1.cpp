#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
struct Seen {
  std::string text;
  evb::Handler tag(const std::string& t) {
    return [this, t](const evb::Event&) { text += t; };
  }
};

// Which of the patterns would hear `topic`? Returns the indexes as digits.
std::string hears(const std::vector<std::string>& patterns, const std::string& topic) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  for (std::size_t i = 0; i < patterns.size(); ++i) bus->subscribe(patterns[i], seen.tag(std::to_string(i)));
  bus->publish(topic, "");
  return seen.text;
}
}  // namespace

TEST(Topics, PlainDottedTopicsStillMatchExactly) {
  EXPECT_EQ(hears({"a.b"}, "a.b"), "0");
  EXPECT_EQ(hears({"a.b"}, "a.bc"), "");
  EXPECT_EQ(hears({"a.b"}, "a"), "");
  EXPECT_EQ(hears({"a.b"}, "a.b.c"), "");
  EXPECT_EQ(hears({"a"}, "A"), "");
}

TEST(Topics, StarMatchesExactlyOneSegment) {
  EXPECT_EQ(hears({"orders.*"}, "orders.created"), "0");
  EXPECT_EQ(hears({"orders.*"}, "orders"), "");
  EXPECT_EQ(hears({"orders.*"}, "orders.eu.created"), "");
  EXPECT_EQ(hears({"orders.*"}, "payments.created"), "");
}

TEST(Topics, StarMayStandAnywhereAndRepeat) {
  EXPECT_EQ(hears({"*.created"}, "orders.created"), "0");
  EXPECT_EQ(hears({"*.created"}, "a.b.created"), "");
  EXPECT_EQ(hears({"orders.*.created"}, "orders.eu.created"), "0");
  EXPECT_EQ(hears({"orders.*.created"}, "orders.created"), "");
  EXPECT_EQ(hears({"*.*"}, "a.b"), "0");
  EXPECT_EQ(hears({"*.*"}, "a"), "");
  EXPECT_EQ(hears({"*"}, "a"), "0");
  EXPECT_EQ(hears({"*"}, "a.b"), "");
}

TEST(Topics, HashMatchesZeroOrMoreSegmentsAtTheEnd) {
  EXPECT_EQ(hears({"orders.#"}, "orders"), "0");
  EXPECT_EQ(hears({"orders.#"}, "orders.created"), "0");
  EXPECT_EQ(hears({"orders.#"}, "orders.eu.created"), "0");
  EXPECT_EQ(hears({"orders.#"}, "order"), "");
  EXPECT_EQ(hears({"orders.#"}, "ordersx.y"), "");
  EXPECT_EQ(hears({"orders.*.#"}, "orders"), "");
  EXPECT_EQ(hears({"orders.*.#"}, "orders.eu"), "0");
}

TEST(Topics, HashAloneMatchesEveryTopic) {
  EXPECT_EQ(hears({"#"}, "a"), "0");
  EXPECT_EQ(hears({"#"}, "a.b.c"), "0");
}

TEST(Topics, InvalidPatternsAreRefused) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  for (const char* bad : {"", ".a", "a.", "a..b", "a.#.b", "#.a", "."}) {
    EXPECT_EQ(bus->subscribe(bad, seen.tag("x")), evb::kInvalid);
  }
  EXPECT_EQ(bus->subscribe("a", nullptr), evb::kInvalid);
  EXPECT_GT(bus->subscribe("a.#", seen.tag("x")), 0);
}

TEST(Topics, APublishToAWildcardOrMalformedTopicDeliversNothing) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  bus->subscribe("orders.*", seen.tag("a"));
  bus->subscribe("#", seen.tag("b"));
  bus->subscribe("orders.#", seen.tag("c"));
  EXPECT_EQ(bus->publish("orders.*", ""), 0u);
  EXPECT_EQ(bus->publish("#", ""), 0u);
  EXPECT_EQ(bus->publish("orders.#", ""), 0u);
  EXPECT_EQ(bus->publish("orders..x", ""), 0u);
  EXPECT_EQ(bus->publish("", ""), 0u);
  EXPECT_EQ(seen.text, "");
}

TEST(Topics, DeliveryIsInSubscriptionOrderAcrossPatterns) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  bus->subscribe("#", seen.tag("1"));
  bus->subscribe("a.b", seen.tag("2"));
  bus->subscribe("a.*", seen.tag("3"));
  bus->subscribe("a.b", seen.tag("4"));
  bus->subscribe("x.y", seen.tag("5"));
  EXPECT_EQ(bus->publish("a.b", ""), 4u);
  EXPECT_EQ(seen.text, "1234");
}

TEST(Topics, TwoSubscriptionsAreTwoDeliveries) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  bus->subscribe("a.*", seen.tag("x"));
  bus->subscribe("a.b", seen.tag("x"));
  EXPECT_EQ(bus->publish("a.b", ""), 2u);
  EXPECT_EQ(seen.text, "xx");
}

TEST(Topics, UnsubscribingAWildcardSubscriptionWorks) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  const auto a = bus->subscribe("a.#", seen.tag("1"));
  bus->subscribe("a.b", seen.tag("2"));
  EXPECT_TRUE(bus->unsubscribe(a));
  EXPECT_FALSE(bus->unsubscribe(a));
  bus->publish("a.b", "");
  EXPECT_EQ(seen.text, "2");
}

TEST(Topics, TheDeliveryRulesOfTheBaseBusStillHold) {
  auto bus = evb::makeHierarchicalBus();
  Seen seen;
  evb::SubscriptionId victim = evb::kInvalid;
  bool added = false;
  bus->subscribe("#", [&](const evb::Event&) {
    seen.text += "a";
    bus->unsubscribe(victim);
    if (!added) {
      added = true;
      bus->subscribe("t.*", seen.tag("n"));
    }
  });
  victim = bus->subscribe("t.*", seen.tag("b"));
  bus->subscribe("t.x", seen.tag("c"));
  EXPECT_EQ(bus->publish("t.x", ""), 2u);
  EXPECT_EQ(seen.text, "ac");
  EXPECT_EQ(bus->publish("t.x", ""), 3u);
  EXPECT_EQ(seen.text, "acacn");
}

TEST(Topics, TheOriginalBusStillMatchesExactly) {
  auto bus = evb::makeBus();
  Seen seen;
  bus->subscribe("a.*", seen.tag("x"));
  EXPECT_EQ(bus->publish("a.b", ""), 0u);
  EXPECT_EQ(bus->publish("a.*", ""), 1u);
}
