#include <string>
#include <type_traits>
#include <utility>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
template <class T, class = void>
struct HasPushBack : std::false_type {};
template <class T>
struct HasPushBack<T, std::void_t<decltype(std::declval<T&>().push_back(std::string()))>> : std::true_type {};
}  // namespace

TEST(History, KeepsEntriesOldestFirst) {
  BoundedHistory h(5);
  h.add("a");
  h.add("b");
  h.add("c");
  ASSERT_EQ(h.size(), static_cast<std::size_t>(3));
  EXPECT_EQ(h.at(0), std::string("a"));
  EXPECT_EQ(h.at(2), std::string("c"));
}

TEST(History, DropsTheOldestWhenFull) {
  BoundedHistory h(3);
  for (const char* s : {"a", "b", "c", "d", "e"}) h.add(s);
  ASSERT_EQ(h.size(), static_cast<std::size_t>(3));
  EXPECT_EQ(h.at(0), std::string("c"));
  EXPECT_EQ(h.at(1), std::string("d"));
  EXPECT_EQ(h.at(2), std::string("e"));
}

TEST(History, LatestIsTheNewestEntry) {
  BoundedHistory h(2);
  EXPECT_EQ(h.latest(), std::string(""));
  h.add("x");
  EXPECT_EQ(h.latest(), std::string("x"));
  h.add("y");
  h.add("z");
  EXPECT_EQ(h.latest(), std::string("z"));
}

TEST(History, CapacityZeroKeepsNothing) {
  BoundedHistory h(0);
  h.add("a");
  EXPECT_EQ(h.size(), static_cast<std::size_t>(0));
  EXPECT_EQ(h.latest(), std::string(""));
}

TEST(History, CapacityOneKeepsOnlyTheLast) {
  BoundedHistory h(1);
  h.add("a");
  h.add("b");
  ASSERT_EQ(h.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(h.at(0), std::string("b"));
}

TEST(Design, NotDerivedFromVector) {
  EXPECT_FALSE((std::is_base_of<std::vector<std::string>, BoundedHistory>::value));
}

TEST(Design, NoPushBack) {
  EXPECT_FALSE(HasPushBack<BoundedHistory>::value);
}
