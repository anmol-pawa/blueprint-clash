#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
// Records what happened, in order, as "name:payload" lines.
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
}  // namespace

TEST(Subscribe, IdsStartAtOneAndCountUp) {
  auto b = bus::makeBus();
  Log log;
  EXPECT_EQ(b->subscribe("a", log.tag("1")), 1);
  EXPECT_EQ(b->subscribe("b", log.tag("2")), 2);
  EXPECT_EQ(b->subscribe("a", log.tag("3")), 3);
  EXPECT_EQ(b->subscriptionCount(), 3);
}

TEST(Subscribe, AnEmptyTopicIsRefused) {
  auto b = bus::makeBus();
  Log log;
  EXPECT_EQ(b->subscribe("", log.tag("x")), bus::kRefused);
  EXPECT_EQ(b->subscriptionCount(), 0);
  EXPECT_EQ(b->publish(ev("")), 0);
}

TEST(Subscribe, AnEmptyHandlerIsRefusedAndUsesNoId) {
  auto b = bus::makeBus();
  Log log;
  EXPECT_EQ(b->subscribe("a", nullptr), bus::kRefused);
  EXPECT_EQ(b->subscriptionCount(), 0);
  EXPECT_EQ(b->subscribe("a", log.tag("ok")), 1);
}

TEST(Subscribe, TheSameHandlerSubscribedTwiceRunsTwice) {
  auto b = bus::makeBus();
  Log log;
  auto handler = log.tag("h");
  const int first = b->subscribe("a", handler);
  const int second = b->subscribe("a", handler);
  EXPECT_NE(first, second);
  EXPECT_EQ(b->publish(ev("a", "1")), 2);
  EXPECT_EQ(log.joined(), "h:1 h:1");
  EXPECT_TRUE(b->unsubscribe(first));
  EXPECT_EQ(b->publish(ev("a", "2")), 1);
}

TEST(Ids, AnIdIsNeverReused) {
  auto b = bus::makeBus();
  Log log;
  b->subscribe("a", log.tag("1"));
  const int second = b->subscribe("a", log.tag("2"));
  EXPECT_TRUE(b->unsubscribe(second));
  EXPECT_EQ(b->subscribe("a", log.tag("3")), 3);
  EXPECT_FALSE(b->unsubscribe(second));
}

TEST(Unsubscribe, UnknownOrRepeatedIdsReturnFalse) {
  auto b = bus::makeBus();
  Log log;
  const int id = b->subscribe("a", log.tag("1"));
  EXPECT_FALSE(b->unsubscribe(99));
  EXPECT_FALSE(b->unsubscribe(0));
  EXPECT_FALSE(b->unsubscribe(-1));
  EXPECT_TRUE(b->unsubscribe(id));
  EXPECT_FALSE(b->unsubscribe(id));
  EXPECT_EQ(b->subscriptionCount(), 0);
}

TEST(Unsubscribe, StopsDeliveryAndLeavesOthersAlone) {
  auto b = bus::makeBus();
  Log log;
  const int first = b->subscribe("a", log.tag("1"));
  b->subscribe("a", log.tag("2"));
  b->unsubscribe(first);
  EXPECT_EQ(b->publish(ev("a", "p")), 1);
  EXPECT_EQ(log.joined(), "2:p");
}

TEST(Matching, OnlyTheExactTopicIsDelivered) {
  auto b = bus::makeBus();
  Log log;
  b->subscribe("orders", log.tag("o"));
  EXPECT_EQ(b->publish(ev("orders")), 1);
  EXPECT_EQ(b->publish(ev("Orders")), 0);
  EXPECT_EQ(b->publish(ev("order")), 0);
  EXPECT_EQ(b->publish(ev("payments")), 0);
}

TEST(Matching, ATopicIsNotAPrefixMatch) {
  auto b = bus::makeBus();
  Log log;
  b->subscribe("orders", log.tag("o"));
  b->subscribe("orders.created", log.tag("c"));
  EXPECT_EQ(b->publish(ev("orders.created.eu")), 0);
  EXPECT_EQ(b->publish(ev("orders.created")), 1);
  EXPECT_EQ(log.joined(), "c:x");
}

TEST(Publish, NoSubscribersIsNotAnError) {
  auto b = bus::makeBus();
  EXPECT_EQ(b->publish(ev("nobody-listens")), 0);
}

TEST(Publish, HandlersReceiveTheEventUnchanged) {
  auto b = bus::makeBus();
  std::string topic;
  std::string payload;
  b->subscribe("a.b", [&](const bus::Event& e) {
    topic = e.topic;
    payload = e.payload;
  });
  b->publish(ev("a.b", "hello world"));
  EXPECT_EQ(topic, "a.b");
  EXPECT_EQ(payload, "hello world");
}

