#include <memory>
#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
class Recorder final : public Listener {
 public:
  explicit Recorder(std::vector<std::string>* log = nullptr, std::string id = "") : log_(log), id_(std::move(id)) {}
  void onMessage(const std::string& message) override {
    heard.push_back(message);
    if (log_) log_->push_back(id_);
  }
  std::vector<std::string> heard;

 private:
  std::vector<std::string>* log_;
  std::string id_;
};

// Unsubscribes itself the first time it hears anything.
class OneShot final : public Listener {
 public:
  explicit OneShot(Topic& topic) : topic_(topic) {}
  void onMessage(const std::string&) override {
    ++calls;
    topic_.unsubscribe(*this);
  }
  int calls = 0;

 private:
  Topic& topic_;
};

// Subscribes a newcomer while it is being notified.
class Recruiter final : public Listener {
 public:
  Recruiter(Topic& topic, std::shared_ptr<Listener> recruit) : topic_(topic), recruit_(std::move(recruit)) {}
  void onMessage(const std::string&) override { topic_.subscribe(recruit_); }

 private:
  Topic& topic_;
  std::shared_ptr<Listener> recruit_;
};

int g_alive = 0;
class Tracked final : public Listener {
 public:
  Tracked() { ++g_alive; }
  ~Tracked() override { --g_alive; }
  void onMessage(const std::string&) override { ++calls; }
  int calls = 0;
};
}  // namespace

TEST(Topic, DeliversToEverySubscriber) {
  Topic topic;
  auto a = std::make_shared<Recorder>();
  auto b = std::make_shared<Recorder>();
  topic.subscribe(a);
  topic.subscribe(b);
  EXPECT_EQ(topic.publish("hello"), static_cast<std::size_t>(2));
  EXPECT_EQ(a->heard.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(b->heard.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(b->heard[0], std::string("hello"));
}

TEST(Topic, DeliversInSubscriptionOrder) {
  Topic topic;
  std::vector<std::string> log;
  auto a = std::make_shared<Recorder>(&log, "a");
  auto b = std::make_shared<Recorder>(&log, "b");
  auto c = std::make_shared<Recorder>(&log, "c");
  topic.subscribe(a);
  topic.subscribe(b);
  topic.subscribe(c);
  topic.publish("x");
  EXPECT_TRUE(log == (std::vector<std::string>{"a", "b", "c"}));
}

TEST(Topic, PublishWithNoSubscribersIsHarmless) {
  Topic topic;
  EXPECT_EQ(topic.publish("anyone?"), static_cast<std::size_t>(0));
  EXPECT_EQ(topic.subscriberCount(), static_cast<std::size_t>(0));
}

TEST(Topic, SubscribingTwiceDeliversOnce) {
  Topic topic;
  auto a = std::make_shared<Recorder>();
  topic.subscribe(a);
  topic.subscribe(a);
  EXPECT_EQ(topic.publish("m"), static_cast<std::size_t>(1));
  EXPECT_EQ(a->heard.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(topic.subscriberCount(), static_cast<std::size_t>(1));
}

TEST(Topic, UnsubscribeStopsDelivery) {
  Topic topic;
  auto a = std::make_shared<Recorder>();
  auto b = std::make_shared<Recorder>();
  topic.subscribe(a);
  topic.subscribe(b);
  topic.unsubscribe(*a);
  topic.unsubscribe(*a);  // not subscribed any more: harmless
  EXPECT_EQ(topic.publish("m"), static_cast<std::size_t>(1));
  EXPECT_EQ(a->heard.size(), static_cast<std::size_t>(0));
  EXPECT_EQ(b->heard.size(), static_cast<std::size_t>(1));
}

TEST(Topic, DoesNotKeepListenersAlive) {
  g_alive = 0;
  Topic topic;
  {
    auto t = std::make_shared<Tracked>();
    topic.subscribe(t);
    EXPECT_EQ(g_alive, 1);
  }
  EXPECT_EQ(g_alive, 0);  // the topic must not be a co-owner
}

TEST(Topic, DeadListenersAreSkippedAndNotCounted) {
  Topic topic;
  auto keep = std::make_shared<Recorder>();
  topic.subscribe(keep);
  {
    auto gone = std::make_shared<Recorder>();
    topic.subscribe(gone);
  }
  EXPECT_EQ(topic.publish("m"), static_cast<std::size_t>(1));
  EXPECT_EQ(keep->heard.size(), static_cast<std::size_t>(1));
}

TEST(Topic, SubscriberCountIgnoresDeadListeners) {
  Topic topic;
  auto a = std::make_shared<Recorder>();
  topic.subscribe(a);
  for (int i = 0; i < 5; ++i) {
    auto temp = std::make_shared<Recorder>();
    topic.subscribe(temp);
  }
  EXPECT_EQ(topic.subscriberCount(), static_cast<std::size_t>(1));
  a.reset();
  EXPECT_EQ(topic.subscriberCount(), static_cast<std::size_t>(0));
}

TEST(Topic, ListenerMayUnsubscribeItselfDuringPublish) {
  Topic topic;
  auto first = std::make_shared<Recorder>();
  auto shy = std::make_shared<OneShot>(topic);
  auto last = std::make_shared<Recorder>();
  topic.subscribe(first);
  topic.subscribe(shy);
  topic.subscribe(last);
  EXPECT_EQ(topic.publish("one"), static_cast<std::size_t>(3));  // all three heard it
  EXPECT_EQ(topic.publish("two"), static_cast<std::size_t>(2));  // shy left
  EXPECT_EQ(shy->calls, 1);
  EXPECT_EQ(last->heard.size(), static_cast<std::size_t>(2));
  EXPECT_EQ(first->heard.size(), static_cast<std::size_t>(2));
}

TEST(Topic, ListenerAddedDuringPublishHearsTheNextMessage) {
  Topic topic;
  auto newcomer = std::make_shared<Recorder>();
  auto recruiter = std::make_shared<Recruiter>(topic, newcomer);
  topic.subscribe(recruiter);
  EXPECT_EQ(topic.publish("one"), static_cast<std::size_t>(1));
  EXPECT_EQ(newcomer->heard.size(), static_cast<std::size_t>(0));
  EXPECT_EQ(topic.publish("two"), static_cast<std::size_t>(2));
  EXPECT_EQ(newcomer->heard.size(), static_cast<std::size_t>(1));
}
