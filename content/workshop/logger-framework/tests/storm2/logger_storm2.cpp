#include <cstddef>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
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


namespace {
struct Lines {
  std::vector<std::string> lines;
};

// A dedup sink in front of a tape; the Time script gives each record its time.
std::unique_ptr<logx::Logger> dedupLogger(Time& t, Tape& tape, long long window, Level threshold = Level::Debug) {
  auto log = loggerOf(t);
  log->setLevel(Level::Debug);
  logx::addDedupSink(*log, sinkOf(tape), threshold, window);
  return log;
}
}  // namespace

TEST(Dedup, TheFirstRecordPassesAndRepeatsAreHeldBack) {
  Time t;
  t.values = {0, 1, 2};
  Tape tape;
  auto log = dedupLogger(t, tape, 10);
  log->info("retrying");
  log->info("retrying");
  log->info("retrying");
  ASSERT_EQ(tape.records.size(), 1u);
  EXPECT_EQ(tape.records[0].message, "retrying");
  EXPECT_EQ(tape.records[0].time, 0);
}

TEST(Dedup, ADifferentRecordEndsTheRunWithASummary) {
  Time t;
  t.values = {0, 1, 3, 4};
  Tape tape;
  auto log = dedupLogger(t, tape, 10);
  log->warn("slow");
  log->warn("slow");
  log->warn("slow");
  log->warn("recovered");
  ASSERT_EQ(tape.records.size(), 3u);
  EXPECT_EQ(tape.records[1].message, "slow (x2)");
  EXPECT_TRUE(tape.records[1].level == Level::Warn);
  EXPECT_EQ(tape.records[1].time, 3);  // the time of the last repeat
  EXPECT_EQ(tape.records[2].message, "recovered");
  EXPECT_EQ(tape.records[2].time, 4);
}

TEST(Dedup, NoSummaryWhenNothingWasHeldBack) {
  Time t;
  t.values = {0, 1};
  Tape tape;
  auto log = dedupLogger(t, tape, 10);
  log->info("a");
  log->info("b");
  EXPECT_EQ(tape.records.size(), 2u);
}

TEST(Dedup, AnotherLevelIsNotARepeat) {
  Time t;
  t.values = {0, 1, 2};
  Tape tape;
  auto log = dedupLogger(t, tape, 10);
  log->info("same words");
  log->warn("same words");
  log->info("same words");
  EXPECT_EQ(tape.records.size(), 3u);
}

TEST(Dedup, TheWindowIsInclusive) {
  Time t;
  t.values = {100, 110, 111};
  Tape tape;
  auto log = dedupLogger(t, tape, 10);
  log->info("x");
  log->info("x");  // 110 - 100 == 10: still a repeat
  log->info("x");  // 111 - 100 == 11: the run is over, this starts a new one
  ASSERT_EQ(tape.records.size(), 3u);
  EXPECT_EQ(tape.records[1].message, "x (x1)");
  EXPECT_EQ(tape.records[1].time, 110);
  EXPECT_EQ(tape.records[2].message, "x");
  EXPECT_EQ(tape.records[2].time, 111);
}

TEST(Dedup, TheWindowIsMeasuredFromTheFirstOfTheRun) {
  Time t;
  t.values = {0, 6, 12};
  Tape tape;
  auto log = dedupLogger(t, tape, 10);
  log->info("x");
  log->info("x");  // 6 after the start
  log->info("x");  // 12 after the start, only 6 after the last repeat: the window does not slide
  ASSERT_EQ(tape.records.size(), 3u);
  EXPECT_EQ(tape.records[1].message, "x (x1)");
  EXPECT_EQ(tape.records[2].message, "x");
}

TEST(Dedup, AWindowOfZeroOnlyCollapsesRecordsAtTheSameTime) {
  Time t;
  t.values = {5, 5, 6};
  Tape tape;
  auto log = dedupLogger(t, tape, 0);
  log->info("x");
  log->info("x");
  log->info("x");
  ASSERT_EQ(tape.records.size(), 3u);
  EXPECT_EQ(tape.records[1].message, "x (x1)");
  EXPECT_EQ(tape.records[2].time, 6);
}

TEST(Dedup, FlushEmitsTheSummaryAndEndsTheRun) {
  Time t;
  t.values = {0, 1, 2, 3};
  Tape tape;
  auto log = dedupLogger(t, tape, 100);
  log->info("x");
  log->info("x");
  log->info("x");
  log->flush();
  ASSERT_EQ(tape.records.size(), 2u);
  EXPECT_EQ(tape.records[1].message, "x (x2)");
  EXPECT_EQ(tape.records[1].time, 2);
  log->info("x");  // a new run: delivered, not held back
  ASSERT_EQ(tape.records.size(), 3u);
  EXPECT_EQ(tape.records[2].message, "x");
  EXPECT_EQ(tape.records[2].time, 3);
}

