#include <map>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using atm::Notes;
using atm::State;
using atm::Status;

class FakeBank : public atm::Bank {
 public:
  FakeBank() {
    pins_ = {{"c1", "1111"}, {"c2", "2222"}, {"poor", "0000"}};
    balances_ = {{"c1", 5000}, {"c2", 5000}, {"poor", 30}};
  }
  bool knowsCard(const std::string& card) const override { return pins_.count(card) > 0; }
  bool pinMatches(const std::string& card, const std::string& pin) const override {
    const auto found = pins_.find(card);
    return found != pins_.end() && found->second == pin;
  }
  long long available(const std::string& card) const override {
    const auto found = balances_.find(card);
    return found == balances_.end() ? 0 : found->second;
  }
  void debit(const std::string& card, long long amount) override { balances_[card] -= amount; }
  long long balance(const std::string& card) const { return available(card); }

 private:
  std::map<std::string, std::string> pins_;
  std::map<std::string, long long> balances_;
};

Notes stock() { return Notes{{100, 50}, {50, 50}, {20, 50}, {10, 50}}; }

std::string pinOf(const std::string& card) { return card == "c1" ? "1111" : card == "c2" ? "2222" : "0000"; }

struct Desk {
  Desk() : machine(atm::makeLimitedAtm(bank, stock(), 500)) {}
  void visit(const std::string& card) {
    machine->insertCard(card);
    machine->enterPin(pinOf(card));
  }
  Status take(long long amount) {
    Notes out;
    return machine->withdraw(amount, out);
  }
  FakeBank bank;
  std::unique_ptr<atm::LimitedAtm> machine;
};
}  // namespace

TEST(Limit, WithdrawalsUpToTheLimitSucceed) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(300) == Status::Ok);
  EXPECT_TRUE(d.take(200) == Status::Ok);
  EXPECT_TRUE(d.take(10) == Status::DailyLimitExceeded);
  EXPECT_EQ(d.bank.balance("c1"), 4500);
}

TEST(Limit, ExactlyTheLimitIsAllowedAndOneNoteMoreIsNot) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(510) == Status::DailyLimitExceeded);
  EXPECT_TRUE(d.take(500) == Status::Ok);
  EXPECT_TRUE(d.take(10) == Status::DailyLimitExceeded);
}

TEST(Limit, EachCardHasItsOwnTotal) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(500) == Status::Ok);
  d.machine->ejectCard();
  d.visit("c2");
  EXPECT_TRUE(d.take(300) == Status::Ok);
  EXPECT_TRUE(d.take(300) == Status::DailyLimitExceeded);
}

TEST(Limit, TheTotalSurvivesEjectingTheCard) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(400) == Status::Ok);
  d.machine->ejectCard();
  d.visit("c1");
  EXPECT_TRUE(d.take(200) == Status::DailyLimitExceeded);
  EXPECT_TRUE(d.take(100) == Status::Ok);
}

TEST(Limit, RefusedWithdrawalsDoNotCount) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(400) == Status::Ok);
  EXPECT_TRUE(d.take(200) == Status::DailyLimitExceeded);
  EXPECT_TRUE(d.take(15) == Status::CannotDispense);
  EXPECT_TRUE(d.take(0) == Status::InvalidAmount);
  EXPECT_TRUE(d.take(100) == Status::Ok);
}

TEST(Limit, ANewDayStartsFromZero) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(500) == Status::Ok);
  EXPECT_TRUE(d.take(10) == Status::DailyLimitExceeded);
  d.machine->endOfDay();
  EXPECT_TRUE(d.take(500) == Status::Ok);
}

TEST(Limit, TheLimitIsCheckedAfterTheAmountAndBeforeTheFunds) {
  Desk d;
  d.visit("poor");
  EXPECT_TRUE(d.take(20000) == Status::InvalidAmount);
  EXPECT_TRUE(d.take(600) == Status::DailyLimitExceeded);
  EXPECT_TRUE(d.take(100) == Status::InsufficientFunds);
}

TEST(Limit, TheLimitIsCheckedBeforeTheNotes) {
  Desk d;
  d.visit("c1");
  EXPECT_TRUE(d.take(490) == Status::Ok);
  EXPECT_TRUE(d.take(15) == Status::DailyLimitExceeded);
  EXPECT_TRUE(d.take(5) == Status::CannotDispense);
}

TEST(Limit, ACardAtItsLimitCanStillComeAndGo) {
  Desk d;
  d.visit("c1");
  d.take(500);
  EXPECT_TRUE(d.machine->ejectCard() == Status::Ok);
  EXPECT_TRUE(d.machine->insertCard("c1") == Status::Ok);
  EXPECT_TRUE(d.machine->enterPin("1111") == Status::Ok);
  EXPECT_TRUE(d.machine->state() == State::Ready);
}

TEST(Limit, NotesAreStillChosenGreedily) {
  Desk d;
  d.visit("c1");
  Notes out;
  EXPECT_TRUE(d.machine->withdraw(370, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{100, 3}, {50, 1}, {20, 1}}));
  EXPECT_TRUE(d.machine->withdraw(130, out) == Status::Ok);
}

TEST(Limit, ARetainedCardStaysRetainedAfterTheNightPasses) {
  Desk d;
  d.machine->insertCard("c1");
  d.machine->enterPin("x");
  d.machine->enterPin("x");
  d.machine->enterPin("x");
  d.machine->endOfDay();
  EXPECT_TRUE(d.machine->insertCard("c1") == Status::CardBlocked);
}
