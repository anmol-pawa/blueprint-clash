#include <memory>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
struct Seen {
  std::string text;
  evb::Handler tag(const std::string& t) {
    return [this, t](const evb::Event& e) { text += t + e.payload + ";"; };
  }
};

bool urgent(const evb::Event& e) { return e.payload.rfind("urgent", 0) == 0; }
}  // namespace

TEST(Filters, ASubscriberWithoutAFilterGetsEverything) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  bus->subscribe("t", seen.tag("a"), nullptr);
  bus->subscribe("t", seen.tag("b"));
  EXPECT_EQ(bus->publish("t", "1"), 2u);
  EXPECT_EQ(seen.text, "a1;b1;");
}

TEST(Filters, AFilterDecidesPerEvent) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  bus->subscribe("t", seen.tag("a"), urgent);
  bus->publish("t", "urgent-1");
  bus->publish("t", "calm");
  bus->publish("t", "urgent-2");
  EXPECT_EQ(seen.text, "aurgent-1;aurgent-2;");
}

TEST(Filters, AFilteredOutEventIsNotCounted) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  bus->subscribe("t", seen.tag("a"), urgent);
  bus->subscribe("t", seen.tag("b"));
  EXPECT_EQ(bus->publish("t", "calm"), 1u);
  EXPECT_EQ(bus->publish("t", "urgent"), 2u);
}

TEST(Filters, AFilterOnlySeesEventsOfItsOwnTopic) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  int calls = 0;
  bus->subscribe("a.b", seen.tag("x"), [&](const evb::Event&) {
    ++calls;
    return true;
  });
  bus->publish("c.d", "");
  bus->publish("a", "");
  EXPECT_EQ(calls, 0);
  bus->publish("a.b", "");
  EXPECT_EQ(calls, 1);
}

TEST(Filters, AFilterIsCalledOncePerPublish) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  int calls = 0;
  bus->subscribe("#", seen.tag("x"), [&](const evb::Event&) {
    ++calls;
    return false;
  });
  bus->publish("a", "");
  bus->publish("a.b", "");
  EXPECT_EQ(calls, 2);
  EXPECT_EQ(seen.text, "");
}

TEST(Filters, FiltersCombineWithWildcards) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  bus->subscribe("orders.*", seen.tag("a"), urgent);
  bus->subscribe("orders.#", seen.tag("b"), [](const evb::Event& e) { return e.topic != "orders.eu"; });
  EXPECT_EQ(bus->publish("orders.eu", "urgent"), 1u);
  EXPECT_EQ(bus->publish("orders.us", "calm"), 1u);
  EXPECT_EQ(bus->publish("orders.us.big", "urgent"), 1u);
  EXPECT_EQ(seen.text, "aurgent;bcalm;burgent;");
}

TEST(Filters, EachSubscriptionHasItsOwnFilter) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  bus->subscribe("t", seen.tag("a"), [](const evb::Event& e) { return e.payload == "1"; });
  bus->subscribe("t", seen.tag("b"), [](const evb::Event& e) { return e.payload == "2"; });
  bus->publish("t", "1");
  bus->publish("t", "2");
  EXPECT_EQ(seen.text, "a1;b2;");
}

TEST(Filters, AFilterRunsRightBeforeItsHandlerNotBeforeTheWholePublish) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  bool ready = false;
  bus->subscribe("t", [&](const evb::Event&) { ready = true; });
  bus->subscribe("t", seen.tag("b"), [&](const evb::Event&) { return ready; });
  EXPECT_EQ(bus->publish("t", "x"), 2u);
  EXPECT_EQ(seen.text, "bx;");
}

TEST(Filters, ASubscriptionRemovedMidDeliveryNeverRunsItsFilter) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  evb::SubscriptionId victim = evb::kInvalid;
  int calls = 0;
  bus->subscribe("t", [&](const evb::Event&) { bus->unsubscribe(victim); });
  victim = bus->subscribe("t", seen.tag("b"), [&](const evb::Event&) {
    ++calls;
    return true;
  });
  EXPECT_EQ(bus->publish("t", ""), 1u);
  EXPECT_EQ(calls, 0);
}

TEST(Filters, TheFilteredBusKeepsHierarchicalTopicsAndRefusals) {
  auto bus = evb::makeFilteredBus();
  Seen seen;
  EXPECT_EQ(bus->subscribe("a..b", seen.tag("x"), nullptr), evb::kInvalid);
  EXPECT_EQ(bus->subscribe("a.#.b", seen.tag("x")), evb::kInvalid);
  EXPECT_EQ(bus->subscribe("a", nullptr, urgent), evb::kInvalid);
  const auto id = bus->subscribe("a.#", seen.tag("x"), urgent);
  EXPECT_GT(id, 0);
  EXPECT_EQ(bus->publish("a.*", "urgent"), 0u);
  EXPECT_EQ(bus->publish("a", "urgent"), 1u);
  EXPECT_TRUE(bus->unsubscribe(id));
  EXPECT_EQ(bus->publish("a", "urgent"), 0u);
}