TEST(Dedup, FlushWithNothingHeldEmitsNothingAndReachesTheWrappedSink) {
  Time t;
  Tape tape;
  auto log = dedupLogger(t, tape, 100);
  log->info("a");
  log->flush();
  EXPECT_EQ(tape.records.size(), 1u);
  EXPECT_EQ(tape.flushes, 1);
}

TEST(Dedup, SummariesComeBeforeTheFlushOfTheWrappedSink) {
  Time t;
  t.values = {0, 1};
  Tape tape;
  auto log = dedupLogger(t, tape, 100);
  log->info("x");
  log->info("x");
  log->flush();
  ASSERT_EQ(tape.order.size(), 3u);
  EXPECT_EQ(tape.records[1].message, "x (x1)");
  EXPECT_EQ(tape.order[2], "flush:");
}

TEST(Dedup, RecordsBelowTheThresholdDoNotBreakARun) {
  Time t;
  t.values = {0, 1, 2, 3};
  Tape tape;
  auto log = dedupLogger(t, tape, 100, Level::Warn);
  log->warn("x");
  log->info("noise the sink never sees");
  log->warn("x");
  log->flush();
  ASSERT_EQ(tape.records.size(), 2u);
  EXPECT_EQ(tape.records[0].message, "x");
  EXPECT_EQ(tape.records[1].message, "x (x1)");
  EXPECT_EQ(tape.records[1].time, 2);
}

TEST(Dedup, EachSinkKeepsItsOwnRun) {
  Time t;
  t.values = {0, 1, 2};
  auto log = loggerOf(t);
  Tape a, b;
  logx::addDedupSink(*log, sinkOf(a), Level::Debug, 100);
  logx::addDedupSink(*log, sinkOf(b), Level::Info, 100);
  log->info("x");
  log->info("x");
  log->info("y");
  ASSERT_EQ(a.records.size(), 3u);
  ASSERT_EQ(b.records.size(), 3u);
  EXPECT_EQ(a.records[1].message, "x (x1)");
  EXPECT_EQ(b.records[1].message, "x (x1)");
}

TEST(Dedup, OtherSinksStillSeeEveryRecord) {
  Time t;
  t.values = {0, 1, 2};
  auto log = loggerOf(t);
  Tape plain, deduped;
  log->addSink(sinkOf(plain), Level::Debug);
  logx::addDedupSink(*log, sinkOf(deduped), Level::Debug, 100);
  log->info("x");
  log->info("x");
  log->info("x");
  EXPECT_EQ(plain.records.size(), 3u);
  EXPECT_EQ(deduped.records.size(), 1u);
  EXPECT_EQ(t.reads, 3u);
}

TEST(Dedup, ABadWindowOrSinkIsRefused) {
  Time t;
  auto log = loggerOf(t);
  Tape tape;
  EXPECT_EQ(logx::addDedupSink(*log, sinkOf(tape), Level::Debug, -1), -1);
  EXPECT_EQ(tape.destroyed, 1);
  EXPECT_EQ(logx::addDedupSink(*log, nullptr, Level::Debug, 5), -1);
  EXPECT_EQ(log->sinkCount(), 0);
  EXPECT_EQ(logx::addDedupSink(*log, sinkOf(tape), Level::Debug, 0), 1);
}

TEST(Dedup, ItComposesWithAFormattedSink) {
  Time t;
  t.values = {0, 1, 2};
  auto log = loggerOf(t);
  Lines out;
  // The wrapped sink can be any Sink, including one made by the formatting storm: build it by hand here.
  struct ToLines : logx::Sink {
    explicit ToLines(Lines* l) : lines(l) {}
    void write(const Record& r) override { lines->lines.push_back(std::string(logx::levelName(r.level)) + ":" + r.message); }
    Lines* lines;
  };
  logx::addDedupSink(*log, std::make_unique<ToLines>(&out), Level::Debug, 100);
  log->warn("again");
  log->warn("again");
  log->flush();
  ASSERT_EQ(out.lines.size(), 2u);
  EXPECT_EQ(out.lines[0], "WARN:again");
  EXPECT_EQ(out.lines[1], "WARN:again (x1)");
}
