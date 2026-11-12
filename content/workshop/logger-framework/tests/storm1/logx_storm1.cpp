#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using logx::Level;

namespace {
class FixedClock : public logx::Clock {
 public:
  long long now() override { return 7; }
};

class CaptureSink : public logx::Sink {
 public:
  explicit CaptureSink(std::vector<std::string>* lines) : lines_(lines) {}
  void write(const std::string& line) override { lines_->push_back(line); }

 private:
  std::vector<std::string>* lines_;
};

std::unique_ptr<logx::ConfigurableLogger> loggerInto(std::vector<std::string>& lines, Level sinkLevel = Level::Debug) {
  auto logger = logx::makeConfigurableLogger(std::make_unique<FixedClock>());
  logger->addSink(std::make_unique<CaptureSink>(&lines), sinkLevel);
  return logger;
}
}  // namespace

TEST(Categories, ARuleOverridesTheLoggerLevel) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setLevel(Level::Info);
  ASSERT_TRUE(logger->setCategoryLevel("db", Level::Error));
  logger->log(Level::Warn, "db", "slow query");
  logger->log(Level::Warn, "net", "retry");
  logger->log(Level::Error, "db", "deadlock");
  ASSERT_EQ(lines.size(), 2u);
  EXPECT_EQ(lines[0], "[7] WARN net: retry");
  EXPECT_EQ(lines[1], "[7] ERROR db: deadlock");
}

TEST(Categories, ARuleCanBeMoreVerboseThanTheLoggerLevel) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setLevel(Level::Warn);
  logger->setCategoryLevel("net", Level::Debug);
  logger->log(Level::Debug, "net", "packet");
  logger->log(Level::Debug, "db", "row");
  ASSERT_EQ(lines.size(), 1u);
  EXPECT_EQ(lines[0], "[7] DEBUG net: packet");
  EXPECT_EQ(logger->accepted(), 1);
}

TEST(Categories, ChildCategoriesInheritTheirParentsRule) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setCategoryLevel("db", Level::Error);
  logger->log(Level::Info, "db", "a");
  logger->log(Level::Info, "db.pool", "b");
  logger->log(Level::Info, "db.pool.reaper", "c");
  EXPECT_EQ(lines.size(), 0u);
  logger->log(Level::Error, "db.pool.reaper", "d");
  EXPECT_EQ(lines.size(), 1u);
}

TEST(Categories, TheMostSpecificRuleWins) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setCategoryLevel("db", Level::Error);
  logger->setCategoryLevel("db.pool", Level::Debug);
  logger->log(Level::Debug, "db.pool", "a");
  logger->log(Level::Debug, "db.pool.reaper", "b");
  logger->log(Level::Debug, "db.query", "c");
  ASSERT_EQ(lines.size(), 2u);
  EXPECT_EQ(lines[0], "[7] DEBUG db.pool: a");
  EXPECT_EQ(lines[1], "[7] DEBUG db.pool.reaper: b");
}

TEST(Categories, RulesMatchWholeSegmentsOnly) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setCategoryLevel("db", Level::Error);
  logger->log(Level::Info, "dbx", "a");
  logger->log(Level::Info, "database", "b");
  logger->log(Level::Info, "d", "c");
  EXPECT_EQ(lines.size(), 3u);
}

TEST(Categories, AParentCategoryIsNotGovernedByItsChildsRule) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setLevel(Level::Warn);
  logger->setCategoryLevel("db.pool", Level::Debug);
  logger->log(Level::Debug, "db", "a");
  EXPECT_EQ(lines.size(), 0u);
}

TEST(Categories, SettingARuleAgainReplacesIt) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setCategoryLevel("db", Level::Error);
  logger->setCategoryLevel("db", Level::Info);
  logger->log(Level::Info, "db", "a");
  EXPECT_EQ(lines.size(), 1u);
}

TEST(Categories, ClearingFallsBackToTheNextRuleUp) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setLevel(Level::Info);
  logger->setCategoryLevel("db", Level::Error);
  logger->setCategoryLevel("db.pool", Level::Debug);
  logger->clearCategoryLevel("db.pool");
  logger->log(Level::Debug, "db.pool", "a");
  EXPECT_EQ(lines.size(), 0u);
  logger->clearCategoryLevel("db");
  logger->log(Level::Info, "db.pool", "b");
  ASSERT_EQ(lines.size(), 1u);
  EXPECT_EQ(lines[0], "[7] INFO db.pool: b");
}

TEST(Categories, ClearingAnUnknownRuleIsHarmless) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setCategoryLevel("db", Level::Error);
  logger->clearCategoryLevel("net");
  logger->clearCategoryLevel("db.pool");
  logger->log(Level::Info, "db.pool", "a");
  EXPECT_EQ(lines.size(), 0u);
}

TEST(Categories, AnEmptyCategoryNameIsRefused) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setLevel(Level::Warn);
  EXPECT_FALSE(logger->setCategoryLevel("", Level::Debug));
  logger->log(Level::Debug, "", "a");
  logger->log(Level::Debug, "x", "b");
  EXPECT_EQ(lines.size(), 0u);
}

TEST(Categories, ChangingTheLoggerLevelLeavesRulesAlone) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->setCategoryLevel("net", Level::Debug);
  logger->setLevel(Level::Error);
  logger->log(Level::Debug, "net", "a");
  logger->log(Level::Warn, "db", "b");
  ASSERT_EQ(lines.size(), 1u);
  EXPECT_EQ(lines[0], "[7] DEBUG net: a");
}

TEST(Categories, SinkLevelsStillApplyAfterTheCategoryRule) {
  std::vector<std::string> everything, warnings;
  auto logger = loggerInto(everything, Level::Debug);
  logger->addSink(std::make_unique<CaptureSink>(&warnings), Level::Warn);
  logger->setLevel(Level::Error);
  logger->setCategoryLevel("net", Level::Debug);
  logger->log(Level::Debug, "net", "chatty");
  EXPECT_EQ(everything.size(), 1u);
  EXPECT_EQ(warnings.size(), 0u);
  EXPECT_EQ(logger->accepted(), 1);
}

TEST(Categories, TheBaseBehaviourStillHolds) {
  std::vector<std::string> lines;
  auto logger = loggerInto(lines);
  logger->log(Level::Info, "", "a\nb");
  ASSERT_EQ(lines.size(), 1u);
  EXPECT_EQ(lines[0], "[7] INFO -: a\\nb");
  EXPECT_TRUE(logx::makeConfigurableLogger(nullptr) == nullptr);
}
