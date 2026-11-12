#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

using logx::Level;

namespace {
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
const char* const kRepeat3 = "c|(last message repeated 3 times)";
}  // namespace

TEST(Collapse, TheFirstLineIsWrittenAndRepeatsAreHeldBack) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  for (int i = 0; i < 4; ++i) log->log(Level::Warn, "db", "slow query");
  ASSERT_EQ(j.size(), 1u);
  EXPECT_EQ(j[0], "c|[WARN] db: slow query");
}

TEST(Collapse, ADifferentLineEndsTheRunWithASummary) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  for (int i = 0; i < 4; ++i) log->log(Level::Warn, "db", "slow query");
  log->log(Level::Info, "db", "recovered");
  ASSERT_EQ(j.size(), 3u);
  EXPECT_EQ(j[0], "c|[WARN] db: slow query");
  EXPECT_EQ(j[1], kRepeat3);
  EXPECT_EQ(j[2], "c|[INFO] db: recovered");
}

TEST(Collapse, NoRepeatsMeansNoSummary) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->log(Level::Info, "", "a");
  log->log(Level::Info, "", "b");
  log->log(Level::Info, "", "a");
  ASSERT_EQ(j.size(), 3u);
  EXPECT_EQ(j[1], "c|[INFO] b");
}

TEST(Collapse, OneRepeatIsStillSummarised) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->log(Level::Info, "", "x");
  log->log(Level::Info, "", "x");
  log->log(Level::Info, "", "y");
  ASSERT_EQ(j.size(), 3u);
  EXPECT_EQ(j[1], "c|(last message repeated 1 times)");
}

TEST(Collapse, TheSameMessageAtAnotherLevelIsADifferentLine) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->log(Level::Info, "a", "m");
  log->log(Level::Warn, "a", "m");
  log->log(Level::Warn, "b", "m");
  EXPECT_EQ(j.size(), 3u);
}

TEST(Collapse, FlushWritesThePendingSummary) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  for (int i = 0; i < 4; ++i) log->log(Level::Warn, "db", "slow query");
  log->flush();
  ASSERT_EQ(j.size(), 2u);
  EXPECT_EQ(j[1], kRepeat3);
}

TEST(Collapse, FlushWithNothingPendingWritesNothing) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->flush();
  log->log(Level::Info, "", "once");
  log->flush();
  log->flush();
  EXPECT_EQ(j.size(), 1u);
}

TEST(Collapse, FlushEndsTheRunSoTheNextLineIsWrittenAgain) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->log(Level::Info, "", "tick");
  log->flush();
  log->log(Level::Info, "", "tick");
  log->log(Level::Info, "", "tick");
  log->flush();
  ASSERT_EQ(j.size(), 3u);
  EXPECT_EQ(j[0], "c|[INFO] tick");
  EXPECT_EQ(j[1], "c|[INFO] tick");
  EXPECT_EQ(j[2], "c|(last message repeated 1 times)");
}

TEST(Collapse, TheCountRestartsForEachRun) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  for (int i = 0; i < 3; ++i) log->log(Level::Info, "", "a");
  for (int i = 0; i < 2; ++i) log->log(Level::Info, "", "b");
  log->flush();
  ASSERT_EQ(j.size(), 4u);
  EXPECT_EQ(j[1], "c|(last message repeated 2 times)");
  EXPECT_EQ(j[2], "c|[INFO] b");
  EXPECT_EQ(j[3], "c|(last message repeated 1 times)");
}

TEST(Collapse, OrdinarySinksStillGetEveryLine) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addSink(sinkNamed(j, "plain"), Level::Debug);
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->log(Level::Info, "", "x");
  log->log(Level::Info, "", "x");
  log->log(Level::Info, "", "x");
  int plain = 0;
  int collapsing = 0;
  for (const auto& entry : j) {
    if (entry.rfind("plain|", 0) == 0) ++plain;
    if (entry.rfind("c|", 0) == 0) ++collapsing;
  }
  EXPECT_EQ(plain, 3);
  EXPECT_EQ(collapsing, 1);
}

TEST(Collapse, EachCollapsingSinkKeepsItsOwnRun) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "one"), Level::Debug);
  log->addCollapsingSink(sinkNamed(j, "two"), Level::Debug);
  log->log(Level::Info, "", "x");
  log->log(Level::Info, "", "x");
  log->flush();
  ASSERT_EQ(j.size(), 4u);
  EXPECT_EQ(j[0], "one|[INFO] x");
  EXPECT_EQ(j[1], "two|[INFO] x");
  EXPECT_EQ(j[2], "one|(last message repeated 1 times)");
  EXPECT_EQ(j[3], "two|(last message repeated 1 times)");
}

TEST(Collapse, LinesBelowTheSinkMinimumDoNotBreakARun) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Warn);
  log->log(Level::Warn, "", "disk full");
  log->log(Level::Debug, "", "noise");
  log->log(Level::Warn, "", "disk full");
  log->log(Level::Info, "", "more noise");
  log->log(Level::Warn, "", "disk full");
  log->flush();
  ASSERT_EQ(j.size(), 2u);
  EXPECT_EQ(j[0], "c|[WARN] disk full");
  EXPECT_EQ(j[1], "c|(last message repeated 2 times)");
}

TEST(Collapse, LinesDroppedByThresholdsDoNotBreakARun) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->setLevel(Level::Warn);
  log->log(Level::Warn, "", "x");
  log->log(Level::Info, "", "dropped by the logger");
  log->log(Level::Warn, "", "x");
  log->flush();
  ASSERT_EQ(j.size(), 2u);
  EXPECT_EQ(j[1], "c|(last message repeated 1 times)");
}

TEST(Collapse, ASummaryIsNotSubjectToTheSinkMinimum) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Error);
  log->log(Level::Error, "", "bad");
  log->log(Level::Error, "", "bad");
  log->flush();
  ASSERT_EQ(j.size(), 2u);
  EXPECT_EQ(j[1], "c|(last message repeated 1 times)");
}

TEST(Collapse, ANullCollapsingSinkIsRefused) {
  auto log = logx::makeCollapsingLogger();
  EXPECT_FALSE(log->addCollapsingSink(nullptr, Level::Debug));
  EXPECT_EQ(log->sinkCount(), 0);
  Journal j;
  EXPECT_TRUE(log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug));
  EXPECT_EQ(log->sinkCount(), 1);
}

TEST(Collapse, CategoryLevelsStillApply) {
  Journal j;
  auto log = logx::makeCollapsingLogger();
  log->addCollapsingSink(sinkNamed(j, "c"), Level::Debug);
  log->setCategoryLevel("db", Level::Error);
  log->log(Level::Info, "db", "dropped");
  log->log(Level::Info, "web", "kept");
  ASSERT_EQ(j.size(), 1u);
  EXPECT_EQ(j[0], "c|[INFO] web: kept");
}
