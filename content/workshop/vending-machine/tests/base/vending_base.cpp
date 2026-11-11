#include <initializer_list>

#include "api.h"
#include "bp_test.h"

using vend::Status;

namespace {
std::unique_ptr<vend::VendingMachine> machine() {
  auto m = vend::makeVendingMachine();
  m->addSlot("A1", "Chips", 125, 2);
  m->addSlot("A2", "Gum", 65, 1);
  m->addSlot("B1", "Water", 150, 0);  // sold out
  return m;
}

void insert(vend::VendingMachine& m, std::initializer_list<int> coins) {
  for (int c : coins) m.insertCoin(c);
}
}  // namespace

TEST(Slots, DuplicateSlotIsRefused) {
  auto m = machine();
  EXPECT_EQ(m->addSlot("A1", "Other", 50, 9), Status::DuplicateSlot);
  EXPECT_EQ(m->stockOf("A1"), 2);
}

TEST(Slots, InvalidArgumentsAreRefused) {
  auto m = machine();
  EXPECT_EQ(m->addSlot("C1", "Free", 0, 3), Status::InvalidArgument);
  EXPECT_EQ(m->addSlot("C2", "Negative", -5, 3), Status::InvalidArgument);
  EXPECT_EQ(m->addSlot("C3", "Debt", 50, -1), Status::InvalidArgument);
  EXPECT_EQ(m->stockOf("C1"), -1);
  EXPECT_EQ(m->stockOf("C3"), -1);
}

TEST(Slots, RestockAddsUnits) {
  auto m = machine();
  EXPECT_EQ(m->restock("A2", 3), Status::Ok);
  EXPECT_EQ(m->stockOf("A2"), 4);
  EXPECT_EQ(m->restock("B1", 5), Status::Ok);
  EXPECT_EQ(m->stockOf("B1"), 5);
}

TEST(Slots, RestockRefusals) {
  auto m = machine();
  EXPECT_EQ(m->restock("Z9", 3), Status::UnknownSlot);
  EXPECT_EQ(m->restock("A1", 0), Status::InvalidArgument);
  EXPECT_EQ(m->restock("A1", -2), Status::InvalidArgument);
  EXPECT_EQ(m->stockOf("A1"), 2);
}

TEST(Slots, StockOfUnknownSlotIsMinusOne) {
  auto m = machine();
  EXPECT_EQ(m->stockOf("nope"), -1);
}

TEST(Coins, ValidCoinsAddUp) {
  auto m = machine();
  EXPECT_EQ(m->insertCoin(5), Status::Ok);
  EXPECT_EQ(m->insertCoin(10), Status::Ok);
  EXPECT_EQ(m->insertCoin(25), Status::Ok);
  EXPECT_EQ(m->insertCoin(100), Status::Ok);
  EXPECT_EQ(m->creditCents(), 140);
}

TEST(Coins, InvalidCoinIsRejectedAndCreditUnchanged) {
  auto m = machine();
  EXPECT_EQ(m->insertCoin(7), Status::InvalidCoin);
  EXPECT_EQ(m->creditCents(), 0);
  insert(*m, {25});
  EXPECT_EQ(m->insertCoin(50), Status::InvalidCoin);
  EXPECT_EQ(m->insertCoin(0), Status::InvalidCoin);
  EXPECT_EQ(m->insertCoin(-5), Status::InvalidCoin);
  EXPECT_EQ(m->creditCents(), 25);
}

TEST(Idle, SelectWithoutCreditAsksForCoin) {
  auto m = machine();
  EXPECT_EQ(m->select("A1").status, Status::InsertCoinFirst);
  EXPECT_EQ(m->select("B1").status, Status::InsertCoinFirst);
  EXPECT_EQ(m->select("nope").status, Status::InsertCoinFirst);
  EXPECT_EQ(m->stockOf("A1"), 2);
  EXPECT_EQ(m->creditCents(), 0);
}

TEST(Idle, CancelWithNothingReturnsZero) {
  auto m = machine();
  EXPECT_EQ(m->cancel(), 0);
  EXPECT_EQ(m->creditCents(), 0);
}

