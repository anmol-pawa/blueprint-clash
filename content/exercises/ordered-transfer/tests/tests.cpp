#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
// Shared by the spies: the order in which locks were taken, and misuse counters.
struct Journal {
  std::vector<int> order;
  int misuse = 0;
};

class SpyLock final : public Lock {
 public:
  SpyLock(Journal& journal, int tag) : journal_(journal), tag_(tag) {}
  void lock() override {
    if (held_) ++journal_.misuse;  // non-recursive
    held_ = true;
    journal_.order.push_back(tag_);
  }
  void unlock() override {
    if (!held_) ++journal_.misuse;
    held_ = false;
  }
  bool try_lock() override {
    if (held_) return false;
    lock();
    return true;
  }
  bool held() const { return held_; }

 private:
  Journal& journal_;
  int tag_;
  bool held_ = false;
};

// Two accounts with ids 1 and 2, lock tags equal to their ids.
struct Bank {
  Journal journal;
  SpyLock lockA{journal, 1};
  SpyLock lockB{journal, 2};
  Account a{1, 100, lockA};
  Account b{2, 50, lockB};
  bool anyHeld() const { return lockA.held() || lockB.held(); }
};
}  // namespace

TEST(Transfer, MovesMoneyBetweenAccounts) {
  Bank bank;
  EXPECT_TRUE(transfer(bank.a, bank.b, 30));
  EXPECT_EQ(bank.a.balance, 70LL);
  EXPECT_EQ(bank.b.balance, 80LL);
}

TEST(Transfer, WorksInTheOtherDirectionToo) {
  Bank bank;
  EXPECT_TRUE(transfer(bank.b, bank.a, 20));
  EXPECT_EQ(bank.a.balance, 120LL);
  EXPECT_EQ(bank.b.balance, 30LL);
}

TEST(Transfer, InsufficientFundsChangesNothing) {
  Bank bank;
  EXPECT_FALSE(transfer(bank.b, bank.a, 51));
  EXPECT_EQ(bank.a.balance, 100LL);
  EXPECT_EQ(bank.b.balance, 50LL);
}

TEST(Transfer, ExactBalanceIsAllowed) {
  Bank bank;
  EXPECT_TRUE(transfer(bank.b, bank.a, 50));
  EXPECT_EQ(bank.b.balance, 0LL);
}

TEST(Transfer, NonPositiveAmountIsRejected) {
  Bank bank;
  EXPECT_FALSE(transfer(bank.a, bank.b, 0));
  EXPECT_FALSE(transfer(bank.a, bank.b, -5));
  EXPECT_EQ(bank.a.balance, 100LL);
  EXPECT_EQ(bank.b.balance, 50LL);
}

TEST(Transfer, SelfTransferIsRejectedWithoutLockingTwice) {
  Bank bank;
  EXPECT_FALSE(transfer(bank.a, bank.a, 10));
  EXPECT_EQ(bank.journal.misuse, 0);
  EXPECT_FALSE(bank.anyHeld());
  EXPECT_EQ(bank.a.balance, 100LL);
}

TEST(Locking, BothLocksAreTakenOncePerTransfer) {
  Bank bank;
  transfer(bank.a, bank.b, 10);
  EXPECT_EQ(bank.journal.order.size(), static_cast<std::size_t>(2));
  EXPECT_EQ(bank.journal.misuse, 0);
}

TEST(Locking, LowerIdIsAlwaysLockedFirstWhenMovingUp) {
  Bank bank;
  transfer(bank.a, bank.b, 10);  // from id 1 to id 2
  EXPECT_TRUE(bank.journal.order == (std::vector<int>{1, 2}));
}

TEST(Locking, LowerIdIsAlwaysLockedFirstWhenMovingDown) {
  Bank bank;
  transfer(bank.b, bank.a, 10);  // from id 2 to id 1: this is the AB-BA trap
  EXPECT_TRUE(bank.journal.order == (std::vector<int>{1, 2}));
}

TEST(Locking, OrderHoldsEvenWhenTheTransferFails) {
  Bank bank;
  transfer(bank.b, bank.a, 9999);  // insufficient funds
  EXPECT_TRUE(bank.journal.order == (std::vector<int>{1, 2}));
}

TEST(Locking, EveryPathReleasesBothLocks) {
  Bank bank;
  transfer(bank.a, bank.b, 10);
  EXPECT_FALSE(bank.anyHeld());
  transfer(bank.a, bank.b, 9999);
  EXPECT_FALSE(bank.anyHeld());
  transfer(bank.a, bank.b, -1);
  EXPECT_FALSE(bank.anyHeld());
  EXPECT_EQ(bank.journal.misuse, 0);
}

TEST(Locking, RejectedAmountDoesNotNeedToLockAnything) {
  Bank bank;
  transfer(bank.a, bank.b, 0);
  EXPECT_FALSE(bank.anyHeld());
  EXPECT_EQ(bank.journal.misuse, 0);
}
