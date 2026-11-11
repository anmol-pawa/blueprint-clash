#include <initializer_list>

#include "api_storm1.h"
#include "bp_test.h"

using vend::Status;

namespace {
std::unique_ptr<vend::ServiceableMachine> machine() {
  auto m = vend::makeServiceableMachine();
  m->addSlot("A1", "Chips", 125, 2);
  m->addSlot("A2", "Gum", 65, 1);
  return m;
}

void insert(vend::VendingMachine& m, std::initializer_list<int> coins) {
  for (int c : coins) m.insertCoin(c);
}
}  // namespace

TEST(Maintenance, EnteringRefundsCredit) {
  auto m = machine();
  insert(*m, {100, 25});
  EXPECT_EQ(m->enterMaintenance(), 125);
  EXPECT_EQ(m->creditCents(), 0);
  EXPECT_TRUE(m->inMaintenance());
}

TEST(Maintenance, EnteringWithNoCreditRefundsZero) {
  auto m = machine();
  EXPECT_EQ(m->enterMaintenance(), 0);
  EXPECT_TRUE(m->inMaintenance());
}

TEST(Maintenance, CoinsAreRejected) {
  auto m = machine();
  m->enterMaintenance();
  EXPECT_EQ(m->insertCoin(25), Status::OutOfService);
  EXPECT_EQ(m->creditCents(), 0);
}

TEST(Maintenance, SelectIsRefused) {
  auto m = machine();
  insert(*m, {100, 100});
  m->enterMaintenance();
  auto sale = m->select("A1");
  EXPECT_EQ(sale.status, Status::OutOfService);
  EXPECT_EQ(m->stockOf("A1"), 2);
}

TEST(Maintenance, OutOfServiceWinsOverInsertCoinFirst) {
  auto m = machine();
  m->enterMaintenance();
  EXPECT_EQ(m->select("A1").status, Status::OutOfService);
  EXPECT_EQ(m->select("nope").status, Status::OutOfService);
}

TEST(Maintenance, CancelReturnsZero) {
  auto m = machine();
  insert(*m, {100});
  m->enterMaintenance();
  EXPECT_EQ(m->cancel(), 0);
}

TEST(Maintenance, StockingStillWorks) {
  auto m = machine();
  m->enterMaintenance();
  EXPECT_EQ(m->restock("A2", 5), Status::Ok);
  EXPECT_EQ(m->stockOf("A2"), 6);
  EXPECT_EQ(m->addSlot("C1", "Nuts", 90, 4), Status::Ok);
  EXPECT_EQ(m->stockOf("C1"), 4);
}

TEST(Maintenance, EnteringTwiceIsHarmless) {
  auto m = machine();
  insert(*m, {100});
  EXPECT_EQ(m->enterMaintenance(), 100);
  EXPECT_EQ(m->enterMaintenance(), 0);
  EXPECT_TRUE(m->inMaintenance());
}

TEST(Maintenance, LeavingResumesSales) {
  auto m = machine();
  insert(*m, {100});
  m->enterMaintenance();
  m->leaveMaintenance();
  EXPECT_TRUE(!m->inMaintenance());
  EXPECT_EQ(m->creditCents(), 0);
  EXPECT_EQ(m->select("A2").status, Status::InsertCoinFirst);
  insert(*m, {100});
  auto sale = m->select("A2");
  EXPECT_EQ(sale.status, Status::Ok);
  EXPECT_EQ(sale.changeCents, 35);
}

TEST(Maintenance, LeavingWhenNotInMaintenanceKeepsCredit) {
  auto m = machine();
  insert(*m, {100});
  m->leaveMaintenance();
  EXPECT_EQ(m->creditCents(), 100);
  EXPECT_EQ(m->select("A2").status, Status::Ok);
}

TEST(Maintenance, NormalSalesBeforeMaintenanceStillWork) {
  auto m = machine();
  insert(*m, {100, 100});
  auto sale = m->select("A1");
  EXPECT_EQ(sale.status, Status::Ok);
  EXPECT_EQ(sale.changeCents, 75);
  EXPECT_EQ(m->cancel(), 0);
}
