#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
struct Capture : Sink {
  std::vector<std::string> lines;

 private:
  void emit(const std::string& line) override { lines.push_back(line); }
};

// Tries to bypass the base class by declaring its own write().
struct Rogue : Sink {
  int rogueCalls = 0;
  void write(const std::string&) { ++rogueCalls; }

 private:
  void emit(const std::string&) override {}
};
}  // namespace

TEST(Write, NumbersEachLine) {
  Capture c;
  c.write("hello");
  c.write("world");
  EXPECT_EQ(c.lines.size(), 2u);
  EXPECT_EQ(c.lines[0], std::string("[1] hello"));
  EXPECT_EQ(c.lines[1], std::string("[2] world"));
}

TEST(Write, EmptyMessagesAreSkipped) {
  Capture c;
  c.write("");
  c.write("a");
  c.write("");
  EXPECT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(c.lines[0], std::string("[1] a"));
}

TEST(Write, SkippedMessagesAreNotCounted) {
  Capture c;
  c.write("");
  c.write("x");
  c.write("");
  c.write("y");
  EXPECT_EQ(c.written(), 2u);
  EXPECT_EQ(c.lines[1], std::string("[2] y"));
}

TEST(Write, StartsAtZero) {
  Capture c;
  EXPECT_EQ(c.written(), 0u);
}

TEST(Contract, WorksThroughTheBaseReference) {
  Capture c;
  Sink& s = c;
  s.write("via base");
  EXPECT_EQ(c.lines.size(), 1u);
  EXPECT_EQ(s.written(), 1u);
}

TEST(Contract, SubclassCannotBypassTheChecks) {
  Rogue r;
  Sink& s = r;
  s.write("hello");
  EXPECT_EQ(s.written(), 1u);  // base write ran; Rogue::write only hides it
  EXPECT_EQ(r.rogueCalls, 0);
}