TEST(Order, HandlersRunInSubscriptionOrder) {
  auto b = bus::makeBus();
  Log log;
  b->subscribe("a", log.tag("first"));
  b->subscribe("a", log.tag("second"));
  b->subscribe("a", log.tag("third"));
  b->publish(ev("a", "p"));
  EXPECT_EQ(log.joined(), "first:p second:p third:p");
}

TEST(Order, SubscribersOfOtherTopicsAreNotCalled) {
  auto b = bus::makeBus();
  Log log;
  b->subscribe("a", log.tag("a1"));
  b->subscribe("b", log.tag("b1"));
  b->subscribe("a", log.tag("a2"));
  b->publish(ev("a", "p"));
  EXPECT_EQ(log.joined(), "a1:p a2:p");
}

TEST(Publish, ReturnsHowManyHandlersActuallyRan) {
  auto b = bus::makeBus();
  Log log;
  int doomed = 0;
  b->subscribe("a", [&](const bus::Event&) { b->unsubscribe(doomed); });
  doomed = b->subscribe("a", log.tag("doomed"));
  b->subscribe("a", log.tag("third"));
  EXPECT_EQ(b->publish(ev("a", "p")), 2);
  EXPECT_EQ(log.joined(), "third:p");
}

TEST(Reentrancy, AHandlerCanUnsubscribeALaterSubscriberBeforeItsTurn) {
  auto b = bus::makeBus();
  Log log;
  int later = 0;
  b->subscribe("a", [&](const bus::Event&) {
    log.lines.push_back("remover");
    b->unsubscribe(later);
  });
  later = b->subscribe("a", log.tag("later"));
  b->publish(ev("a"));
  EXPECT_EQ(log.joined(), "remover");
  EXPECT_EQ(b->subscriptionCount(), 1);
}

TEST(Reentrancy, AHandlerThatUnsubscribesItselfDoesNotSkipTheNextSubscriber) {
  auto b = bus::makeBus();
  Log log;
  int self = 0;
  self = b->subscribe("a", [&](const bus::Event&) {
    log.lines.push_back("self");
    b->unsubscribe(self);
  });
  b->subscribe("a", log.tag("next"));
  b->subscribe("a", log.tag("last"));
  EXPECT_EQ(b->publish(ev("a", "p")), 3);
  EXPECT_EQ(log.joined(), "self next:p last:p");
  EXPECT_EQ(b->publish(ev("a", "q")), 2);
}

TEST(Reentrancy, AHandlerMayUnsubscribeItselfAndStillFinish) {
  auto b = bus::makeBus();
  std::vector<std::string> seen;
  int self = 0;
  const std::string captured = "still-here";  // lives inside the handler object itself
  self = b->subscribe("a", [&, captured](const bus::Event& e) {
    b->unsubscribe(self);
    seen.push_back(captured + "/" + e.payload);
  });
  b->publish(ev("a", "p"));
  EXPECT_EQ(seen.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(seen.empty() ? std::string() : seen[0], "still-here/p");
}

TEST(Reentrancy, ASubscriberAddedDuringPublishMissesThatEvent) {
  auto b = bus::makeBus();
  Log log;
  bool added = false;
  b->subscribe("a", [&](const bus::Event&) {
    log.lines.push_back("adder");
    if (!added) {
      added = true;
      b->subscribe("a", log.tag("late"));
    }
  });
  b->subscribe("a", log.tag("second"));
  EXPECT_EQ(b->publish(ev("a", "1")), 2);
  EXPECT_EQ(log.joined(), "adder second:1");
  EXPECT_EQ(b->publish(ev("a", "2")), 3);
  EXPECT_EQ(log.joined(), "adder second:1 adder second:2 late:2");
}

TEST(Reentrancy, ANestedPublishIsDeliveredBeforeTheOuterContinues) {
  auto b = bus::makeBus();
  Log log;
  b->subscribe("outer", [&](const bus::Event&) {
    log.lines.push_back("A:start");
    b->publish(ev("inner", "i"));
    log.lines.push_back("A:end");
  });
  b->subscribe("outer", log.tag("B"));
  b->subscribe("inner", log.tag("C"));
  EXPECT_EQ(b->publish(ev("outer", "o")), 2);
  EXPECT_EQ(log.joined(), "A:start C:i A:end B:o");
}

TEST(Count, SubscriptionCountTracksSubscribeAndUnsubscribe) {
  auto b = bus::makeBus();
  Log log;
  EXPECT_EQ(b->subscriptionCount(), 0);
  const int one = b->subscribe("a", log.tag("1"));
  b->subscribe("b", log.tag("2"));
  EXPECT_EQ(b->subscriptionCount(), 2);
  b->unsubscribe(one);
  EXPECT_EQ(b->subscriptionCount(), 1);
  b->unsubscribe(one);
  EXPECT_EQ(b->subscriptionCount(), 1);
}
