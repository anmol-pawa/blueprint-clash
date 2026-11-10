#include <memory>
#include <set>
#include <string>
#include <utility>
#include "bp_test.h"
#include "solution.h"

namespace {
std::unique_ptr<Approver> limit(const char* role, long long cents) {
  return std::make_unique<LimitApprover>(role, cents);
}

// manager (1,000.00) -> director (5,000.00) -> vp (20,000.00)
std::unique_ptr<Approver> standardChain() {
  auto head = limit("manager", 100000);
  head->then(limit("director", 500000)).then(limit("vp", 2000000));
  return head;
}

// A new kind of approver, written without touching Approver or LimitApprover.
class BlocklistApprover final : public Approver {
 public:
  explicit BlocklistApprover(std::set<std::string> blocked) : blocked_(std::move(blocked)) {}

 protected:
  bool canApprove(const Expense& e) const override { return blocked_.count(e.employee) > 0; }
  std::string role() const override { return "compliance-block"; }

 private:
  std::set<std::string> blocked_;
};

// Counts how many times it is consulted.
class Spy final : public Approver {
 public:
  Spy(bool answer, int* calls) : answer_(answer), calls_(calls) {}

 protected:
  bool canApprove(const Expense&) const override {
    ++*calls_;
    return answer_;
  }
  std::string role() const override { return answer_ ? "spy-yes" : "spy-no"; }

 private:
  bool answer_;
  int* calls_;
};
}  // namespace

TEST(Chain, SmallExpenseIsApprovedByTheFirstLink) {
  auto chain = standardChain();
  EXPECT_EQ(chain->handle({"ann", 25000}), std::string("manager"));
}

TEST(Chain, LargerExpensesMoveUpTheChain) {
  auto chain = standardChain();
  EXPECT_EQ(chain->handle({"ann", 300000}), std::string("director"));
  EXPECT_EQ(chain->handle({"ann", 1500000}), std::string("vp"));
}

TEST(Chain, LimitsAreInclusive) {
  auto chain = standardChain();
  EXPECT_EQ(chain->handle({"ann", 100000}), std::string("manager"));
  EXPECT_EQ(chain->handle({"ann", 100001}), std::string("director"));
  EXPECT_EQ(chain->handle({"ann", 2000000}), std::string("vp"));
}

TEST(Chain, FallingOffTheEndIsRejected) {
  auto chain = standardChain();
  EXPECT_EQ(chain->handle({"ann", 2000001}), std::string("rejected"));
}

TEST(Chain, NonPositiveAmountsAreNobodysToApprove) {
  auto chain = standardChain();
  EXPECT_EQ(chain->handle({"ann", 0}), std::string("rejected"));
  EXPECT_EQ(chain->handle({"ann", -500}), std::string("rejected"));
}

TEST(Chain, ASingleLinkWithNoSuccessorRejectsWhatItCannotApprove) {
  LimitApprover only("manager", 1000);
  EXPECT_EQ(only.handle({"ann", 1000}), std::string("manager"));
  EXPECT_EQ(only.handle({"ann", 1001}), std::string("rejected"));
}

TEST(Chain, StopsAtTheFirstLinkThatApproves) {
  int first = 0, second = 0, third = 0;
  auto head = std::make_unique<Spy>(false, &first);
  head->then(std::make_unique<Spy>(true, &second)).then(std::make_unique<Spy>(true, &third));
  EXPECT_EQ(head->handle({"ann", 1}), std::string("spy-yes"));
  EXPECT_EQ(first, 1);
  EXPECT_EQ(second, 1);
  EXPECT_EQ(third, 0);  // never consulted
}

TEST(Chain, ThenReturnsTheAppendedLinkSoChainsKeepGrowing) {
  int a = 0, b = 0, c = 0;
  auto head = std::make_unique<Spy>(false, &a);
  head->then(std::make_unique<Spy>(false, &b)).then(std::make_unique<Spy>(false, &c));
  EXPECT_EQ(head->handle({"ann", 1}), std::string("rejected"));
  EXPECT_EQ(a, 1);
  EXPECT_EQ(b, 1);  // b stayed in the chain after c was appended to it
  EXPECT_EQ(c, 1);
}

TEST(Chain, NewApproverKindsPlugInWithoutEditingTheOldOnes) {
  auto head = std::make_unique<BlocklistApprover>(std::set<std::string>{"mallory"});
  head->then(limit("manager", 100000));
  EXPECT_EQ(head->handle({"mallory", 500}), std::string("compliance-block"));
  EXPECT_EQ(head->handle({"ann", 500}), std::string("manager"));
}

TEST(Chain, OrderOfLinksDecidesWhoAnswers) {
  auto head = limit("vp", 2000000);
  head->then(limit("manager", 100000));
  EXPECT_EQ(head->handle({"ann", 100}), std::string("vp"));  // the vp is first and covers it
}
