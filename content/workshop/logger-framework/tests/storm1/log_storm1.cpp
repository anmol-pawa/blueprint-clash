#include <string>
#include <utility>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using logx::Level;

namespace {
class RecordingSink : public logx::Sink {
 public:
  explicit RecordingSink(std::vector<std::string>* lines) : lines_(lines) {}
  void write(const std::string& line) override { lines_->push_back(line); }

 private:
  std::vector<std::string>* lines_;
};

// A logger with one sink that takes everything, so the thresholds are the only filter.
struct Rig {
  std::vector<std::string> lines;
  std::unique_ptr<logx::CategoryLogger> log = logx::makeCategoryLogger();
  Rig() { log->addSink(std::make_unique<RecordingSink>(&lines), Level::Debug); }
};
}  // namespace

TEST(Category, WithoutCategoryLevelsTheLoggerLevelApplies) {
  Rig r;
  r.log->setLevel(Level::Warn);
  r.log->log(Level::Info, "net", "dropped");
  r.log->log(Level::Warn, "net", "kept");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[WARN] net: kept");
}

TEST(Category, ACategoryCanBeStricterThanTheLogger) {
  Rig r;
  r.log->setCategoryLevel("db", Level::Error);
  r.log->log(Level::Warn, "db", "dropped");
  r.log->log(Level::Warn, "web", "kept");
  r.log->log(Level::Error, "db", "kept too");
  ASSERT_EQ(r.lines.size(), 2u);
  EXPECT_EQ(r.lines[0], "[WARN] web: kept");
  EXPECT_EQ(r.lines[1], "[ERROR] db: kept too");
}

TEST(Category, ACategoryCanLoosenTheLoggerLevel) {
  Rig r;
  r.log->setLevel(Level::Error);
  r.log->setCategoryLevel("net", Level::Debug);
  r.log->log(Level::Debug, "net", "chatty but wanted");
  r.log->log(Level::Debug, "web", "dropped");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[DEBUG] net: chatty but wanted");
}

TEST(Category, ALevelAppliesToTheCategoriesBelowIt) {
  Rig r;
  r.log->setCategoryLevel("net", Level::Warn);
  r.log->log(Level::Info, "net.http", "dropped");
  r.log->log(Level::Info, "net.http.client", "dropped too");
  r.log->log(Level::Warn, "net.http.client", "kept");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[WARN] net.http.client: kept");
}

TEST(Category, TheMostSpecificCategoryWins) {
  Rig r;
  r.log->setCategoryLevel("net", Level::Error);
  r.log->setCategoryLevel("net.http", Level::Debug);
  r.log->log(Level::Debug, "net.http.client", "kept by net.http");
  r.log->log(Level::Debug, "net.tcp", "dropped by net");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[DEBUG] net.http.client: kept by net.http");
}

TEST(Category, TheOrderOfConfigurationDoesNotMatter) {
  Rig r;
  r.log->setCategoryLevel("net.http", Level::Debug);
  r.log->setCategoryLevel("net", Level::Error);
  r.log->log(Level::Debug, "net.http", "kept");
  r.log->log(Level::Debug, "net", "dropped");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[DEBUG] net.http: kept");
}

TEST(Category, ANameThatMerelyStartsTheSameIsNotADescendant) {
  Rig r;
  r.log->setCategoryLevel("net", Level::Error);
  r.log->log(Level::Info, "network", "kept: not under net");
  r.log->log(Level::Info, "net", "dropped");
  r.log->log(Level::Info, "netx.y", "kept too");
  ASSERT_EQ(r.lines.size(), 2u);
  EXPECT_EQ(r.lines[0], "[INFO] network: kept: not under net");
  EXPECT_EQ(r.lines[1], "[INFO] netx.y: kept too");
}

TEST(Category, ADescendantDoesNotConfigureItsAncestor) {
  Rig r;
  r.log->setLevel(Level::Warn);
  r.log->setCategoryLevel("net.http", Level::Debug);
  r.log->log(Level::Info, "net", "dropped");
  EXPECT_TRUE(r.lines.empty());
}

TEST(Category, SettingACategoryAgainReplacesItsLevel) {
  Rig r;
  r.log->setCategoryLevel("db", Level::Error);
  r.log->setCategoryLevel("db", Level::Info);
  r.log->log(Level::Info, "db", "kept");
  EXPECT_EQ(r.lines.size(), 1u);
}

TEST(Category, ClearingFallsBackToTheAncestorOrTheLogger) {
  Rig r;
  r.log->setLevel(Level::Warn);
  r.log->setCategoryLevel("net", Level::Debug);
  r.log->setCategoryLevel("net.http", Level::Error);
  EXPECT_TRUE(r.log->clearCategoryLevel("net.http"));
  r.log->log(Level::Debug, "net.http", "kept via net");
  EXPECT_TRUE(r.log->clearCategoryLevel("net"));
  r.log->log(Level::Debug, "net.http", "dropped by logger");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[DEBUG] net.http: kept via net");
}

TEST(Category, ClearingACategoryThatHasNoLevelSaysSo) {
  Rig r;
  r.log->setCategoryLevel("net.http", Level::Debug);
  EXPECT_FALSE(r.log->clearCategoryLevel("net"));
  EXPECT_FALSE(r.log->clearCategoryLevel("nothing"));
  EXPECT_TRUE(r.log->clearCategoryLevel("net.http"));
  EXPECT_FALSE(r.log->clearCategoryLevel("net.http"));
}

TEST(Category, TheEmptyCategoryCannotBeConfigured) {
  Rig r;
  EXPECT_FALSE(r.log->setCategoryLevel("", Level::Error));
  r.log->log(Level::Info, "", "unaffected");
  EXPECT_EQ(r.lines.size(), 1u);
}

TEST(Category, ALineWithNoCategoryUsesTheLoggerLevel) {
  Rig r;
  r.log->setLevel(Level::Warn);
  r.log->setCategoryLevel("net", Level::Debug);
  r.log->log(Level::Info, "", "dropped");
  EXPECT_TRUE(r.lines.empty());
}

TEST(Category, SinkMinimumsStillApplyAfterTheCategoryLevel) {
  std::vector<std::string> quiet;
  auto log = logx::makeCategoryLogger();
  log->addSink(std::make_unique<RecordingSink>(&quiet), Level::Error);
  log->setCategoryLevel("net", Level::Debug);
  log->log(Level::Debug, "net", "passes the category but not the sink");
  log->log(Level::Error, "net", "passes both");
  ASSERT_EQ(quiet.size(), 1u);
  EXPECT_EQ(quiet[0], "[ERROR] net: passes both");
}

TEST(Category, LoggerLevelChangesStillWorkAlongsideCategories) {
  Rig r;
  r.log->setCategoryLevel("db", Level::Error);
  r.log->setLevel(Level::Error);
  r.log->log(Level::Warn, "web", "dropped");
  r.log->setLevel(Level::Debug);
  r.log->log(Level::Warn, "web", "kept");
  r.log->log(Level::Warn, "db", "still dropped");
  ASSERT_EQ(r.lines.size(), 1u);
  EXPECT_EQ(r.lines[0], "[WARN] web: kept");
}
