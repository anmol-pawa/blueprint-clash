#include "bp_test.h"
#include "solution.h"

TEST(Ids, AreSequentialFromOne) {
  Counter::resetIds();
  Counter a, b, c;
  EXPECT_EQ(a.id(), 1);
  EXPECT_EQ(b.id(), 2);
  EXPECT_EQ(c.id(), 3);
}

TEST(Ids, AreNeverReusedAfterDestruction) {
  Counter::resetIds();
  { Counter a; EXPECT_EQ(a.id(), 1); }
  Counter b;
  EXPECT_EQ(b.id(), 2);
}

TEST(Ids, ResetStartsOverWithoutTouchingAlive) {
  Counter::resetIds();
  Counter a;
  int before = Counter::alive();
  Counter::resetIds();
  EXPECT_EQ(Counter::alive(), before);
  Counter b;
  EXPECT_EQ(b.id(), 1);
}

TEST(Value, IsPerObject) {
  Counter a, b;
  a.increment();
  a.increment();
  b.increment();
  EXPECT_EQ(a.value(), 2);
  EXPECT_EQ(b.value(), 1);
}

TEST(Alive, TracksConstructionAndDestruction) {
  EXPECT_EQ(Counter::alive(), 0);
  {
    Counter a, b;
    EXPECT_EQ(Counter::alive(), 2);
    { Counter c; EXPECT_EQ(Counter::alive(), 3); }
    EXPECT_EQ(Counter::alive(), 2);
  }
  EXPECT_EQ(Counter::alive(), 0);
}

TEST(Copy, IsANewObjectWithAFreshIdAndTheSameValue) {
  Counter::resetIds();
  Counter a;
  a.increment();
  Counter b = a;
  EXPECT_EQ(b.value(), 1);
  EXPECT_NE(b.id(), a.id());
  EXPECT_EQ(Counter::alive(), 2);
}

TEST(Copy, DestroyingACopyBalancesTheCount) {
  EXPECT_EQ(Counter::alive(), 0);
  {
    Counter a;
    { Counter b = a; EXPECT_EQ(Counter::alive(), 2); }
    EXPECT_EQ(Counter::alive(), 1);
  }
  EXPECT_EQ(Counter::alive(), 0);
}

TEST(Assign, CopiesTheValueButKeepsTheId) {
  Counter::resetIds();
  Counter a, b;
  a.increment();
  a.increment();
  int bId = b.id();
  b = a;
  EXPECT_EQ(b.value(), 2);
  EXPECT_EQ(b.id(), bId);
  EXPECT_EQ(Counter::alive(), 2);
}
