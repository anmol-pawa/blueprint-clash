#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "bp_test.h"

using logx::Level;

namespace {
// Every sink writes "<name>|<line>" into one shared journal, so a test can see which sink got what and in what order.
class RecordingSink : public logx::Sink {
 public:
  RecordingSink(std::vector<std::string>* journal, std::string name) : journal_(journal), name_(std::move(name)) {}
  void write(const std::string& line) override { journal_->push_back(name_ + "|" + line); }

 private:
  std::vector<std::string>* journal_;
  std::string name_;
};

std::unique_ptr<logx::Sink> sinkNamed(std::vector<std::string>& journal, const std::string& name) {
  return std::make_unique<RecordingSink>(&journal, name);
}

using Journal = std::vector<std::string>;
}  // namespace

TEST(Format, ALineHasLevelCategoryAndMessage) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->log(Level::Info, "net", "connected");
  ASSERT_EQ(j.size(), 1u);
  EXPECT_EQ(j[0], "a|[INFO] net: connected");
}

TEST(Format, EveryLevelHasItsOwnName) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->log(Level::Debug, "x", "m");
  log->log(Level::Info, "x", "m");
  log->log(Level::Warn, "x", "m");
  log->log(Level::Error, "x", "m");
  ASSERT_EQ(j.size(), 4u);
  EXPECT_EQ(j[0], "a|[DEBUG] x: m");
  EXPECT_EQ(j[1], "a|[INFO] x: m");
  EXPECT_EQ(j[2], "a|[WARN] x: m");
  EXPECT_EQ(j[3], "a|[ERROR] x: m");
}

TEST(Format, AnEmptyCategoryLeavesOutTheColon) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->log(Level::Warn, "", "disk almost full");
  ASSERT_EQ(j.size(), 1u);
  EXPECT_EQ(j[0], "a|[WARN] disk almost full");
}

TEST(Format, TheMessageIsPassedThroughUntouched) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->log(Level::Info, "c", "  spaces: and [brackets] %s \"quotes\"  ");
  ASSERT_EQ(j.size(), 1u);
  EXPECT_EQ(j[0], "a|[INFO] c:   spaces: and [brackets] %s \"quotes\"  ");
}

TEST(Fanout, EverySinkGetsTheLine) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "console"), Level::Debug);
  log->addSink(sinkNamed(j, "file"), Level::Debug);
  log->log(Level::Info, "app", "started");
  ASSERT_EQ(j.size(), 2u);
  EXPECT_EQ(j[0], "console|[INFO] app: started");
  EXPECT_EQ(j[1], "file|[INFO] app: started");
}

TEST(Fanout, SinksAreWrittenInTheOrderTheyWereAdded) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "first"), Level::Debug);
  log->addSink(sinkNamed(j, "second"), Level::Debug);
  log->addSink(sinkNamed(j, "third"), Level::Debug);
  log->log(Level::Info, "", "a");
  log->log(Level::Info, "", "b");
  ASSERT_EQ(j.size(), 6u);
  EXPECT_EQ(j[0], "first|[INFO] a");
  EXPECT_EQ(j[1], "second|[INFO] a");
  EXPECT_EQ(j[2], "third|[INFO] a");
  EXPECT_EQ(j[3], "first|[INFO] b");
  EXPECT_EQ(j[5], "third|[INFO] b");
}

TEST(Fanout, ASinkAddedLaterMissesEarlierLines) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "early"), Level::Debug);
  log->log(Level::Info, "", "one");
  log->addSink(sinkNamed(j, "late"), Level::Debug);
  log->log(Level::Info, "", "two");
  ASSERT_EQ(j.size(), 3u);
  EXPECT_EQ(j[0], "early|[INFO] one");
  EXPECT_EQ(j[1], "early|[INFO] two");
  EXPECT_EQ(j[2], "late|[INFO] two");
}

TEST(Fanout, ALoggerWithNoSinksIsHarmless) {
  auto log = logx::makeLogger();
  log->log(Level::Error, "x", "nobody is listening");
  EXPECT_EQ(log->sinkCount(), 0);
}

TEST(SinkLevel, ASinkOnlyGetsLinesAtOrAboveItsMinimum) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "warn"), Level::Warn);
  log->log(Level::Debug, "", "d");
  log->log(Level::Info, "", "i");
  log->log(Level::Warn, "", "w");
  log->log(Level::Error, "", "e");
  ASSERT_EQ(j.size(), 2u);
  EXPECT_EQ(j[0], "warn|[WARN] w");
  EXPECT_EQ(j[1], "warn|[ERROR] e");
}

