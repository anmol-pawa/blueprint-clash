#include <string>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

namespace {
struct FakeIds : IdSource {  // known numbers, no singleton involved
  long value;
  explicit FakeIds(long start) : value(start) {}
  long next() override { return value++; }
};
}  // namespace

TEST(Singleton, SameObjectEveryTime) {
  IdGenerator& a = IdGenerator::instance();
  IdGenerator& b = IdGenerator::instance();
  EXPECT_TRUE(&a == &b);
}

TEST(Singleton, CountsAcrossAllCallers) {
  IdGenerator& a = IdGenerator::instance();
  IdGenerator& b = IdGenerator::instance();
  const long first = a.next();
  EXPECT_EQ(b.next(), first + 1);
  EXPECT_EQ(IdGenerator::instance().next(), first + 2);
}

TEST(Singleton, CannotBeCopiedOrCreated) {
  EXPECT_FALSE(std::is_copy_constructible<IdGenerator>::value);
  EXPECT_FALSE(std::is_copy_assignable<IdGenerator>::value);
  EXPECT_FALSE(std::is_move_constructible<IdGenerator>::value);
  EXPECT_FALSE(std::is_move_assignable<IdGenerator>::value);
  EXPECT_FALSE(std::is_default_constructible<IdGenerator>::value);
}

TEST(OrderService, UsesTheInjectedSource) {
  FakeIds ids(100);
  OrderService service(ids);
  EXPECT_EQ(service.place("tea"), std::string("ORD-100:tea"));
  EXPECT_EQ(service.place("cake"), std::string("ORD-101:cake"));
  EXPECT_EQ(ids.value, 102L);
}

TEST(OrderService, TwoServicesShareOneSourceWhenGivenOne) {
  FakeIds ids(1);
  OrderService a(ids);
  OrderService b(ids);
  EXPECT_EQ(a.place("x"), std::string("ORD-1:x"));
  EXPECT_EQ(b.place("y"), std::string("ORD-2:y"));
}

TEST(OrderService, WorksWithTheRealSingleton) {
  OrderService service(IdGenerator::instance());
  const std::string first = service.place("a");
  const std::string second = service.place("b");
  EXPECT_TRUE(first.rfind("ORD-", 0) == 0);
  EXPECT_TRUE(first.size() > 6 && first.substr(first.size() - 2) == ":a");
  EXPECT_TRUE(second.substr(second.size() - 2) == ":b");
  EXPECT_TRUE(first != second);
}
