#include <cmath>
#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
long long centsSeen(const LegacyBank& bank) { return std::llround(bank.lastAmount() * 100.0); }
}  // namespace

TEST(Adapter, ApprovedPaymentConvertsCentsToDollars) {
  LegacyBank bank(1000.0);
  LegacyBankAdapter gateway(bank);
  EXPECT_TRUE(gateway.charge(1999, "USD") == ChargeStatus::Approved);
  EXPECT_EQ(bank.calls(), 1);
  EXPECT_EQ(centsSeen(bank), 1999LL);
  EXPECT_EQ(bank.lastCurrency(), std::string("USD"));
}

TEST(Adapter, SmallAmountsKeepTheirCents) {
  LegacyBank bank(1000.0);
  LegacyBankAdapter gateway(bank);
  EXPECT_TRUE(gateway.charge(5, "EUR") == ChargeStatus::Approved);
  EXPECT_EQ(centsSeen(bank), 5LL);
  EXPECT_TRUE(gateway.charge(100, "EUR") == ChargeStatus::Approved);
  EXPECT_EQ(centsSeen(bank), 100LL);
}

TEST(Adapter, InsufficientFundsIsDeclined) {
  LegacyBank bank(50.0);
  LegacyBankAdapter gateway(bank);
  EXPECT_TRUE(gateway.charge(5001, "USD") == ChargeStatus::Declined);
  EXPECT_TRUE(gateway.charge(5000, "USD") == ChargeStatus::Approved);
}

TEST(Adapter, IssuerUnavailableIsRetryable) {
  LegacyBank bank(1000.0);
  LegacyBankAdapter gateway(bank);
  EXPECT_TRUE(gateway.charge(500, "XXX") == ChargeStatus::Unavailable);
}

TEST(Adapter, ImpossibleRequestsNeverReachTheBank) {
  LegacyBank bank(1000.0);
  LegacyBankAdapter gateway(bank);
  EXPECT_TRUE(gateway.charge(0, "USD") == ChargeStatus::Declined);
  EXPECT_TRUE(gateway.charge(-250, "USD") == ChargeStatus::Declined);
  EXPECT_TRUE(gateway.charge(300, "") == ChargeStatus::Declined);
  EXPECT_EQ(bank.calls(), 0);
}

TEST(Adapter, SharesTheVendorObjectInsteadOfCopyingIt) {
  LegacyBank bank(1000.0);
  LegacyBankAdapter a(bank);
  LegacyBankAdapter b(bank);
  a.charge(100, "USD");
  b.charge(200, "USD");
  EXPECT_EQ(bank.calls(), 2);
  EXPECT_EQ(centsSeen(bank), 200LL);
}

TEST(Adapter, WorksThroughTheTargetInterface) {
  LegacyBank bank(10.0);
  std::unique_ptr<PaymentGateway> gateway = std::make_unique<LegacyBankAdapter>(bank);
  EXPECT_TRUE(gateway->charge(999, "USD") == ChargeStatus::Approved);
  EXPECT_TRUE(gateway->charge(1001, "USD") == ChargeStatus::Declined);
}
