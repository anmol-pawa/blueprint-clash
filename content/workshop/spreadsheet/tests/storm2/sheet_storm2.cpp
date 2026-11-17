#include <algorithm>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using sheet::Change;
using sheet::Error;
using sheet::Status;
using sheet::Value;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

std::string show(const Value& v) { return v.error == Error::DivideByZero ? "#DIV/0" : std::to_string(v.number); }

struct Fixture {
  std::unique_ptr<sheet::WatchedSheet> s = sheet::makeWatchedSheet();
  std::vector<Change> heard;
  int id = 0;

  Fixture() {
    id = s->subscribe([this](const Change& c) { heard.push_back(c); });
  }
  Status set(const std::string& cell, const std::string& text) {
    heard.clear();
    return s->set(cell, text);
  }
  // "B1:2>3, C1:3>4" in the order they were heard.
  std::string log() const {
    std::string out;
    for (const Change& c : heard) out += (out.empty() ? "" : ", ") + c.cell + ":" + show(c.before) + ">" + show(c.after);
    return out;
  }
  std::string sortedCells() const {
    std::vector<std::string> cells;
    for (const Change& c : heard) cells.push_back(c.cell);
    std::sort(cells.begin(), cells.end());
    std::string out;
    for (const auto& c : cells) out += (out.empty() ? "" : ",") + c;
    return out;
  }
  long position(const std::string& cell) const {
    for (std::size_t i = 0; i < heard.size(); ++i) if (heard[i].cell == cell) return static_cast<long>(i);
    return -1;
  }
};
}  // namespace

TEST(Watch, TheEditedCellAndEveryChangedDependentAreReportedWithBeforeAndAfter) {
  Fixture f;
  f.set("A1", "1");
  EXPECT_EQ(f.log(), std::string("A1:0>1"));
  f.set("B1", "=A1+1");
  EXPECT_EQ(f.log(), std::string("B1:0>2"));
  f.set("A1", "10");
  EXPECT_EQ(f.log(), std::string("A1:1>10, B1:2>11"));
  f.set("A1", "");
  EXPECT_EQ(f.log(), std::string("A1:10>0, B1:11>1"));
  f.set("B1", "=1/0");
  EXPECT_EQ(f.log(), std::string("B1:1>#DIV/0"));
  f.set("B1", "=A1+1");
  EXPECT_EQ(f.log(), std::string("B1:#DIV/0>1"));
}

TEST(Watch, CellsThatWereRecomputedToTheSameValueAreNotReported) {
  Fixture f;
  f.set("A1", "5");
  f.set("B1", "=A1*0");
  f.set("C1", "=B1+3");
  f.set("D1", "=A1-A1");
  f.set("A1", "6");
  EXPECT_EQ(f.log(), std::string("A1:5>6"));
  f.set("E1", "0");  // empty to a literal zero: same value, nothing to say
  EXPECT_EQ(f.log(), std::string(""));
  f.set("E1", "");
  EXPECT_EQ(f.log(), std::string(""));
  f.set("A1", "6");
  EXPECT_EQ(f.log(), std::string(""));
}

TEST(Watch, PrecedentsAreReportedBeforeTheirDependents) {
  Fixture f;
  // Backwards on purpose: the dependency order is not the cell order.
  f.set("A1", "1");
  f.set("D1", "=A1+1");
  f.set("C1", "=D1+1");
  f.set("B1", "=C1+1");
  f.set("E1", "=A1+B1+D1");
  f.set("A1", "50");
  EXPECT_EQ(f.sortedCells(), std::string("A1,B1,C1,D1,E1"));
  EXPECT_EQ(f.heard.size(), 5u);
  EXPECT_TRUE(f.position("A1") < f.position("D1"));
  EXPECT_TRUE(f.position("D1") < f.position("C1"));
  EXPECT_TRUE(f.position("C1") < f.position("B1"));
  EXPECT_TRUE(f.position("B1") < f.position("E1"));
  EXPECT_TRUE(f.position("D1") < f.position("E1"));
}