TEST(SinkLevel, EachSinkFiltersOnItsOwn) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "console"), Level::Info);
  log->addSink(sinkNamed(j, "alerts"), Level::Error);
  log->addSink(sinkNamed(j, "trace"), Level::Debug);
  log->log(Level::Info, "", "hello");
  log->log(Level::Error, "", "boom");
  ASSERT_EQ(j.size(), 5u);
  EXPECT_EQ(j[0], "console|[INFO] hello");
  EXPECT_EQ(j[1], "trace|[INFO] hello");
  EXPECT_EQ(j[2], "console|[ERROR] boom");
  EXPECT_EQ(j[3], "alerts|[ERROR] boom");
  EXPECT_EQ(j[4], "trace|[ERROR] boom");
}

TEST(SinkLevel, ASinkMinimumOfErrorTakesOnlyErrors) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "e"), Level::Error);
  log->log(Level::Warn, "", "w");
  EXPECT_TRUE(j.empty());
  log->log(Level::Error, "", "e");
  EXPECT_EQ(j.size(), 1u);
}

TEST(Global, TheDefaultLevelDropsNothing) {
  Journal j;
  auto log = logx::makeLogger();
  EXPECT_TRUE(log->level() == Level::Debug);
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->log(Level::Debug, "", "d");
  EXPECT_EQ(j.size(), 1u);
}

TEST(Global, TheLoggerLevelDropsLinesForEverySink) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->addSink(sinkNamed(j, "b"), Level::Debug);
  log->setLevel(Level::Warn);
  EXPECT_TRUE(log->level() == Level::Warn);
  log->log(Level::Info, "", "dropped");
  EXPECT_TRUE(j.empty());
  log->log(Level::Warn, "", "kept");
  EXPECT_EQ(j.size(), 2u);
}

TEST(Global, TheStricterOfLoggerAndSinkWins) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "lenient"), Level::Debug);
  log->addSink(sinkNamed(j, "strict"), Level::Error);
  log->setLevel(Level::Info);
  log->log(Level::Debug, "", "no one");
  log->log(Level::Info, "", "lenient only");
  log->log(Level::Error, "", "both");
  ASSERT_EQ(j.size(), 3u);
  EXPECT_EQ(j[0], "lenient|[INFO] lenient only");
  EXPECT_EQ(j[1], "lenient|[ERROR] both");
  EXPECT_EQ(j[2], "strict|[ERROR] both");
}

TEST(Global, TheLevelCanBeChangedBackAndForth) {
  Journal j;
  auto log = logx::makeLogger();
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->setLevel(Level::Error);
  log->log(Level::Info, "", "off");
  log->setLevel(Level::Debug);
  log->log(Level::Info, "", "on");
  ASSERT_EQ(j.size(), 1u);
  EXPECT_EQ(j[0], "a|[INFO] on");
}

TEST(Setup, ANullSinkIsRefused) {
  auto log = logx::makeLogger();
  EXPECT_FALSE(log->addSink(nullptr, Level::Debug));
  EXPECT_EQ(log->sinkCount(), 0);
}

TEST(Setup, RefusingANullSinkLeavesTheOthersWorking) {
  Journal j;
  auto log = logx::makeLogger();
  EXPECT_TRUE(log->addSink(sinkNamed(j, "a"), Level::Debug));
  EXPECT_FALSE(log->addSink(nullptr, Level::Debug));
  EXPECT_EQ(log->sinkCount(), 1);
  log->log(Level::Info, "", "still fine");
  EXPECT_EQ(j.size(), 1u);
}

TEST(Setup, TheSinkCountGrowsWithEachSink) {
  Journal j;
  auto log = logx::makeLogger();
  EXPECT_EQ(log->sinkCount(), 0);
  log->addSink(sinkNamed(j, "a"), Level::Debug);
  log->addSink(sinkNamed(j, "b"), Level::Warn);
  EXPECT_EQ(log->sinkCount(), 2);
}

TEST(Setup, TwoLoggersDoNotShareState) {
  Journal j;
  auto one = logx::makeLogger();
  auto two = logx::makeLogger();
  one->addSink(sinkNamed(j, "one"), Level::Debug);
  one->setLevel(Level::Error);
  EXPECT_EQ(two->sinkCount(), 0);
  EXPECT_TRUE(two->level() == Level::Debug);
}
