#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
// Counts how it was constructed, so tests can prove "no needless copies".
struct Tracked {
  static inline int copies = 0;
  static inline int moves = 0;
  int v;
  Tracked() : v(0) {}
  explicit Tracked(int x) : v(x) {}
  Tracked(const Tracked& o) : v(o.v) { ++copies; }
  Tracked(Tracked&& o) noexcept : v(o.v) { ++moves; }
  Tracked& operator=(const Tracked&) = default;
  Tracked& operator=(Tracked&&) noexcept = default;
  static void reset() { copies = moves = 0; }
};
}  // namespace

TEST(Basics, StartsEmpty) {
  Stack<int> s;
  EXPECT_TRUE(s.empty());
  EXPECT_EQ(s.size(), 0u);
  EXPECT_TRUE(s.peek() == nullptr);
}

TEST(Basics, IsLastInFirstOut) {
  Stack<int> s;
  s.push(1);
  s.push(2);
  s.push(3);
  EXPECT_EQ(s.size(), 3u);
  ASSERT_TRUE(s.peek() != nullptr);
  EXPECT_EQ(*s.peek(), 3);
  EXPECT_EQ(*s.pop(), 3);
  EXPECT_EQ(*s.pop(), 2);
  EXPECT_EQ(*s.pop(), 1);
  EXPECT_TRUE(s.empty());
}

TEST(Basics, PopOnEmptyIsNullopt) {
  Stack<int> s;
  EXPECT_FALSE(s.pop().has_value());
  s.push(7);
  s.pop();
  EXPECT_FALSE(s.pop().has_value());
  EXPECT_EQ(s.size(), 0u);
}

TEST(Basics, PeekDoesNotRemove) {
  Stack<std::string> s;
  s.push("a");
  s.push("b");
  EXPECT_EQ(*s.peek(), "b");
  EXPECT_EQ(s.size(), 2u);
}

TEST(Basics, LvaluePushKeepsTheCallersValue) {
  Stack<std::string> s;
  std::string word = "keep";
  s.push(word);
  EXPECT_EQ(word, "keep");
  EXPECT_EQ(*s.peek(), "keep");
}

TEST(Moves, WorksForMoveOnlyTypes) {
  Stack<std::unique_ptr<int>> s;
  s.push(std::make_unique<int>(10));
  s.push(std::make_unique<int>(20));
  auto top = s.pop();
  ASSERT_TRUE(top.has_value());
  EXPECT_EQ(**top, 20);
  EXPECT_EQ(**s.peek(), 10);
}

TEST(Moves, RvaluePushNeverCopiesTheElement) {
  Stack<Tracked> s;
  Tracked::reset();
  s.push(Tracked(1));
  EXPECT_EQ(Tracked::copies, 0);
}

TEST(Moves, PopMovesTheElementOut) {
  Stack<Tracked> s;
  s.push(Tracked(5));
  Tracked::reset();
  auto top = s.pop();
  ASSERT_TRUE(top.has_value());
  EXPECT_EQ(top->v, 5);
  EXPECT_EQ(Tracked::copies, 0);
}