TEST(Selling, ExactPaymentDispenses) {
  auto m = machine();
  insert(*m, {25, 25, 10, 5});
  auto sale = m->select("A2");
  EXPECT_EQ(sale.status, Status::Ok);
  EXPECT_EQ(sale.item, "Gum");
  EXPECT_EQ(sale.changeCents, 0);
  EXPECT_EQ(m->creditCents(), 0);
  EXPECT_EQ(m->stockOf("A2"), 0);
}

TEST(Selling, OverpaymentReturnsChange) {
  auto m = machine();
  insert(*m, {100, 100});
  auto sale = m->select("A1");
  EXPECT_EQ(sale.status, Status::Ok);
  EXPECT_EQ(sale.item, "Chips");
  EXPECT_EQ(sale.changeCents, 75);
  EXPECT_EQ(m->creditCents(), 0);
  EXPECT_EQ(m->stockOf("A1"), 1);
}

TEST(Selling, CreditIsClearedAfterSale) {
  auto m = machine();
  insert(*m, {100, 100});
  m->select("A1");
  EXPECT_EQ(m->select("A1").status, Status::InsertCoinFirst);
  EXPECT_EQ(m->cancel(), 0);
  EXPECT_EQ(m->stockOf("A1"), 1);
}

TEST(Selling, InsufficientFundsKeepsCredit) {
  auto m = machine();
  insert(*m, {100});
  auto sale = m->select("A1");
  EXPECT_EQ(sale.status, Status::InsufficientFunds);
  EXPECT_EQ(sale.changeCents, 0);
  EXPECT_EQ(m->creditCents(), 100);
  EXPECT_EQ(m->stockOf("A1"), 2);
  m->insertCoin(25);
  auto again = m->select("A1");
  EXPECT_EQ(again.status, Status::Ok);
  EXPECT_EQ(again.changeCents, 0);
}

TEST(Selling, SoldOutKeepsCredit) {
  auto m = machine();
  insert(*m, {100, 100});
  EXPECT_EQ(m->select("B1").status, Status::SoldOut);
  EXPECT_EQ(m->creditCents(), 200);
  EXPECT_EQ(m->stockOf("B1"), 0);
  auto other = m->select("A2");
  EXPECT_EQ(other.status, Status::Ok);
  EXPECT_EQ(other.changeCents, 135);
}

TEST(Selling, UnknownSlotKeepsCredit) {
  auto m = machine();
  insert(*m, {100});
  EXPECT_EQ(m->select("Z9").status, Status::UnknownSlot);
  EXPECT_EQ(m->creditCents(), 100);
}

TEST(Selling, SoldOutIsCheckedBeforePrice) {
  auto m = machine();
  insert(*m, {5});  // far too little for B1, but B1 is sold out: SoldOut wins over InsufficientFunds
  EXPECT_EQ(m->select("B1").status, Status::SoldOut);
  EXPECT_EQ(m->select("A1").status, Status::InsufficientFunds);
}

TEST(Selling, LastUnitSellsOutThenRefuses) {
  auto m = machine();
  insert(*m, {100});
  EXPECT_EQ(m->select("A2").status, Status::Ok);
  insert(*m, {100});
  EXPECT_EQ(m->select("A2").status, Status::SoldOut);
  EXPECT_EQ(m->creditCents(), 100);
  EXPECT_EQ(m->stockOf("A2"), 0);
}

TEST(Selling, RestockedSlotSellsAgain) {
  auto m = machine();
  m->restock("B1", 1);
  insert(*m, {100, 100});
  auto sale = m->select("B1");
  EXPECT_EQ(sale.status, Status::Ok);
  EXPECT_EQ(sale.changeCents, 50);
}

TEST(Cancel, RefundsAllCredit) {
  auto m = machine();
  insert(*m, {100, 25});
  EXPECT_EQ(m->cancel(), 125);
  EXPECT_EQ(m->creditCents(), 0);
  EXPECT_EQ(m->cancel(), 0);
  EXPECT_EQ(m->select("A1").status, Status::InsertCoinFirst);
}

TEST(Cancel, CanBuyAfterCancel) {
  auto m = machine();
  insert(*m, {25});
  m->cancel();
  insert(*m, {100, 25});
  auto sale = m->select("A1");
  EXPECT_EQ(sale.status, Status::Ok);
  EXPECT_EQ(sale.changeCents, 0);
}