TEST(Watch, ADiamondReportsEachChangedCellOnce) {
  Fixture f;
  f.set("A1", "1");
  f.set("B1", "=A1+1");
  f.set("C1", "=A1*2");
  f.set("D1", "=B1+C1");
  f.set("A1", "4");
  EXPECT_EQ(f.heard.size(), 4u);
  EXPECT_EQ(f.sortedCells(), std::string("A1,B1,C1,D1"));
  EXPECT_EQ(f.heard.back().cell, std::string("D1"));
  EXPECT_EQ(f.heard.back().before.number, 4LL);
  EXPECT_EQ(f.heard.back().after.number, 13LL);
}

TEST(Watch, ListenersSeeTheFinishedSheet) {
  Fixture f;
  f.set("A1", "1");
  f.set("D1", "=A1+1");
  f.set("C1", "=D1+1");
  f.set("B1", "=C1+1");
  std::vector<std::string> seen;
  f.s->subscribe([&](const Change& c) {
    if (c.cell != "A1") return;
    Value v;
    for (const char* cell : {"D1", "C1", "B1"}) {
      f.s->get(cell, v);
      seen.push_back(show(v));
    }
    std::string t;
    f.s->text("A1", t);
    seen.push_back(t);
  });
  f.set("A1", "20");
  EXPECT_EQ(seen.size(), 4u);
  if (seen.size() == 4) {
    EXPECT_EQ(seen[0], std::string("21"));
    EXPECT_EQ(seen[1], std::string("22"));
    EXPECT_EQ(seen[2], std::string("23"));
    EXPECT_EQ(seen[3], std::string("20"));
  }
}

TEST(Watch, RefusedAndInvalidSetsSayNothing) {
  Fixture f;
  f.set("A1", "=B1");
  IS(f.set("B1", "=A1"), Cycle);
  EXPECT_EQ(f.log(), std::string(""));
  IS(f.set("B1", "=1+"), InvalidFormula);
  EXPECT_EQ(f.log(), std::string(""));
  IS(f.set("b1", "1"), InvalidCell);
  EXPECT_EQ(f.log(), std::string(""));
}

TEST(Watch, SeveralListenersAndUnsubscribe) {
  Fixture f;
  std::vector<std::string> order;
  const int second = f.s->subscribe([&](const Change& c) { order.push_back("2:" + c.cell); });
  f.s->subscribe([&](const Change& c) { order.push_back("3:" + c.cell); });
  EXPECT_TRUE(second > f.id);
  f.set("A1", "1");
  f.set("B1", "=A1");
  order.clear();
  f.set("A1", "2");
  EXPECT_EQ(order.size(), 4u);
  if (order.size() == 4) {
    EXPECT_EQ(order[0], std::string("2:A1"));
    EXPECT_EQ(order[1], std::string("3:A1"));
    EXPECT_EQ(order[2], std::string("2:B1"));
    EXPECT_EQ(order[3], std::string("3:B1"));
  }
  f.s->unsubscribe(second);
  f.s->unsubscribe(second);
  f.s->unsubscribe(12345);
  order.clear();
  f.set("A1", "3");
  EXPECT_EQ(order.size(), 2u);
  f.s->unsubscribe(f.id);
  f.set("A1", "4");
  EXPECT_EQ(f.heard.size(), 0u);
  EXPECT_EQ(order.size(), 4u);
  const int third = f.s->subscribe([](const Change&) {});
  EXPECT_TRUE(third > second);
}

TEST(Watch, FunctionsAndErrorsReportToo) {
  Fixture f;
  f.set("A1", "1");
  f.set("A2", "2");
  f.set("B1", "=SUM(A1:A3)");
  f.set("B2", "=COUNT(A1:A3)");
  f.set("A3", "5");
  EXPECT_EQ(f.sortedCells(), std::string("A3,B1,B2"));
  f.set("A3", "5");
  EXPECT_EQ(f.log(), std::string(""));
  f.set("A3", "=1/0");
  EXPECT_EQ(f.sortedCells(), std::string("A3,B1"));
  f.set("A3", "");
  EXPECT_EQ(f.sortedCells(), std::string("A3,B1,B2"));
  EXPECT_EQ(f.heard.size(), 3u);
}
