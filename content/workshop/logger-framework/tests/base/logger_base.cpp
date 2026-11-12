#include <cstddef>
#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "bp_test.h"

using logx::Level;
using logx::Record;

namespace {
// What the sinks saw, shared with the test because the logger owns the sinks.
struct Tape {
  std::vector<Record> records;
  std::vector<std::string> order;  // sink tags in the order they were called
  int flushes = 0;
  int destroyed = 0;
};

class TapeSink : public logx::Sink {
 public:
  TapeSink(Tape* tape, std::string tag = "") : tape_(tape), tag_(std::move(tag)) {}
  ~TapeSink() override { ++tape_->destroyed; }
  void write(const Record& record) override {
    tape_->records.push_back(record);
    tape_->order.push_back(tag_);
  }
  void flush() override {
    ++tape_->flushes;
    tape_->order.push_back("flush:" + tag_);
  }

 private:
  Tape* tape_;
  std::string tag_;
};

// Hands out the scripted times in order, then counts on from the last one.
struct Time {
  std::vector<long long> values{10};
  std::size_t reads = 0;
};

class ScriptedClock : public logx::Clock {
 public:
  explicit ScriptedClock(Time* time) : time_(time) {}
  long long now() override {
    const std::size_t n = time_->values.size();
    const long long v = time_->reads < n ? time_->values[time_->reads] : time_->values.back() + static_cast<long long>(time_->reads - n + 1);
    ++time_->reads;
    return v;
  }

 private:
  Time* time_;
};

std::unique_ptr<logx::Logger> loggerOf(Time& t) { return logx::makeLogger(std::make_unique<ScriptedClock>(&t)); }
std::unique_ptr<logx::Sink> sinkOf(Tape& tape, const std::string& tag = "") { return std::make_unique<TapeSink>(&tape, tag); }
}  // namespace

TEST(Levels, TheDefaultLevelIsInfo) {
  Time t;
  auto log = loggerOf(t);
  ASSERT_TRUE(log != nullptr);
  EXPECT_TRUE(log->level() == Level::Info);
  log->debug("quiet");
  EXPECT_EQ(log->acceptedCount(), 0);
  log->info("loud enough");
  EXPECT_EQ(log->acceptedCount(), 1);
}

TEST(Levels, ACallBelowTheLevelIsDropped) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  log->setLevel(Level::Warn);
  EXPECT_TRUE(log->level() == Level::Warn);
  log->debug("a");
  log->info("b");
  log->warn("c");
  log->error("d");
  ASSERT_EQ(tape.records.size(), 2u);
  EXPECT_EQ(tape.records[0].message, "c");
  EXPECT_EQ(tape.records[1].message, "d");
  EXPECT_EQ(log->acceptedCount(), 2);
}

TEST(Levels, DebugLetsEverythingIn) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  log->setLevel(Level::Debug);
  log->debug("a");
  log->info("b");
  log->warn("c");
  log->error("d");
  EXPECT_EQ(tape.records.size(), 4u);
}

TEST(Levels, DroppedRecordsAreNotStamped) {
  Time t;
  auto log = loggerOf(t);
  log->debug("never read the clock for me");
  log->debug("nor for me");
  EXPECT_EQ(t.reads, 0u);
  log->info("this one is accepted");
  EXPECT_EQ(t.reads, 1u);
}

TEST(Levels, TheLoggerLevelGatesEverySink) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  log->debug("sink would take it, logger does not");
  EXPECT_EQ(tape.records.size(), 0u);
}

TEST(Levels, TheHelpersLogAtTheirOwnLevel) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  log->setLevel(Level::Debug);
  log->debug("d");
  log->info("i");
  log->warn("w");
  log->error("e");
  ASSERT_EQ(tape.records.size(), 4u);
  EXPECT_TRUE(tape.records[0].level == Level::Debug);
  EXPECT_TRUE(tape.records[1].level == Level::Info);
  EXPECT_TRUE(tape.records[2].level == Level::Warn);
  EXPECT_TRUE(tape.records[3].level == Level::Error);
}

TEST(Sinks, SinksAreCalledInTheOrderTheyWereAdded) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape, "A"), Level::Debug);
  log->addSink(sinkOf(tape, "B"), Level::Debug);
  log->addSink(sinkOf(tape, "C"), Level::Debug);
  log->info("x");
  ASSERT_EQ(tape.order.size(), 3u);
  EXPECT_EQ(tape.order[0], "A");
  EXPECT_EQ(tape.order[1], "B");
  EXPECT_EQ(tape.order[2], "C");
}

TEST(Sinks, AThresholdIsInclusive) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Warn);
  log->info("below");
  log->warn("at");
  log->error("above");
  ASSERT_EQ(tape.records.size(), 2u);
  EXPECT_EQ(tape.records[0].message, "at");
  EXPECT_EQ(tape.records[1].message, "above");
}

TEST(Sinks, EachSinkChoosesItsOwnThreshold) {
  Time t;
  auto log = loggerOf(t);
  log->setLevel(Level::Debug);
  Tape all, errors;
  log->addSink(sinkOf(all), Level::Debug);
  log->addSink(sinkOf(errors), Level::Error);
  log->debug("a");
  log->warn("b");
  log->error("c");
  EXPECT_EQ(all.records.size(), 3u);
  ASSERT_EQ(errors.records.size(), 1u);
  EXPECT_EQ(errors.records[0].message, "c");
}

TEST(Sinks, NoSinksIsFine) {
  Time t;
  auto log = loggerOf(t);
  log->error("into the void");
  EXPECT_EQ(log->acceptedCount(), 1);
  EXPECT_EQ(log->sinkCount(), 0);
  EXPECT_EQ(t.reads, 1u);
}

