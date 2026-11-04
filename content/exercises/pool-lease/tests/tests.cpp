#include <string>
#include <type_traits>
#include <utility>
#include "bp_test.h"
#include "solution.h"

TEST(Pool, StartsFullAndExhaustsAtCapacity) {
  BufferPool pool(2);
  EXPECT_EQ(pool.capacity(), static_cast<std::size_t>(2));
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(2));
  auto a = pool.acquire();
  auto b = pool.acquire();
  EXPECT_TRUE(static_cast<bool>(a));
  EXPECT_TRUE(static_cast<bool>(b));
  EXPECT_TRUE(&*a != &*b);
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(0));
}

TEST(Pool, ExhaustedGivesAnEmptyLease) {
  BufferPool pool(1);
  auto a = pool.acquire();
  auto b = pool.acquire();
  EXPECT_TRUE(static_cast<bool>(a));
  EXPECT_FALSE(static_cast<bool>(b));
  EXPECT_EQ(pool.capacity(), static_cast<std::size_t>(1));
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(0));
}

TEST(Pool, LeaseReturnsOnScopeExit) {
  BufferPool pool(2);
  {
    auto a = pool.acquire();
    EXPECT_EQ(pool.available(), static_cast<std::size_t>(1));
  }
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(2));
}

TEST(Pool, ReturnedBufferIsClearedAndReused) {
  BufferPool pool(1);
  const Buffer* first = nullptr;
  {
    auto a = pool.acquire();
    ASSERT_TRUE(static_cast<bool>(a));
    *a += "secret of request 1";
    first = &*a;
  }
  auto b = pool.acquire();
  ASSERT_TRUE(static_cast<bool>(b));
  EXPECT_TRUE(b->empty());
  EXPECT_TRUE(&*b == first);  // reused, not recreated
}

TEST(Pool, EmptyLeaseGivesNothingBack) {
  BufferPool pool(1);
  auto a = pool.acquire();
  {
    auto none = pool.acquire();
    EXPECT_FALSE(static_cast<bool>(none));
  }
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(0));
}

TEST(Lease, IsMoveOnly) {
  EXPECT_FALSE(std::is_copy_constructible<BufferPool::Lease>::value);
  EXPECT_FALSE(std::is_copy_assignable<BufferPool::Lease>::value);
  EXPECT_TRUE(std::is_move_constructible<BufferPool::Lease>::value);
  EXPECT_TRUE(std::is_move_assignable<BufferPool::Lease>::value);
}

TEST(Lease, MoveTransfersOwnershipOnce) {
  BufferPool pool(2);
  {
    auto a = pool.acquire();
    *a = "hello";
    BufferPool::Lease b = std::move(a);
    EXPECT_FALSE(static_cast<bool>(a));
    ASSERT_TRUE(static_cast<bool>(b));
    EXPECT_EQ(*b, std::string("hello"));
    EXPECT_EQ(pool.available(), static_cast<std::size_t>(1));
  }
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(2));  // exactly one give-back, not two
  auto x = pool.acquire();
  auto y = pool.acquire();
  EXPECT_TRUE(&*x != &*y);
  EXPECT_FALSE(static_cast<bool>(pool.acquire()));
}

TEST(Lease, MoveAssignReleasesWhatItHeld) {
  BufferPool pool(2);
  auto a = pool.acquire();
  auto b = pool.acquire();
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(0));
  a = std::move(b);  // a's old buffer must go back to the pool
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(1));
  EXPECT_TRUE(static_cast<bool>(a));
  EXPECT_FALSE(static_cast<bool>(b));
  a = BufferPool::Lease();  // overwrite with an empty lease: releases the second buffer too
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(2));
}

TEST(Lease, SelfMoveAssignKeepsTheBuffer) {
  BufferPool pool(1);
  auto a = pool.acquire();
  *a = "kept";
  BufferPool::Lease& same = a;
  a = std::move(same);
  ASSERT_TRUE(static_cast<bool>(a));
  EXPECT_EQ(*a, std::string("kept"));
  EXPECT_EQ(pool.available(), static_cast<std::size_t>(0));
}
