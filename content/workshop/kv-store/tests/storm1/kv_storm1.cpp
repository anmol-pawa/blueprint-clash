#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
class FakeClock : public kv::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<kv::TransactionalStore> store = kv::makeTransactionalStore(clock);
};

std::string valueOf(const kv::Store& store, const std::string& key) {
  const auto got = store.get(key);
  return got.has_value() ? *got : std::string("<absent>");
}
}  // namespace

TEST(Txn, ANullClockIsRefused) {
  EXPECT_TRUE(kv::makeTransactionalStore(nullptr) == nullptr);
}

TEST(Txn, WithoutATransactionCommitAndRollbackReturnFalse) {
  Fixture f;
  f.store->set("a", "1");
  EXPECT_EQ(f.store->depth(), 0);
  EXPECT_FALSE(f.store->commit());
  EXPECT_FALSE(f.store->rollback());
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
}

TEST(Txn, DepthFollowsBeginCommitAndRollback) {
  Fixture f;
  f.store->begin();
  f.store->begin();
  EXPECT_EQ(f.store->depth(), 2);
  EXPECT_TRUE(f.store->commit());
  EXPECT_EQ(f.store->depth(), 1);
  EXPECT_TRUE(f.store->rollback());
  EXPECT_EQ(f.store->depth(), 0);
}

TEST(Txn, ReadsSeeUncommittedWrites) {
  Fixture f;
  f.store->begin();
  f.store->set("a", "1");
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Txn, CommitKeepsTheWrites) {
  Fixture f;
  f.store->begin();
  f.store->set("a", "1");
  f.store->erase("a");
  f.store->set("b", "2");
  EXPECT_TRUE(f.store->commit());
  EXPECT_FALSE(f.store->get("a").has_value());
  EXPECT_EQ(valueOf(*f.store, "b"), "2");
}

TEST(Rollback, RemovesKeysTheTransactionCreated) {
  Fixture f;
  f.store->set("keep", "k");
  f.store->begin();
  f.store->set("new", "n");
  f.store->rollback();
  EXPECT_FALSE(f.store->get("new").has_value());
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Rollback, RestoresOverwrittenValues) {
  Fixture f;
  f.store->set("a", "old");
  f.store->begin();
  f.store->set("a", "new");
  f.store->set("a", "newer");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "a"), "old");
}

TEST(Rollback, BringsBackErasedKeys) {
  Fixture f;
  f.store->set("a", "1");
  f.store->begin();
  EXPECT_TRUE(f.store->erase("a"));
  EXPECT_FALSE(f.store->get("a").has_value());
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
}

TEST(Rollback, RestoresTheExpiryAsWellAsTheValue) {
  Fixture f;
  f.store->setWithTtl("a", "1", 10);
  f.store->begin();
  f.store->set("a", "2");
  f.store->rollback();
  ASSERT_TRUE(f.store->ttlRemaining("a").has_value());
  EXPECT_EQ(*f.store->ttlRemaining("a"), 10);
  f.clock->advance(10);
  EXPECT_FALSE(f.store->get("a").has_value());
}

TEST(Rollback, ARestoredExpiryDoesNotGetANewLease) {
  Fixture f;
  f.store->setWithTtl("a", "1", 10);
  f.store->begin();
  f.store->erase("a");
  f.clock->advance(4);
  f.store->rollback();
  EXPECT_EQ(*f.store->ttlRemaining("a"), 6);
}

TEST(Rollback, AKeyThatExpiredDuringTheTransactionStaysExpired) {
  Fixture f;
  f.store->setWithTtl("a", "1", 5);
  f.store->begin();
  f.store->erase("a");
  f.clock->advance(5);
  f.store->rollback();
  EXPECT_FALSE(f.store->get("a").has_value());
  EXPECT_EQ(f.store->size(), 0);
}

TEST(Rollback, UndoesWritesInReverseSoTheOldestStateWins) {
  Fixture f;
  f.store->set("a", "0");
  f.store->begin();
  f.store->set("a", "1");
  f.store->erase("a");
  f.store->setWithTtl("a", "2", 5);
  f.store->set("b", "x");
  f.store->erase("b");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "a"), "0");
  EXPECT_FALSE(f.store->ttlRemaining("a").has_value());
  EXPECT_FALSE(f.store->get("b").has_value());
  EXPECT_EQ(f.store->size(), 1);
}

TEST(Nested, InnerRollbackLeavesTheOuterWritesAlone) {
  Fixture f;
  f.store->begin();
  f.store->set("a", "outer");
  f.store->begin();
  f.store->set("a", "inner");
  f.store->set("b", "inner");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "a"), "outer");
  EXPECT_FALSE(f.store->get("b").has_value());
  EXPECT_EQ(f.store->depth(), 1);
}

TEST(Nested, AnInnerCommitIsUndoneByTheOuterRollback) {
  Fixture f;
  f.store->set("a", "base");
  f.store->begin();
  f.store->begin();
  f.store->set("a", "inner");
  f.store->set("b", "inner");
  f.store->commit();
  EXPECT_EQ(valueOf(*f.store, "a"), "inner");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "a"), "base");
  EXPECT_FALSE(f.store->get("b").has_value());
}

TEST(Nested, AnInnerCommitIsFinalOnlyWhenTheOutermostCommits) {
  Fixture f;
  f.store->begin();
  f.store->begin();
  f.store->set("a", "1");
  f.store->commit();
  f.store->commit();
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
  EXPECT_FALSE(f.store->rollback());
  EXPECT_EQ(valueOf(*f.store, "a"), "1");
}

TEST(Nested, ThreeLevelsUnwindOneAtATime) {
  Fixture f;
  f.store->set("n", "0");
  f.store->begin();
  f.store->set("n", "1");
  f.store->begin();
  f.store->set("n", "2");
  f.store->begin();
  f.store->set("n", "3");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "n"), "2");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "n"), "1");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "n"), "0");
}

TEST(Nested, ARolledBackInnerThenACommittedOuterKeepsOnlyTheOuter) {
  Fixture f;
  f.store->begin();
  f.store->set("a", "outer");
  f.store->begin();
  f.store->set("a", "inner");
  f.store->rollback();
  f.store->commit();
  EXPECT_EQ(valueOf(*f.store, "a"), "outer");
}

TEST(Nested, AStoreIsReusableAfterTheTransactionsClose) {
  Fixture f;
  f.store->begin();
  f.store->set("a", "1");
  f.store->rollback();
  f.store->begin();
  f.store->set("a", "2");
  f.store->commit();
  EXPECT_EQ(valueOf(*f.store, "a"), "2");
  f.store->set("b", "3");
  EXPECT_FALSE(f.store->rollback());
  EXPECT_EQ(valueOf(*f.store, "b"), "3");
}

TEST(Txn, WritesOutsideATransactionAreNeverUndone) {
  Fixture f;
  f.store->set("before", "1");
  f.store->begin();
  f.store->set("during", "2");
  f.store->rollback();
  EXPECT_EQ(valueOf(*f.store, "before"), "1");
}
