#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
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

// Subscribes `pattern` to a fresh counter and returns how many of `topics` it received.
int hits(const std::string& pattern, const std::vector<std::string>& topics) {
  auto b = bus::makePatternBus();
  int count = 0;
  b->subscribe(pattern, [&](const bus::Event&) { ++count; });
  for (const auto& topic : topics) b->publish(ev(topic));
  return count;
}
}  // namespace

TEST(Patterns, AnExactPatternBehavesAsBefore) {
  auto b = bus::makePatternBus();
  Log log;
  EXPECT_EQ(b->subscribe("orders.created", log.tag("o")), 1);
  EXPECT_EQ(b->publish(ev("orders.created", "p")), 1);
  EXPECT_EQ(b->publish(ev("orders.created.eu")), 0);
  EXPECT_EQ(b->publish(ev("orders")), 0);
  EXPECT_EQ(log.joined(), "o:p");
}

TEST(Wildcards, StarMatchesExactlyOneSegment) {
  EXPECT_EQ(hits("orders.*", {"orders.created", "orders.paid"}), 2);
  EXPECT_EQ(hits("orders.*", {"orders"}), 0);
  EXPECT_EQ(hits("orders.*", {"orders.eu.created"}), 0);
  EXPECT_EQ(hits("orders.*", {"payments.created"}), 0);
}

TEST(Wildcards, StarInTheMiddleOrAtTheStart) {
  EXPECT_EQ(hits("orders.*.created", {"orders.eu.created", "orders.us.created"}), 2);
  EXPECT_EQ(hits("orders.*.created", {"orders.created", "orders.eu.us.created", "orders.eu.paid"}), 0);
  EXPECT_EQ(hits("*.created", {"orders.created", "users.created", "created"}), 2);
  EXPECT_EQ(hits("*.*", {"a.b", "a", "a.b.c"}), 1);
}

TEST(Wildcards, HashNeedsAtLeastOneSegment) {
  EXPECT_EQ(hits("orders.#", {"orders.created", "orders.eu.created", "orders.a.b.c.d"}), 3);
  EXPECT_EQ(hits("orders.#", {"orders"}), 0);
  EXPECT_EQ(hits("orders.#", {"order.created", "xorders.created"}), 0);
  EXPECT_EQ(hits("#", {"a", "a.b", "a.b.c"}), 3);
}

TEST(Wildcards, StarAndHashCombine) {
  EXPECT_EQ(hits("orders.*.#", {"orders.eu.created", "orders.eu.created.late"}), 2);
  EXPECT_EQ(hits("orders.*.#", {"orders.eu", "orders"}), 0);
}

TEST(Patterns, HashMustBeTheLastSegment) {
  auto b = bus::makePatternBus();
  Log log;
  EXPECT_EQ(b->subscribe("a.#.b", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscribe("#.b", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscriptionCount(), 0);
  EXPECT_EQ(b->subscribe("a.#", log.tag("ok")), 1);
}

TEST(Patterns, EmptySegmentsAreRefused) {
  auto b = bus::makePatternBus();
  Log log;
  EXPECT_EQ(b->subscribe("a..b", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscribe(".a", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscribe("a.", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscribe("", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscriptionCount(), 0);
}

TEST(Patterns, AWildcardMustBeTheWholeSegment) {
  auto b = bus::makePatternBus();
  Log log;
  EXPECT_EQ(b->subscribe("a*", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscribe("a.b#", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscribe("*x.b", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscriptionCount(), 0);
}

TEST(Publish, AWildcardTopicOnPublishIsRefused) {
  auto b = bus::makePatternBus();
  Log log;
  b->subscribe("a.*", log.tag("star"));
  b->subscribe("a.#", log.tag("hash"));
  b->subscribe("#", log.tag("all"));
  EXPECT_EQ(b->publish(ev("a.*")), 0);
  EXPECT_EQ(b->publish(ev("a.#")), 0);
  EXPECT_EQ(b->publish(ev("*")), 0);
  EXPECT_EQ(b->publish(ev("a..b")), 0);
  EXPECT_EQ(b->publish(ev("")), 0);
  EXPECT_TRUE(log.lines.empty());
}

TEST(Order, DeliveryFollowsSubscriptionOrderNotPatternSpecificity) {
  auto b = bus::makePatternBus();
  Log log;
  b->subscribe("orders.*", log.tag("star"));
  b->subscribe("orders.created", log.tag("exact"));
  b->subscribe("#", log.tag("all"));
  b->subscribe("orders.#", log.tag("hash"));
  EXPECT_EQ(b->publish(ev("orders.created", "p")), 4);
  EXPECT_EQ(log.joined(), "star:p exact:p all:p hash:p");
}

TEST(Wildcards, OneSubscriptionIsCalledOncePerEventEvenIfItMatchesInSeveralWays) {
  auto b = bus::makePatternBus();
  Log log;
  b->subscribe("*.*", log.tag("pair"));
  EXPECT_EQ(b->publish(ev("a.b")), 1);
  EXPECT_EQ(log.lines.size(), static_cast<std::size_t>(1));
}

TEST(Wildcards, UnsubscribingAPatternStopsIt) {
  auto b = bus::makePatternBus();
  Log log;
  const int id = b->subscribe("orders.#", log.tag("hash"));
  b->subscribe("orders.created", log.tag("exact"));
  EXPECT_TRUE(b->unsubscribe(id));
  EXPECT_EQ(b->publish(ev("orders.created", "p")), 1);
  EXPECT_EQ(log.joined(), "exact:p");
}

TEST(Wildcards, MatchingIsCaseSensitive) {
  EXPECT_EQ(hits("Orders.*", {"orders.created"}), 0);
  EXPECT_EQ(hits("orders.*", {"orders.Created"}), 1);
}

TEST(Reentrancy, PatternSubscribersFollowTheSameRules) {
  auto b = bus::makePatternBus();
  Log log;
  int self = 0;
  self = b->subscribe("a.#", [&](const bus::Event&) {
    log.lines.push_back("self");
    b->unsubscribe(self);
    b->subscribe("a.*", log.tag("late"));
  });
  b->subscribe("a.b", log.tag("next"));
  EXPECT_EQ(b->publish(ev("a.b", "1")), 2);
  EXPECT_EQ(log.joined(), "self next:1");
  EXPECT_EQ(b->publish(ev("a.b", "2")), 2);
}
