#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
struct Log {
  std::vector<std::string> lines;
  bus::Handler tag(const std::string& name) {
    return [this, name](const bus::Event& e) { lines.push_back(name + ":" + e.payload); };
  }
  std::string joined() const {
    std::string out;
    for (const auto& line : lines) out += (out.empty() ? "" : " ") + line;
    return out;
  }
};

bus::Event ev(const std::string& topic, const std::string& payload = "x") { return bus::Event{topic, payload}; }
bus::Options prio(int priority) { return bus::Options{priority, false}; }
bus::Options once() { return bus::Options{0, true}; }
}  // namespace

TEST(Priority, HigherPriorityRunsFirst) {
  auto b = bus::makeOrderedBus();
  Log log;
  b->subscribe("a", log.tag("zero"), prio(0));
  b->subscribe("a", log.tag("five"), prio(5));
  b->subscribe("a", log.tag("minus"), prio(-3));
  EXPECT_EQ(b->publish(ev("a", "p")), 3);
  EXPECT_EQ(log.joined(), "five:p zero:p minus:p");
}

TEST(Priority, EqualPrioritiesKeepSubscriptionOrder) {
  auto b = bus::makeOrderedBus();
  Log log;
  b->subscribe("a", log.tag("a"), prio(2));
  b->subscribe("a", log.tag("b"), prio(2));
  b->subscribe("a", log.tag("c"), prio(2));
  b->subscribe("a", log.tag("top"), prio(9));
  b->publish(ev("a", "p"));
  EXPECT_EQ(log.joined(), "top:p a:p b:p c:p");
}

TEST(Priority, AppliesAcrossDifferentPatterns) {
  auto b = bus::makeOrderedBus();
  Log log;
  b->subscribe("orders.*", log.tag("star"), prio(1));
  b->subscribe("orders.created", log.tag("exact"), prio(9));
  b->subscribe("#", log.tag("all"), prio(1));
  b->publish(ev("orders.created", "p"));
  EXPECT_EQ(log.joined(), "exact:p star:p all:p");
}

TEST(Priority, PlainSubscribeMeansPriorityZero) {
  auto b = bus::makeOrderedBus();
  Log log;
  b->subscribe("a", log.tag("plain1"));
  b->subscribe("a", log.tag("low"), prio(-1));
  b->subscribe("a", log.tag("high"), prio(1));
  b->subscribe("a", log.tag("plain2"));
  b->publish(ev("a", "p"));
  EXPECT_EQ(log.joined(), "high:p plain1:p plain2:p low:p");
}

TEST(Once, FiresExactlyOnce) {
  auto b = bus::makeOrderedBus();
  Log log;
  const int id = b->subscribe("a", log.tag("once"), once());
  EXPECT_EQ(b->subscriptionCount(), 1);
  EXPECT_EQ(b->publish(ev("a", "1")), 1);
  EXPECT_EQ(b->publish(ev("a", "2")), 0);
  EXPECT_EQ(log.joined(), "once:1");
  EXPECT_EQ(b->subscriptionCount(), 0);
  EXPECT_FALSE(b->unsubscribe(id));
}

TEST(Once, IsRemovedBeforeItsHandlerRuns) {
  auto b = bus::makeOrderedBus();
  int countInside = -1;
  int idInside = -1;
  const int id = b->subscribe("a", [&](const bus::Event&) {
    countInside = b->subscriptionCount();
    idInside = b->unsubscribe(1) ? 1 : 0;
  }, once());
  EXPECT_EQ(id, 1);
  b->publish(ev("a"));
  EXPECT_EQ(countInside, 0);
  EXPECT_EQ(idInside, 0);
}

TEST(Once, DoesNotFireAgainFromANestedPublish) {
  auto b = bus::makeOrderedBus();
  int calls = 0;
  b->subscribe("a", [&](const bus::Event&) {
    ++calls;
    if (calls < 5) b->publish(ev("a"));
  }, once());
  b->publish(ev("a"));
  EXPECT_EQ(calls, 1);
}

TEST(Once, ANestedPublishConsumesItAndTheOuterOneSkipsIt) {
  auto b = bus::makeOrderedBus();
  Log log;
  int nestedResult = -1;
  bool nested = false;
  b->subscribe("t", [&](const bus::Event&) {
    log.lines.push_back("A");
    if (!nested) {
      nested = true;
      nestedResult = b->publish(ev("t"));
    }
  }, prio(10));
  b->subscribe("t", log.tag("B"), bus::Options{0, true});
  const int outerResult = b->publish(ev("t", "p"));
  EXPECT_EQ(log.joined(), "A A B:x");
  EXPECT_EQ(nestedResult, 2);
  EXPECT_EQ(outerResult, 1);
}

TEST(Once, AnUnsubscribedOnceSubscriptionNeverFires) {
  auto b = bus::makeOrderedBus();
  Log log;
  const int id = b->subscribe("a", log.tag("once"), once());
  EXPECT_TRUE(b->unsubscribe(id));
  EXPECT_EQ(b->publish(ev("a")), 0);
  EXPECT_TRUE(log.lines.empty());
}

TEST(Once, WorksWithWildcardPatternsAndPriorities) {
  auto b = bus::makeOrderedBus();
  Log log;
  b->subscribe("orders.*", log.tag("once"), bus::Options{5, true});
  b->subscribe("orders.*", log.tag("always"));
  b->publish(ev("orders.created", "1"));
  b->publish(ev("orders.paid", "2"));
  EXPECT_EQ(log.joined(), "once:1 always:1 always:2");
}

TEST(Options, TheOrderedBusStillUnderstandsPatternsAndRefusals) {
  auto b = bus::makeOrderedBus();
  Log log;
  EXPECT_EQ(b->subscribe("a.#.b", log.tag("x"), prio(1)), bus::kRefused);
  EXPECT_EQ(b->subscribe("a.*", nullptr, prio(1)), bus::kRefused);
  EXPECT_EQ(b->subscribe("a.*", log.tag("ok")), 1);
  EXPECT_EQ(b->publish(ev("a.b", "p")), 1);
  EXPECT_EQ(b->publish(ev("a.*", "p")), 0);
}
