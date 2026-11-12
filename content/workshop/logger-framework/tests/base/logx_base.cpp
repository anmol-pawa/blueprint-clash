#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

using logx::Level;

namespace {
// A clock that returns 10, 11, 12, ... and counts how often it was read.
struct Ticks {
  long long next = 10;
  int reads = 0;
};

class TickingClock : public logx::Clock {
 public:
  explicit TickingClock(Ticks* ticks) : ticks_(ticks) {}
  long long now() override {
    ++ticks_->reads;
    return ticks_->next++;
  }

 private:
  Ticks* ticks_;
};

// What the sinks received. `lines` is per test sink; `order` records which sink wrote, across sinks.
struct Capture {
  std::vector<std::string> lines;
  std::vector<std::string>* order = nullptr;
  std::string name;
};

class CaptureSink : public logx::Sink {
 public:
  explicit CaptureSink(Capture* capture) : capture_(capture) {}
  void write(const std::string& line) override {
    capture_->lines.push_back(line);
    if (capture_->order != nullptr) capture_->order->push_back(capture_->name);
  }

 private:
  Capture* capture_;
};

std::unique_ptr<logx::Logger> loggerWith(Ticks& ticks, Capture& capture, Level sinkLevel = Level::Debug) {
  auto logger = logx::makeLogger(std::make_unique<TickingClock>(&ticks));
  logger->addSink(std::make_unique<CaptureSink>(&capture), sinkLevel);
  return logger;
}
}  // namespace

TEST(Format, ALineHasTimeLevelCategoryAndMessage) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Info, "db", "connected");
  ASSERT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(c.lines[0], "[10] INFO db: connected");
}

TEST(Format, EveryLevelHasItsOwnName) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Debug, "a", "x");
  logger->log(Level::Info, "a", "x");
  logger->log(Level::Warn, "a", "x");
  logger->log(Level::Error, "a", "x");
  ASSERT_EQ(c.lines.size(), 4u);
  EXPECT_EQ(c.lines[0], "[10] DEBUG a: x");
  EXPECT_EQ(c.lines[1], "[11] INFO a: x");
  EXPECT_EQ(c.lines[2], "[12] WARN a: x");
  EXPECT_EQ(c.lines[3], "[13] ERROR a: x");
}

TEST(Format, AnEmptyCategoryIsWrittenAsADash) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Warn, "", "disk almost full");
  ASSERT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(c.lines[0], "[10] WARN -: disk almost full");
}

TEST(Format, AnEmptyMessageIsStillALine) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Info, "x", "");
  ASSERT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(c.lines[0], "[10] INFO x: ");
}

TEST(Format, LineBreaksInTheMessageAreEscaped) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Info, "auth", "login failed\n[99] ERROR auth: forged");
  ASSERT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(c.lines[0], "[10] INFO auth: login failed\\n[99] ERROR auth: forged");
  EXPECT_EQ(c.lines[0].find('\n'), std::string::npos);
}

TEST(Format, CarriageReturnsAndCategoryBreaksAreEscapedToo) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Info, "a\nb", "one\r\ntwo");
  ASSERT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(c.lines[0], "[10] INFO a\\nb: one\\r\\ntwo");
}

TEST(Levels, EverythingPassesByDefault) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Debug, "a", "d");
  EXPECT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(logger->accepted(), 1);
}

TEST(Levels, RecordsBelowTheLoggerLevelAreDropped) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->setLevel(Level::Warn);
  logger->log(Level::Debug, "a", "d");
  logger->log(Level::Info, "a", "i");
  logger->log(Level::Warn, "a", "w");
  logger->log(Level::Error, "a", "e");
  ASSERT_EQ(c.lines.size(), 2u);
  EXPECT_EQ(c.lines[0], "[10] WARN a: w");
  EXPECT_EQ(c.lines[1], "[11] ERROR a: e");
  EXPECT_EQ(logger->accepted(), 2);
}

TEST(Levels, DroppedRecordsNeverReadTheClock) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->setLevel(Level::Error);
  logger->log(Level::Info, "a", "x");
  logger->log(Level::Warn, "a", "x");
  EXPECT_EQ(t.reads, 0);
  logger->log(Level::Error, "a", "x");
  EXPECT_EQ(t.reads, 1);
}

TEST(Levels, ChangingTheLevelAffectsOnlyLaterRecords) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->log(Level::Debug, "a", "before");
  logger->setLevel(Level::Info);
  logger->log(Level::Debug, "a", "after");
  logger->setLevel(Level::Debug);
  logger->log(Level::Debug, "a", "again");
  ASSERT_EQ(c.lines.size(), 2u);
  EXPECT_EQ(c.lines[0], "[10] DEBUG a: before");
  EXPECT_EQ(c.lines[1], "[11] DEBUG a: again");
}

