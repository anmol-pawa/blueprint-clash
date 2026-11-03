#include <string>
#include <type_traits>
#include <utility>
#include "bp_test.h"
#include "solution.h"

namespace {
template <class T, class = void>
struct HasWalletAccessor : std::false_type {};
template <class T>
struct HasWalletAccessor<T, std::void_t<decltype(std::declval<T&>().wallet())>> : std::true_type {};
}  // namespace

TEST(Wallet, ChargeReducesBalance) {
  Wallet w(1000);
  EXPECT_TRUE(w.charge(250));
  EXPECT_EQ(w.balance(), 750LL);
}

TEST(Wallet, CannotOverdraw) {
  Wallet w(100);
  EXPECT_FALSE(w.charge(101));
  EXPECT_EQ(w.balance(), 100LL);
  EXPECT_TRUE(w.charge(100));
  EXPECT_EQ(w.balance(), 0LL);
}

TEST(Wallet, RejectsNonPositiveCharges) {
  Wallet w(100);
  EXPECT_FALSE(w.charge(0));
  EXPECT_FALSE(w.charge(-50));
  EXPECT_EQ(w.balance(), 100LL);
}

TEST(Wallet, DepositIgnoresNonPositive) {
  Wallet w(10);
  w.deposit(5);
  w.deposit(-100);
  w.deposit(0);
  EXPECT_EQ(w.balance(), 15LL);
}

TEST(Demeter, CustomerDoesNotHandOutItsWallet) {
  EXPECT_FALSE(HasWalletAccessor<Customer>::value);
}

TEST(Customer, PayTopUpAndFunds) {
  Customer c("ana", 500);
  EXPECT_EQ(c.name(), std::string("ana"));
  EXPECT_TRUE(c.pay(200));
  EXPECT_EQ(c.funds(), 300LL);
  c.topUp(50);
  EXPECT_EQ(c.funds(), 350LL);
  EXPECT_FALSE(c.pay(351));
  EXPECT_EQ(c.funds(), 350LL);
}

TEST(Shop, SellChargesTheCustomerAndCountsRevenue) {
  Shop shop;
  Customer c("bo", 1000);
  EXPECT_TRUE(shop.sell(c, 400));
  EXPECT_TRUE(shop.sell(c, 100));
  EXPECT_EQ(c.funds(), 500LL);
  EXPECT_EQ(shop.revenue(), 500LL);
}

TEST(Shop, FailedPaymentIsNotRevenue) {
  Shop shop;
  Customer poor("cy", 50);
  EXPECT_FALSE(shop.sell(poor, 80));
  EXPECT_EQ(shop.revenue(), 0LL);
  EXPECT_EQ(poor.funds(), 50LL);
}
