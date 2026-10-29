#include <type_traits>
#include <utility>
#include "api.h"
#include "bp_test.h"
#include "solution.h"

namespace os {
namespace {
int nextId = 1;
int openIds = 0;
int errors = 0;
bool live[1024];
}  // namespace
int open(const std::string&) {
  int id = nextId++;
  live[id] = true;
  ++openIds;
  return id;
}
void close(int id) {
  if (id <= 0 || id >= 1024 || !live[id]) {
    ++errors;
    return;
  }
  live[id] = false;
  --openIds;
}
int openCount() { return openIds; }
int closeErrors() { return errors; }
void reset() {
  nextId = 1;
  openIds = 0;
  errors = 0;
  for (bool& b : live) b = false;
}
}  // namespace os

TEST(Lifetime, OpensOnConstructionClosesOnScopeExit) {
  os::reset();
  {
    FileHandle f("a.txt");
    EXPECT_EQ(os::openCount(), 1);
    EXPECT_TRUE(f.id() > 0);
  }
  EXPECT_EQ(os::openCount(), 0);
  EXPECT_EQ(os::closeErrors(), 0);
}

TEST(Lifetime, ManyHandlesAreAllReleased) {
  os::reset();
  {
    FileHandle a("a"), b("b"), c("c");
    EXPECT_EQ(os::openCount(), 3);
  }
  EXPECT_EQ(os::openCount(), 0);
  EXPECT_EQ(os::closeErrors(), 0);
}

TEST(Ownership, CannotBeCopied) {
  EXPECT_FALSE(std::is_copy_constructible<FileHandle>::value);
  EXPECT_FALSE(std::is_copy_assignable<FileHandle>::value);
}

TEST(Ownership, CanBeMoved) {
  EXPECT_TRUE(std::is_move_constructible<FileHandle>::value);
  EXPECT_TRUE(std::is_move_assignable<FileHandle>::value);
}

TEST(Move, ConstructionTransfersTheId) {
  os::reset();
  {
    FileHandle a("a");
    int id = a.id();
    FileHandle b(std::move(a));
    EXPECT_EQ(b.id(), id);
    EXPECT_EQ(a.id(), 0);
    EXPECT_EQ(os::openCount(), 1);
  }
  EXPECT_EQ(os::openCount(), 0);
  EXPECT_EQ(os::closeErrors(), 0);
}

TEST(Move, AssignmentClosesTheOldFileFirst) {
  os::reset();
  {
    FileHandle a("a");
    FileHandle b("b");
    int bid = b.id();
    a = std::move(b);
    EXPECT_EQ(os::openCount(), 1);
    EXPECT_EQ(a.id(), bid);
    EXPECT_EQ(b.id(), 0);
  }
  EXPECT_EQ(os::openCount(), 0);
  EXPECT_EQ(os::closeErrors(), 0);
}

TEST(Move, SelfMoveAssignmentKeepsTheFileOpen) {
  os::reset();
  {
    FileHandle a("a");
    FileHandle& alias = a;
    a = std::move(alias);
    EXPECT_TRUE(a.id() > 0);
    EXPECT_EQ(os::openCount(), 1);
  }
  EXPECT_EQ(os::openCount(), 0);
  EXPECT_EQ(os::closeErrors(), 0);
}
