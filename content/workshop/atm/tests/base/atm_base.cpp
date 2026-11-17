#include <map>
#include <string>

#include "api.h"
#include "bp_test.h"

namespace {
using atm::Notes;
using atm::State;
using atm::Status;

// A fake bank with three customers: "c1" (pin 1111, 1000 in the account), "c2" (pin 2222, 5000) and "poor" (pin 0000, 30).
class FakeBank : public atm::Bank {
 public:
  FakeBank() {
    pins_ = {{"c1", "1111"}, {"c2", "2222"}, {"poor", "0000"}};
    balances_ = {{"c1", 1000}, {"c2", 5000}, {"poor", 30}};
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
  void debit(const std::string& card, long long amount) override {
    balances_[card] -= amount;
    ++debits_;
  }
  int debits() const { return debits_; }
  long long balance(const std::string& card) const { return available(card); }

 private:
  std::map<std::string, std::string> pins_;
  std::map<std::string, long long> balances_;
  int debits_ = 0;
};

Notes standardStock() { return Notes{{100, 5}, {50, 5}, {20, 10}, {10, 10}}; }

long long total(const Notes& notes) {
  long long sum = 0;
  for (const auto& entry : notes) sum += static_cast<long long>(entry.first) * entry.second;
  return sum;
}

// A machine with the standard stock and a customer who has typed the right PIN.
struct Session {
  explicit Session(const std::string& card = "c1", const Notes& stock = standardStock()) : machine(atm::makeAtm(bank, stock)) {
    machine->insertCard(card);
    machine->enterPin(card == "c1" ? "1111" : card == "c2" ? "2222" : "0000");
  }
  FakeBank bank;
  std::unique_ptr<atm::Atm> machine;
};
}  // namespace

TEST(Session, AMachineWaitsForACard) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  EXPECT_TRUE(machine->state() == State::Idle);
}

TEST(Session, ACardAsksForThePin) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  EXPECT_TRUE(machine->insertCard("c1") == Status::Ok);
  EXPECT_TRUE(machine->state() == State::AwaitingPin);
}

TEST(Session, AnUnknownCardIsHandedBackAtOnce) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  EXPECT_TRUE(machine->insertCard("ghost") == Status::UnknownCard);
  EXPECT_TRUE(machine->state() == State::Idle);
  EXPECT_TRUE(machine->insertCard("c1") == Status::Ok);
}

TEST(Session, NothingWorksBeforeThePinIsAccepted) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  Notes out;
  EXPECT_TRUE(machine->enterPin("1111") == Status::WrongState);
  EXPECT_TRUE(machine->withdraw(100, out) == Status::WrongState);
  EXPECT_TRUE(machine->ejectCard() == Status::WrongState);
  machine->insertCard("c1");
  EXPECT_TRUE(machine->withdraw(100, out) == Status::WrongState);
  EXPECT_TRUE(out.empty());
  EXPECT_EQ(bank.debits(), 0);
  EXPECT_EQ(total(machine->stock()), total(standardStock()));
}

TEST(Session, ACardAlreadyInsideCannotBeInsertedAgain) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  EXPECT_TRUE(machine->insertCard("c2") == Status::WrongState);
  EXPECT_TRUE(machine->state() == State::AwaitingPin);
  machine->enterPin("1111");
  EXPECT_TRUE(machine->insertCard("c2") == Status::WrongState);
  EXPECT_TRUE(machine->state() == State::Ready);
}

TEST(Session, EjectingReturnsToIdleFromEitherStage) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  EXPECT_TRUE(machine->ejectCard() == Status::Ok);
  EXPECT_TRUE(machine->state() == State::Idle);
  machine->insertCard("c1");
  machine->enterPin("1111");
  EXPECT_TRUE(machine->ejectCard() == Status::Ok);
  EXPECT_TRUE(machine->state() == State::Idle);
  EXPECT_TRUE(machine->insertCard("c2") == Status::Ok);
}

