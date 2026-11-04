#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
using Log = std::vector<std::string>;

struct FakeInventory final : Inventory {
  explicit FakeInventory(Log& l) : log(l) {}
  bool reserve(const std::string& sku, int q) override {
    log.push_back("reserve:" + sku + ":" + std::to_string(q));
    return inStock;
  }
  void release(const std::string& sku, int q) override { log.push_back("release:" + sku + ":" + std::to_string(q)); }
  Log& log;
  bool inStock = true;
};
struct FakePayments final : Payments {
  explicit FakePayments(Log& l) : log(l) {}
  bool charge(const std::string& c, long long cents) override {
    log.push_back("charge:" + c + ":" + std::to_string(cents));
    return approve;
  }
  Log& log;
  bool approve = true;
};
struct FakeShipping final : Shipping {
  explicit FakeShipping(Log& l) : log(l) {}
  std::string schedule(const std::string& c, const std::string& sku, int q) override {
    log.push_back("ship:" + c + ":" + sku + ":" + std::to_string(q));
    return "TRK-1";
  }
  Log& log;
};
struct FakeMailer final : Mailer {
  explicit FakeMailer(Log& l) : log(l) {}
  void sendConfirmation(const std::string& c, const std::string& t) override { log.push_back("mail:" + c + ":" + t); }
  Log& log;
};

struct Rig {
  Log log;
  FakeInventory inv{log};
  FakePayments pay{log};
  FakeShipping ship{log};
  FakeMailer mail{log};
  Checkout checkout{inv, pay, ship, mail};
};

Order good() { return Order{"ana", "pen", 3, 250}; }
}  // namespace

TEST(Checkout, HappyPathRunsTheSubsystemsInOrder) {
  Rig r;
  const CheckoutResult res = r.checkout.place(good());
  EXPECT_TRUE(res.status == CheckoutStatus::Ok);
  EXPECT_EQ(res.trackingId, std::string("TRK-1"));
  EXPECT_EQ(res.chargedCents, 750LL);
  const Log expected{"reserve:pen:3", "charge:ana:750", "ship:ana:pen:3", "mail:ana:TRK-1"};
  EXPECT_TRUE(r.log == expected);
}

TEST(Checkout, ChargesQuantityTimesUnitPrice) {
  Rig r;
  const CheckoutResult res = r.checkout.place(Order{"bo", "ink", 4, 1999});
  EXPECT_EQ(res.chargedCents, 7996LL);
  EXPECT_EQ(r.log[1], std::string("charge:bo:7996"));
}

TEST(Checkout, OutOfStockNeverChargesOrShips) {
  Rig r;
  r.inv.inStock = false;
  const CheckoutResult res = r.checkout.place(good());
  EXPECT_TRUE(res.status == CheckoutStatus::OutOfStock);
  const Log expected{"reserve:pen:3"};
  EXPECT_TRUE(r.log == expected);
  EXPECT_EQ(res.chargedCents, 0LL);
}

TEST(Checkout, DeclinedPaymentReleasesTheReservation) {
  Rig r;
  r.pay.approve = false;
  const CheckoutResult res = r.checkout.place(good());
  EXPECT_TRUE(res.status == CheckoutStatus::PaymentDeclined);
  const Log expected{"reserve:pen:3", "charge:ana:750", "release:pen:3"};
  EXPECT_TRUE(r.log == expected);
  EXPECT_TRUE(res.trackingId.empty());
}

TEST(Checkout, DeclinedPaymentSendsNoEmail) {
  Rig r;
  r.pay.approve = false;
  r.checkout.place(good());
  for (const auto& line : r.log) EXPECT_TRUE(line.rfind("mail:", 0) != 0);
}

TEST(Checkout, InvalidOrdersTouchNothing) {
  const Order bad[] = {Order{"", "pen", 1, 100}, Order{"ana", "", 1, 100}, Order{"ana", "pen", 0, 100},
                       Order{"ana", "pen", -2, 100}, Order{"ana", "pen", 1, 0}};
  for (const Order& o : bad) {
    Rig r;
    const CheckoutResult res = r.checkout.place(o);
    EXPECT_TRUE(res.status == CheckoutStatus::InvalidOrder);
    EXPECT_TRUE(r.log.empty());
  }
}

TEST(Checkout, SubsystemsStayUsableDirectly) {
  Rig r;
  r.checkout.place(good());
  r.log.clear();
  EXPECT_TRUE(r.inv.reserve("pen", 1));  // the facade did not take the subsystems over
  EXPECT_EQ(r.log.size(), static_cast<std::size_t>(1));
}