TEST(Sinks, AnAcceptedRecordIsCountedEvenWithNoSink) {
  Ticks t;
  auto logger = logx::makeLogger(std::make_unique<TickingClock>(&t));
  ASSERT_TRUE(logger != nullptr);
  logger->log(Level::Info, "a", "x");
  logger->log(Level::Info, "a", "y");
  EXPECT_EQ(logger->accepted(), 2);
}

TEST(Sinks, EverySinkReceivesTheSameLine) {
  Ticks t;
  Capture first, second;
  auto logger = loggerWith(t, first);
  logger->addSink(std::make_unique<CaptureSink>(&second), Level::Debug);
  logger->log(Level::Info, "net", "up");
  ASSERT_EQ(first.lines.size(), 1u);
  ASSERT_EQ(second.lines.size(), 1u);
  EXPECT_EQ(first.lines[0], second.lines[0]);
}

TEST(Sinks, AllSinksShareOneTimestampPerRecord) {
  Ticks t;
  Capture first, second, third;
  auto logger = loggerWith(t, first);
  logger->addSink(std::make_unique<CaptureSink>(&second), Level::Debug);
  logger->addSink(std::make_unique<CaptureSink>(&third), Level::Debug);
  logger->log(Level::Info, "a", "x");
  logger->log(Level::Info, "a", "y");
  EXPECT_EQ(t.reads, 2);
  EXPECT_EQ(third.lines[0], "[10] INFO a: x");
  EXPECT_EQ(third.lines[1], "[11] INFO a: y");
}

TEST(Sinks, EachSinkFiltersByItsOwnLevel) {
  Ticks t;
  Capture everything, errorsOnly;
  auto logger = loggerWith(t, everything, Level::Debug);
  logger->addSink(std::make_unique<CaptureSink>(&errorsOnly), Level::Error);
  logger->log(Level::Info, "a", "i");
  logger->log(Level::Error, "a", "e");
  EXPECT_EQ(everything.lines.size(), 2u);
  ASSERT_EQ(errorsOnly.lines.size(), 1u);
  EXPECT_EQ(errorsOnly.lines[0], "[11] ERROR a: e");
}

TEST(Sinks, TheSinkLevelAppliesOnTopOfTheLoggerLevel) {
  Ticks t;
  Capture verbose;
  auto logger = loggerWith(t, verbose, Level::Debug);
  logger->setLevel(Level::Warn);
  logger->log(Level::Info, "a", "x");
  EXPECT_EQ(verbose.lines.size(), 0u);
  Capture strict;
  logger->addSink(std::make_unique<CaptureSink>(&strict), Level::Error);
  logger->log(Level::Warn, "a", "w");
  EXPECT_EQ(verbose.lines.size(), 1u);
  EXPECT_EQ(strict.lines.size(), 0u);
}

TEST(Sinks, SinksAreCalledInTheOrderTheyWereAdded) {
  Ticks t;
  std::vector<std::string> order;
  Capture a, b, c;
  a.order = b.order = c.order = &order;
  a.name = "a";
  b.name = "b";
  c.name = "c";
  auto logger = loggerWith(t, a);
  logger->addSink(std::make_unique<CaptureSink>(&b), Level::Debug);
  logger->addSink(std::make_unique<CaptureSink>(&c), Level::Debug);
  logger->log(Level::Info, "x", "y");
  ASSERT_EQ(order.size(), 3u);
  EXPECT_EQ(order[0], "a");
  EXPECT_EQ(order[1], "b");
  EXPECT_EQ(order[2], "c");
}

TEST(Sinks, ASinkAddedLaterMissesEarlierRecords) {
  Ticks t;
  Capture early, late;
  auto logger = loggerWith(t, early);
  logger->log(Level::Info, "a", "one");
  logger->addSink(std::make_unique<CaptureSink>(&late), Level::Debug);
  logger->log(Level::Info, "a", "two");
  EXPECT_EQ(early.lines.size(), 2u);
  ASSERT_EQ(late.lines.size(), 1u);
  EXPECT_EQ(late.lines[0], "[11] INFO a: two");
}

TEST(Setup, ANullSinkIsIgnored) {
  Ticks t;
  Capture c;
  auto logger = loggerWith(t, c);
  logger->addSink(nullptr, Level::Debug);
  logger->log(Level::Info, "a", "still works");
  EXPECT_EQ(c.lines.size(), 1u);
}

TEST(Setup, ANullClockIsRefused) {
  EXPECT_TRUE(logx::makeLogger(nullptr) == nullptr);
}
