#include <cstddef>
#include <string>
#include <utility>
#include <vector>

#include "api_storm1.h"
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
  int flushes = 0;
  int destroyed = 0;
};

class LineTape : public logx::LineSink {
 public:
  explicit LineTape(Lines* out) : out_(out) {}
  ~LineTape() override { ++out_->destroyed; }
  void writeLine(const std::string& line) override { out_->lines.push_back(line); }
  void flush() override { ++out_->flushes; }

 private:
  Lines* out_;
};

std::unique_ptr<logx::LineSink> lineSinkOf(Lines& out) { return std::make_unique<LineTape>(&out); }
}  // namespace

TEST(Pattern, ALineIsBuiltFromThePattern) {
  Time t;
  t.values = {1234};
  auto log = loggerOf(t);
  Lines out;
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "[%l] %m"), 1);
  log->warn("disk almost full");
  ASSERT_EQ(out.lines.size(), 1u);
  EXPECT_EQ(out.lines[0], "[WARN] disk almost full");
}

TEST(Pattern, TheTimeIsWrittenInDecimal) {
  Time t;
  t.values = {1234, 5};
  auto log = loggerOf(t);
  Lines out;
  logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%t|%l|%m");
  log->info("a");
  log->error("b");
  ASSERT_EQ(out.lines.size(), 2u);
  EXPECT_EQ(out.lines[0], "1234|INFO|a");
  EXPECT_EQ(out.lines[1], "5|ERROR|b");
}

TEST(Pattern, DoublePercentIsOnePercent) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "100%% %m %%");
  log->info("sure");
  ASSERT_EQ(out.lines.size(), 1u);
  EXPECT_EQ(out.lines[0], "100% sure %");
}

TEST(Pattern, PlainTextAndEmptyPatternsWork) {
  Time t;
  auto log = loggerOf(t);
  Lines fixed, empty;
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(fixed), Level::Debug, "static text"), 1);
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(empty), Level::Debug, ""), 2);
  log->info("ignored");
  ASSERT_EQ(fixed.lines.size(), 1u);
  EXPECT_EQ(fixed.lines[0], "static text");
  ASSERT_EQ(empty.lines.size(), 1u);
  EXPECT_EQ(empty.lines[0], "");
}

TEST(Pattern, TheMessageIsNeverReinterpreted) {
  Time t;
  t.values = {7};
  auto log = loggerOf(t);
  Lines out;
  logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%m at %t");
  log->info("50%t %m %l %%");
  ASSERT_EQ(out.lines.size(), 1u);
  EXPECT_EQ(out.lines[0], "50%t %m %l %% at 7");
}

TEST(Pattern, AnUnknownSpecifierIsRefused) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%x"), -1);
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "ok %m then %L"), -1);
  EXPECT_EQ(log->sinkCount(), 0);
  log->info("nothing is listening");
  EXPECT_EQ(out.lines.size(), 0u);
}

TEST(Pattern, ATrailingPercentIsRefused) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "abc%"), -1);
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%"), -1);
  EXPECT_EQ(log->sinkCount(), 0);
}

TEST(Pattern, ARefusedSinkTakesNoIdAndIsDestroyed) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  EXPECT_EQ(logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%q"), -1);
  EXPECT_EQ(out.destroyed, 1);
  Tape tape;
  EXPECT_EQ(log->addSink(sinkOf(tape), Level::Debug), 1);
}

TEST(Pattern, ANullLineSinkIsRefused) {
  Time t;
  auto log = loggerOf(t);
  EXPECT_EQ(logx::addLineSink(*log, nullptr, Level::Debug, "%m"), -1);
  EXPECT_EQ(log->sinkCount(), 0);
}

TEST(Pattern, TheThresholdStillApplies) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  logx::addLineSink(*log, lineSinkOf(out), Level::Warn, "%m");
  log->info("quiet");
  log->warn("loud");
  ASSERT_EQ(out.lines.size(), 1u);
  EXPECT_EQ(out.lines[0], "loud");
}

TEST(Pattern, EachSinkHasItsOwnPatternAndLinesAndRecordsMix) {
  Time t;
  t.values = {3};
  auto log = loggerOf(t);
  Lines short_, long_;
  Tape tape;
  logx::addLineSink(*log, lineSinkOf(short_), Level::Debug, "%m");
  log->addSink(sinkOf(tape, "plain"), Level::Debug);
  logx::addLineSink(*log, lineSinkOf(long_), Level::Debug, "%t %l %m");
  log->error("boom");
  EXPECT_EQ(short_.lines[0], "boom");
  EXPECT_EQ(long_.lines[0], "3 ERROR boom");
  ASSERT_EQ(tape.records.size(), 1u);
  EXPECT_EQ(tape.records[0].message, "boom");
  EXPECT_EQ(t.reads, 1u);
}

TEST(Pattern, NoNewlineIsAdded) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%m");
  log->info("a");
  EXPECT_EQ(out.lines[0], "a");
  EXPECT_EQ(out.lines[0].size(), 1u);
}

TEST(Pattern, FlushReachesTheLineSink) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  logx::addLineSink(*log, lineSinkOf(out), Level::Error, "%m");
  log->flush();
  EXPECT_EQ(out.flushes, 1);
}

TEST(Pattern, RemovingALineSinkDestroysIt) {
  Time t;
  auto log = loggerOf(t);
  Lines out;
  const int id = logx::addLineSink(*log, lineSinkOf(out), Level::Debug, "%m");
  EXPECT_TRUE(log->removeSink(id));
  EXPECT_EQ(out.destroyed, 1);
  log->info("gone");
  EXPECT_EQ(out.lines.size(), 0u);
}
