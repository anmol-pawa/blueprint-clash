#include <string>
#include <utility>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
struct Recorder : MessageSender {  // a sender the solution has never seen
  std::vector<std::pair<std::string, std::string>> sent;
  bool send(const std::string& to, const std::string& body) override {
    sent.emplace_back(to, body);
    return true;
  }
};
struct Down : MessageSender {  // delivery always fails
  int attempts = 0;
  bool send(const std::string&, const std::string&) override {
    ++attempts;
    return false;
  }
};
}  // namespace

TEST(Order, SendsOneConfirmationThroughTheInjectedSender) {
  Recorder r;
  OrderService svc(r);
  EXPECT_TRUE(svc.placeOrder("ana", 3));
  ASSERT_EQ(r.sent.size(), static_cast<size_t>(1));
  EXPECT_EQ(r.sent[0].first, std::string("ana"));
  EXPECT_EQ(r.sent[0].second, std::string("Order confirmed: 3 item(s)"));
}

TEST(Order, RejectsNonPositiveQuantityWithoutSending) {
  Recorder r;
  OrderService svc(r);
  EXPECT_FALSE(svc.placeOrder("ana", 0));
  EXPECT_FALSE(svc.placeOrder("ana", -2));
  EXPECT_EQ(r.sent.size(), static_cast<size_t>(0));
  EXPECT_EQ(svc.confirmedCount(), 0);
}

TEST(Order, CountsOnlyDeliveredOrders) {
  Recorder r;
  OrderService svc(r);
  svc.placeOrder("a", 1);
  svc.placeOrder("b", 2);
  svc.placeOrder("c", 0);
  EXPECT_EQ(svc.confirmedCount(), 2);
}

TEST(Order, FailedDeliveryIsNotAConfirmedOrder) {
  Down d;
  OrderService svc(d);
  EXPECT_FALSE(svc.placeOrder("ana", 4));
  EXPECT_EQ(d.attempts, 1);
  EXPECT_EQ(svc.confirmedCount(), 0);
}

TEST(Injection, TwoServicesUseTheirOwnSenders) {
  Recorder a, b;
  OrderService sa(a), sb(b);
  sa.placeOrder("x", 1);
  sb.placeOrder("y", 1);
  sb.placeOrder("z", 1);
  EXPECT_EQ(a.sent.size(), static_cast<size_t>(1));
  EXPECT_EQ(b.sent.size(), static_cast<size_t>(2));
}

TEST(Injection, MessageGoesToTheNamedCustomer) {
  Recorder r;
  OrderService svc(r);
  svc.placeOrder("zed", 9);
  svc.placeOrder("amy", 1);
  ASSERT_EQ(r.sent.size(), static_cast<size_t>(2));
  EXPECT_EQ(r.sent[0].first, std::string("zed"));
  EXPECT_EQ(r.sent[1].first, std::string("amy"));
}
