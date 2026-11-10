#include <algorithm>
#include <iterator>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>
#include "bp_test.h"
#include "solution.h"

// Callers get read-only access: dereferencing yields a const reference, not a copy and not a mutable one.
static_assert(std::is_same_v<decltype(*std::declval<Roster::const_iterator>()), const std::string&>,
              "operator* must return const std::string&");

namespace {
Roster make(std::initializer_list<const char*> names) {
  Roster r;
  for (const char* n : names) r.add(n);
  return r;
}

std::string join(const Roster& r) {
  std::string out;
  for (const std::string& name : r) {
    if (!out.empty()) out += ",";
    out += name;
  }
  return out;
}
}  // namespace

TEST(Roster, IteratesInJoinOrder) {
  Roster r = make({"ann", "bob", "cy"});
  EXPECT_EQ(join(r), std::string("ann,bob,cy"));
}

TEST(Roster, SkipsDeadEntriesAtTheStart) {
  Roster r = make({"ann", "bob", "cy"});
  EXPECT_TRUE(r.remove("ann"));
  EXPECT_EQ(join(r), std::string("bob,cy"));
}

TEST(Roster, SkipsSeveralDeadEntriesInARow) {
  Roster r = make({"a", "b", "c", "d", "e"});
  r.remove("b");
  r.remove("c");
  r.remove("d");
  EXPECT_EQ(join(r), std::string("a,e"));
}

TEST(Roster, TrailingDeadEntriesAreNotVisited) {
  Roster r = make({"a", "b", "c", "d"});
  r.remove("c");
  r.remove("d");
  EXPECT_EQ(join(r), std::string("a,b"));
}

TEST(Roster, EmptyAndFullyRemovedRostersHaveBeginEqualEnd) {
  Roster empty;
  EXPECT_TRUE(empty.begin() == empty.end());
  Roster r = make({"x", "y"});
  r.remove("x");
  r.remove("y");
  EXPECT_TRUE(r.begin() == r.end());
  EXPECT_EQ(r.size(), static_cast<std::size_t>(0));
}

TEST(Roster, SizeCountsOnlyLiveEntries) {
  Roster r = make({"a", "b", "c"});
  EXPECT_EQ(r.size(), static_cast<std::size_t>(3));
  EXPECT_TRUE(r.remove("b"));
  EXPECT_FALSE(r.remove("b"));      // already gone
  EXPECT_FALSE(r.remove("nobody"));
  EXPECT_EQ(r.size(), static_cast<std::size_t>(2));
}

TEST(Roster, RemoveMarksOnlyTheFirstLiveDuplicate) {
  Roster r = make({"sam", "kim", "sam"});
  EXPECT_TRUE(r.remove("sam"));
  EXPECT_EQ(join(r), std::string("kim,sam"));
}

TEST(Roster, WorksWithStandardAlgorithms) {
  Roster r = make({"ann", "bob", "al", "cy"});
  r.remove("bob");
  const auto startsWithA = [](const std::string& s) { return !s.empty() && s[0] == 'a'; };
  EXPECT_EQ(std::count_if(r.begin(), r.end(), startsWithA), 2);
  EXPECT_EQ(std::distance(r.begin(), r.end()), 3);
  const auto it = std::find(r.begin(), r.end(), std::string("cy"));
  EXPECT_TRUE(it != r.end());
  EXPECT_TRUE(std::find(r.begin(), r.end(), std::string("bob")) == r.end());
}

TEST(Roster, PostIncrementReturnsThePreviousPosition) {
  Roster r = make({"a", "b"});
  auto it = r.begin();
  const auto before = it++;
  EXPECT_EQ(*before, std::string("a"));
  EXPECT_EQ(*it, std::string("b"));
}

TEST(Roster, IteratorsAreIndependentAndArrowWorks) {
  Roster r = make({"ann", "bob"});
  auto first = r.begin();
  auto second = r.begin();
  ++second;
  EXPECT_EQ(*first, std::string("ann"));
  EXPECT_EQ(second->size(), static_cast<std::size_t>(3));
  EXPECT_TRUE(first != second);
  ++first;
  EXPECT_TRUE(first == second);
}

TEST(Roster, ConstRosterCanBeIteratedAndDefaultIteratorsCompare) {
  const Roster r = make({"a", "b"});
  EXPECT_EQ(join(r), std::string("a,b"));
  Roster::const_iterator a;
  Roster::const_iterator b;
  EXPECT_TRUE(a == b);
}