TEST(Sinks, ARecordCarriesLevelMessageAndTime) {
  Time t;
  t.values = {42};
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  log->warn("disk almost full");
  ASSERT_EQ(tape.records.size(), 1u);
  EXPECT_TRUE(tape.records[0].level == Level::Warn);
  EXPECT_EQ(tape.records[0].message, "disk almost full");
  EXPECT_EQ(tape.records[0].time, 42);
}

TEST(Stamp, OneClockReadPerAcceptedRecord) {
  Time t;
  auto log = loggerOf(t);
  Tape a, b, c;
  log->addSink(sinkOf(a), Level::Debug);
  log->addSink(sinkOf(b), Level::Debug);
  log->addSink(sinkOf(c), Level::Debug);
  log->info("one");
  log->info("two");
  EXPECT_EQ(t.reads, 2u);
}

TEST(Stamp, AllSinksSeeTheSameTime) {
  Time t;
  t.values = {7, 8, 9, 10};
  auto log = loggerOf(t);
  Tape a, b;
  log->addSink(sinkOf(a), Level::Debug);
  log->addSink(sinkOf(b), Level::Debug);
  log->info("x");
  ASSERT_EQ(a.records.size(), 1u);
  ASSERT_EQ(b.records.size(), 1u);
  EXPECT_EQ(a.records[0].time, 7);
  EXPECT_EQ(b.records[0].time, 7);
}

TEST(Stamp, TimesFollowTheClockInOrder) {
  Time t;
  t.values = {5, 9, 20};
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  log->info("a");
  log->info("b");
  log->info("c");
  ASSERT_EQ(tape.records.size(), 3u);
  EXPECT_EQ(tape.records[0].time, 5);
  EXPECT_EQ(tape.records[1].time, 9);
  EXPECT_EQ(tape.records[2].time, 20);
}

TEST(Stamp, TheClockIsReadEvenWhenNoSinkWantsTheRecord) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Error);
  log->info("accepted by the logger, wanted by nobody");
  EXPECT_EQ(t.reads, 1u);
  EXPECT_EQ(tape.records.size(), 0u);
  EXPECT_EQ(log->acceptedCount(), 1);
}

TEST(Manage, IdsCountUpFromOne) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  EXPECT_EQ(log->addSink(sinkOf(tape), Level::Debug), 1);
  EXPECT_EQ(log->addSink(sinkOf(tape), Level::Debug), 2);
  EXPECT_EQ(log->addSink(sinkOf(tape), Level::Debug), 3);
  EXPECT_EQ(log->sinkCount(), 3);
}

TEST(Manage, ARemovedSinkReceivesNothingMore) {
  Time t;
  auto log = loggerOf(t);
  Tape first, second;
  const int a = log->addSink(sinkOf(first), Level::Debug);
  log->addSink(sinkOf(second), Level::Debug);
  log->info("one");
  EXPECT_TRUE(log->removeSink(a));
  log->info("two");
  EXPECT_EQ(first.records.size(), 1u);
  EXPECT_EQ(second.records.size(), 2u);
  EXPECT_EQ(log->sinkCount(), 1);
}

TEST(Manage, IdsAreNeverReused) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape), Level::Debug);
  const int second = log->addSink(sinkOf(tape), Level::Debug);
  EXPECT_TRUE(log->removeSink(second));
  EXPECT_EQ(log->addSink(sinkOf(tape), Level::Debug), 3);
  EXPECT_FALSE(log->removeSink(second));
}

TEST(Manage, RemovingAnUnknownIdFails) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  const int id = log->addSink(sinkOf(tape), Level::Debug);
  EXPECT_FALSE(log->removeSink(0));
  EXPECT_FALSE(log->removeSink(99));
  EXPECT_TRUE(log->removeSink(id));
  EXPECT_FALSE(log->removeSink(id));
  EXPECT_EQ(log->sinkCount(), 0);
}

TEST(Manage, ANullSinkIsRefused) {
  Time t;
  auto log = loggerOf(t);
  EXPECT_EQ(log->addSink(nullptr, Level::Debug), -1);
  EXPECT_EQ(log->sinkCount(), 0);
  Tape tape;
  EXPECT_EQ(log->addSink(sinkOf(tape), Level::Debug), 1);
}

TEST(Manage, ANullClockGivesNoLogger) {
  auto log = logx::makeLogger(nullptr);
  EXPECT_TRUE(log == nullptr);
}

TEST(Manage, TheLoggerOwnsItsSinks) {
  Time t;
  Tape tape;
  {
    auto log = loggerOf(t);
    const int id = log->addSink(sinkOf(tape, "a"), Level::Debug);
    log->addSink(sinkOf(tape, "b"), Level::Debug);
    EXPECT_TRUE(log->removeSink(id));
    EXPECT_EQ(tape.destroyed, 1);
  }
  EXPECT_EQ(tape.destroyed, 2);
}

TEST(Flush, FlushReachesEverySinkInOrder) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  log->addSink(sinkOf(tape, "A"), Level::Error);
  log->addSink(sinkOf(tape, "B"), Level::Debug);
  log->flush();
  EXPECT_EQ(tape.flushes, 2);
  ASSERT_EQ(tape.order.size(), 2u);
  EXPECT_EQ(tape.order[0], "flush:A");
  EXPECT_EQ(tape.order[1], "flush:B");
}

TEST(Names, EveryLevelHasAName) {
  EXPECT_EQ(std::string(logx::levelName(Level::Debug)), "DEBUG");
  EXPECT_EQ(std::string(logx::levelName(Level::Info)), "INFO");
  EXPECT_EQ(std::string(logx::levelName(Level::Warn)), "WARN");
  EXPECT_EQ(std::string(logx::levelName(Level::Error)), "ERROR");
}