TEST(Session, AfterWithdrawingTheCustomerStaysReady) {
  Session s;
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(100, out) == Status::Ok);
  EXPECT_TRUE(s.machine->state() == State::Ready);
  EXPECT_TRUE(s.machine->withdraw(50, out) == Status::Ok);
  EXPECT_EQ(s.bank.balance("c1"), 850);
}

TEST(Session, AMachineWithoutNotesIsOutOfService) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, Notes{{100, 0}, {50, 0}});
  EXPECT_TRUE(machine->state() == State::OutOfService);
  EXPECT_TRUE(machine->insertCard("c1") == Status::OutOfService);
  EXPECT_TRUE(machine->state() == State::OutOfService);
  EXPECT_TRUE(machine->ejectCard() == Status::WrongState);
}

TEST(Session, OutOfServiceIsReportedBeforeAnUnknownCard) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, Notes{{100, 0}});
  EXPECT_TRUE(machine->insertCard("ghost") == Status::OutOfService);
}

TEST(Session, ADrainedMachineGoesOutOfServiceWhenTheCustomerLeaves) {
  Session s("c1", Notes{{100, 1}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(100, out) == Status::Ok);
  EXPECT_TRUE(s.machine->state() == State::Ready);
  EXPECT_TRUE(s.machine->ejectCard() == Status::Ok);
  EXPECT_TRUE(s.machine->state() == State::OutOfService);
  EXPECT_TRUE(s.machine->insertCard("c2") == Status::OutOfService);
}

TEST(Pin, TheRightPinOpensTheSession) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c2");
  EXPECT_TRUE(machine->enterPin("2222") == Status::Ok);
  EXPECT_TRUE(machine->state() == State::Ready);
}

TEST(Pin, AWrongPinKeepsTheCardInside) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  EXPECT_TRUE(machine->enterPin("9999") == Status::WrongPin);
  EXPECT_TRUE(machine->state() == State::AwaitingPin);
  EXPECT_TRUE(machine->enterPin("1111") == Status::Ok);
  EXPECT_TRUE(machine->state() == State::Ready);
}

TEST(Pin, TheThirdWrongPinInARowKeepsTheCard) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  EXPECT_TRUE(machine->enterPin("1") == Status::WrongPin);
  EXPECT_TRUE(machine->enterPin("2") == Status::WrongPin);
  EXPECT_TRUE(machine->enterPin("3") == Status::CardRetained);
  EXPECT_TRUE(machine->state() == State::Idle);
  EXPECT_TRUE(machine->insertCard("c1") == Status::CardBlocked);
  EXPECT_TRUE(machine->state() == State::Idle);
}

TEST(Pin, WrongPinsAreCountedAcrossVisits) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  machine->enterPin("x");
  machine->ejectCard();
  machine->insertCard("c1");
  machine->enterPin("x");
  machine->ejectCard();
  machine->insertCard("c1");
  EXPECT_TRUE(machine->enterPin("x") == Status::CardRetained);
}

TEST(Pin, ARightPinClearsTheCount) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  machine->enterPin("x");
  machine->enterPin("x");
  EXPECT_TRUE(machine->enterPin("1111") == Status::Ok);
  machine->ejectCard();
  machine->insertCard("c1");
  EXPECT_TRUE(machine->enterPin("x") == Status::WrongPin);
  EXPECT_TRUE(machine->enterPin("x") == Status::WrongPin);
  EXPECT_TRUE(machine->enterPin("x") == Status::CardRetained);
}

TEST(Pin, CountsAreKeptPerCard) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  machine->enterPin("x");
  machine->enterPin("x");
  machine->ejectCard();
  machine->insertCard("c2");
  EXPECT_TRUE(machine->enterPin("x") == Status::WrongPin);
  EXPECT_TRUE(machine->enterPin("x") == Status::WrongPin);
  EXPECT_TRUE(machine->enterPin("2222") == Status::Ok);
}

TEST(Pin, ARetainedCardDoesNotBlockOtherCards) {
  FakeBank bank;
  auto machine = atm::makeAtm(bank, standardStock());
  machine->insertCard("c1");
  machine->enterPin("x");
  machine->enterPin("x");
  machine->enterPin("x");
  EXPECT_TRUE(machine->insertCard("c2") == Status::Ok);
  EXPECT_TRUE(machine->enterPin("2222") == Status::Ok);
}

