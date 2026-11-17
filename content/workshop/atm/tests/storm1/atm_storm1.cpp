#include <map>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using atm::Notes;
using atm::State;
using atm::Status;

class FakeBank : public atm::Bank {
 public:
  bool knowsCard(const std::string& card) const override { return card == "c1" || card == "poor"; }
  bool pinMatches(const std::string& card, const std::string& pin) const override {
    return (card == "c1" && pin == "1111") || (card == "poor" && pin == "0000");
  }
  long long available(const std::string& card) const override { return card == "c1" ? balance_ : card == "poor" ? 30 : 0; }
  void debit(const std::string&, long long amount) override {
    balance_ -= amount;
    ++debits_;
  }
  int debits() const { return debits_; }
  long long balance() const { return balance_; }

 private:
  long long balance_ = 100000;
  int debits_ = 0;
};

long long total(const Notes& notes) {
  long long sum = 0;
  for (const auto& entry : notes) sum += static_cast<long long>(entry.first) * entry.second;
  return sum;
}

int count(const Notes& notes) {
  int n = 0;
  for (const auto& entry : notes) n += entry.second;
  return n;
}

struct Session {
  explicit Session(const Notes& stock, const std::string& card = "c1") : machine(atm::makeFlexibleAtm(bank, stock)) {
    machine->insertCard(card);
    machine->enterPin(card == "c1" ? "1111" : "0000");
  }
  FakeBank bank;
  std::unique_ptr<atm::Atm> machine;
};
}  // namespace

TEST(Flexible, ASearchPaysWhereGreedyGivesUp) {
  Session s(Notes{{50, 1}, {20, 3}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(60, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{20, 3}}));
  EXPECT_EQ(s.bank.balance(), 99940);
  EXPECT_EQ(s.bank.debits(), 1);
}

TEST(Flexible, TheFewestNotesWin) {
  Session s(Notes{{40, 2}, {30, 2}, {10, 5}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(60, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{30, 2}}));
}

TEST(Flexible, ATieGoesToTheLargerDenomination) {
  Session s(Notes{{60, 1}, {50, 2}, {40, 1}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(100, out) == Status::Ok);
  EXPECT_TRUE((out == Notes{{60, 1}, {40, 1}}));
}

TEST(Flexible, AnAmountNoCombinationMakesIsStillRefused) {
  Session s(Notes{{50, 1}, {20, 3}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(55, out) == Status::CannotDispense);
  EXPECT_TRUE(s.machine->withdraw(100, out) == Status::CannotDispense);
  EXPECT_TRUE(out.empty());
  EXPECT_EQ(s.bank.debits(), 0);
  EXPECT_TRUE((s.machine->stock() == Notes{{50, 1}, {20, 3}}));
}

TEST(Flexible, TheChosenNotesLeaveTheMachine) {
  Session s(Notes{{50, 1}, {20, 3}, {10, 2}});
  Notes out;
  s.machine->withdraw(60, out);
  EXPECT_TRUE((out == Notes{{50, 1}, {10, 1}}));
  EXPECT_TRUE((s.machine->stock() == Notes{{20, 3}, {10, 1}}));
}

TEST(Flexible, UsingTheLastNotesLeavesTheMachineOutOfService) {
  Session s(Notes{{20, 3}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(60, out) == Status::Ok);
  EXPECT_TRUE(s.machine->state() == State::Ready);
  s.machine->ejectCard();
  EXPECT_TRUE(s.machine->state() == State::OutOfService);
}

TEST(Flexible, EverythingElseBehavesAsBefore) {
  Session s(Notes{{100, 5}, {20, 5}}, "poor");
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(0, out) == Status::InvalidAmount);
  EXPECT_TRUE(s.machine->withdraw(atm::kMaxWithdrawal + 1, out) == Status::InvalidAmount);
  EXPECT_TRUE(s.machine->withdraw(100, out) == Status::InsufficientFunds);
  EXPECT_TRUE(s.machine->withdraw(25, out) == Status::CannotDispense);
  s.machine->ejectCard();
  EXPECT_TRUE(s.machine->withdraw(20, out) == Status::WrongState);
  s.machine->insertCard("poor");
  s.machine->enterPin("x");
  s.machine->enterPin("x");
  EXPECT_TRUE(s.machine->enterPin("x") == Status::CardRetained);
  EXPECT_TRUE(s.machine->insertCard("poor") == Status::CardBlocked);
}

TEST(Flexible, AnythingThatCanBePaidIsPaidWithTheFewestNotes) {
  // Checked against a brute-force enumeration for every amount from 1 to 260.
  const Notes stock{{30, 3}, {25, 2}, {10, 4}, {5, 3}};
  for (long long amount = 1; amount <= 260; ++amount) {
    bool found = false;
    int bestCount = 0;
    Notes best;
    for (int a = 0; a <= 3; ++a) {
      for (int b = 0; b <= 2; ++b) {
        for (int c = 0; c <= 4; ++c) {
          for (int d = 0; d <= 3; ++d) {
            if (30LL * a + 25LL * b + 10LL * c + 5LL * d != amount) continue;
            const int notes = a + b + c + d;
            const std::vector<int> mine{a, b, c, d};
            const std::vector<int> theirs{best.count(30) ? best[30] : 0, best.count(25) ? best[25] : 0,
                                          best.count(10) ? best[10] : 0, best.count(5) ? best[5] : 0};
            if (!found || notes < bestCount || (notes == bestCount && mine > theirs)) {
              found = true;
              bestCount = notes;
              best.clear();
              if (a) best[30] = a;
              if (b) best[25] = b;
              if (c) best[10] = c;
              if (d) best[5] = d;
            }
          }
        }
      }
    }
    Session s(stock);
    Notes out;
    const Status status = s.machine->withdraw(amount, out);
    if (!found) {
      EXPECT_TRUE(status == Status::CannotDispense);
    } else {
      EXPECT_TRUE(status == Status::Ok);
      EXPECT_TRUE(out == best);
    }
  }
}

TEST(Flexible, ALargeWithdrawalStillAddsUp) {
  Session s(Notes{{100, 200}, {50, 50}, {20, 100}, {10, 100}});
  Notes out;
  EXPECT_TRUE(s.machine->withdraw(9990, out) == Status::Ok);
  EXPECT_EQ(total(out), 9990);
  EXPECT_EQ(count(out), 102);
}
