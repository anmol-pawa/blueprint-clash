#include <memory>
#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
// Overrides only the required steps: proves the footer hook really is optional.
class Plain : public ReportGenerator {
 public:
  Plain(std::string title, std::vector<std::string> rows) : title_(std::move(title)), rows_(std::move(rows)) {}

 private:
  std::string title() const override { return title_; }
  std::vector<std::string> rows() const override { return rows_; }
  std::string title_;
  std::vector<std::string> rows_;
};

class WithFooter : public ReportGenerator {
 private:
  std::string title() const override { return "Sales"; }
  std::vector<std::string> rows() const override { return {"north: 4", "south: 9"}; }
  std::string footer() const override { return "total: 13\n"; }
};

// Records the order in which the template calls its steps and how often.
class Recording : public ReportGenerator {
 public:
  mutable std::vector<std::string> log;

 private:
  std::string title() const override { log.push_back("title"); return "R"; }
  std::vector<std::string> rows() const override { log.push_back("rows"); return {"x"}; }
  std::string footer() const override { log.push_back("footer"); return "end\n"; }
};
}  // namespace

TEST(Report, RequiredStepsOnlyProduceHeadingAndRows) {
  Plain r("Users", {"ann", "bob"});
  EXPECT_EQ(r.generate(), std::string("== Users ==\n- ann\n- bob\n"));
}

TEST(Report, FooterHookIsAppendedAfterTheRows) {
  WithFooter r;
  EXPECT_EQ(r.generate(), std::string("== Sales ==\n- north: 4\n- south: 9\ntotal: 13\n"));
}

TEST(Report, NoRowsPrintsAPlaceholder) {
  Plain r("Empty", {});
  EXPECT_EQ(r.generate(), std::string("== Empty ==\n(no rows)\n"));
}

TEST(Report, StepsRunInOrderAndRowsOnlyOnce) {
  Recording r;
  EXPECT_EQ(r.generate(), std::string("== R ==\n- x\nend\n"));
  const std::vector<std::string> expected = {"title", "rows", "footer"};
  EXPECT_TRUE(r.log == expected);
}

TEST(Report, GenerateIsCallableOnAConstObjectThroughTheBase) {
  const std::unique_ptr<const ReportGenerator> r = std::make_unique<WithFooter>();
  EXPECT_EQ(r->generate(), std::string("== Sales ==\n- north: 4\n- south: 9\ntotal: 13\n"));
}

TEST(Report, GeneratingTwiceGivesTheSameText) {
  Plain r("Again", {"a"});
  EXPECT_EQ(r.generate(), r.generate());
}