TEST(Withdraw, TheLargestNotesGoFirst) {
  Session s;
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(370, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{100, 3}, {50, 1}, {20, 1}}));
}

TEST(Withdraw, TheBankIsDebitedExactlyOnce) {
  Session s;
  Notes out;
  s.machine->withdraw(270, out);
  EXPECT_EQ(s.bank.debits(), 1);
  EXPECT_EQ(s.bank.balance("c1"), 730);
}

TEST(Withdraw, TheNotesLeaveTheMachine) {
  Session s;
  Notes out;
  s.machine->withdraw(370, out);
  EXPECT_TRUE((s.machine->stock() == Notes{{100, 2}, {50, 4}, {20, 9}, {10, 10}}));
}

TEST(Withdraw, TheStockLimitsWhatCanBeTaken) {
  Session s("c2", Notes{{100, 1}, {50, 2}, {20, 5}, {10, 5}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(250, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{100, 1}, {50, 2}, {20, 2}, {10, 1}}));
  EXPECT_EQ(total(out), 250);
}

TEST(Withdraw, NoDenominationIsReportedWithACountOfZero) {
  Session s;
  Notes out;
  s.machine->withdraw(100, out);
  EXPECT_EQ(out.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(out.begin()->second, 1);
  EXPECT_TRUE((s.machine->stock() == Notes{{100, 4}, {50, 5}, {20, 10}, {10, 10}}));
}

TEST(Withdraw, TheAmountMustBeBetweenOneAndTheLimit) {
  Session s("c2");
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(0, out) == Status::InvalidAmount);
  EXPECT_TRUE(s.machine->withdraw(-10, out) == Status::InvalidAmount);
  EXPECT_TRUE(s.machine->withdraw(atm::kMaxWithdrawal + 10, out) == Status::InvalidAmount);
  EXPECT_EQ(s.bank.debits(), 0);
}

TEST(Withdraw, TheAccountMustHoldTheAmount) {
  Session s("poor");
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(40, out) == Status::InsufficientFunds);
  EXPECT_TRUE(out.empty());
  EXPECT_EQ(s.bank.debits(), 0);
  EXPECT_TRUE(s.machine->withdraw(30, out) == Status::Ok);
  EXPECT_EQ(s.bank.balance("poor"), 0);
}

TEST(Withdraw, AnAmountTheNotesCannotMakeIsRefused) {
  Session s;
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(15, out) == Status::CannotDispense);
  EXPECT_TRUE(out.empty());
  EXPECT_EQ(s.bank.debits(), 0);
  EXPECT_EQ(s.bank.balance("c1"), 1000);
  EXPECT_TRUE(s.machine->state() == State::Ready);
}

TEST(Withdraw, ARefusedWithdrawalChangesNothing) {
  Session s("c1", Notes{{100, 1}, {50, 1}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(200, out) == Status::CannotDispense);
  EXPECT_TRUE((s.machine->stock() == Notes{{100, 1}, {50, 1}}));
  EXPECT_EQ(s.bank.debits(), 0);
  EXPECT_EQ(s.bank.balance("c1"), 1000);
  EXPECT_TRUE(s.machine->withdraw(150, out) == Status::Ok);
}

TEST(Withdraw, ChecksRunInTheDocumentedOrder) {
  Session s("poor");
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(0, out) == Status::InvalidAmount);
  EXPECT_TRUE(s.machine->withdraw(45, out) == Status::InsufficientFunds);
  Session rich("c2");
  EXPECT_TRUE(rich.machine->withdraw(45, out) == Status::CannotDispense);
}

TEST(Withdraw, GreedyGivesUpEvenIfAnotherCombinationWouldPay) {
  Session s("c1", Notes{{50, 1}, {20, 3}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(60, out) == Status::CannotDispense);
  EXPECT_TRUE(s.machine->withdraw(50, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{50, 1}}));
}
