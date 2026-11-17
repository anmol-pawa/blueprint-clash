#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

using food::OrderState;
using food::Promo;
using food::PromoKind;
using food::Status;

namespace {
// Two cooking places per kitchen. noodle: ramen 1200, tea 250. pizza: margherita 1000.
struct Fixture {
  std::unique_ptr<food::PromoFood> shop;
  explicit Fixture(int slots = 2) : shop(food::makeBusyKitchens({{"TEN", PromoKind::PercentOff, 10, 0}}, slots)) {
    shop->addRestaurant("noodle", {{"ramen", 1200}, {"tea", 250}});
    shop->addRestaurant("pizza", {{"margherita", 1000}});
    shop->registerCourier("amy");
    shop->registerCourier("kit");
  }
  food::OrderId order(const std::string& customer, const std::string& restaurant = "noodle") {
    const std::string item = restaurant == "noodle" ? "ramen" : "margherita";
    return shop->place(customer, restaurant, {{item, 1}}).order;
  }
};
}  // namespace

TEST(Kitchen, ItCooksOnlyAsManyOrdersAsItHasPlaces) {
  Fixture f;
  int announced = 0;
  f.shop->subscribe([&](food::OrderId, OrderState, OrderState) { ++announced; });
  const food::OrderId a = f.order("a");
  const food::OrderId b = f.order("b");
  const food::OrderId c = f.order("c");
  EXPECT_TRUE(f.shop->accept(a, "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->accept(b, "noodle") == Status::Ok);
  EXPECT_EQ(announced, 2);
  EXPECT_TRUE(f.shop->accept(c, "noodle") == Status::KitchenFull);
  EXPECT_TRUE(f.shop->order(c).state == OrderState::Placed);  // still waiting, not refused
  EXPECT_EQ(announced, 2);                                    // a refusal is not a change of state
}

TEST(Kitchen, APlaceIsFreeAgainWhenTheFoodIsReady) {
  Fixture f;
  const food::OrderId a = f.order("a");
  const food::OrderId b = f.order("b");
  const food::OrderId c = f.order("c");
  f.shop->accept(a, "noodle");
  f.shop->accept(b, "noodle");
  EXPECT_TRUE(f.shop->ready(a, "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->accept(c, "noodle") == Status::Ok);
  const food::OrderId d = f.order("d");
  EXPECT_TRUE(f.shop->accept(d, "noodle") == Status::KitchenFull);  // b and c are cooking; a is not
}

TEST(Kitchen, APlaceIsFreeAgainWhenTheCustomerCancelsWhileItCooks) {
  Fixture f;
  const food::OrderId a = f.order("a");
  const food::OrderId b = f.order("b");
  const food::OrderId c = f.order("c");
  f.shop->accept(a, "noodle");
  f.shop->accept(b, "noodle");
  EXPECT_TRUE(f.shop->cancel(a, "a").status == Status::Ok);
  EXPECT_TRUE(f.shop->accept(c, "noodle") == Status::Ok);
}

TEST(Kitchen, OrdersThatNeverCookedNeverFreeAPlace) {
  Fixture f;
  const food::OrderId a = f.order("a");
  const food::OrderId b = f.order("b");
  f.shop->accept(a, "noodle");
  f.shop->accept(b, "noodle");
  const food::OrderId c = f.order("c");
  const food::OrderId d = f.order("d");
  EXPECT_TRUE(f.shop->cancel(c, "c").status == Status::Ok);   // was only Placed
  EXPECT_TRUE(f.shop->reject(d, "noodle") == Status::Ok);     // was only Placed
  const food::OrderId e = f.order("e");
  EXPECT_TRUE(f.shop->accept(e, "noodle") == Status::KitchenFull);
}

TEST(Kitchen, AnOrderThatIsOnItsWayHoldsNoPlace) {
  Fixture f(1);
  const food::OrderId a = f.order("a");
  f.shop->accept(a, "noodle");
  f.shop->ready(a, "noodle");
  f.shop->pickUp(a, "amy");
  f.shop->deliver(a, "amy");
  const food::OrderId b = f.order("b");
  EXPECT_TRUE(f.shop->accept(b, "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->cancel(b, "b").status == Status::Ok);
  f.shop->cancel(b, "b");  // a second, refused cancel frees nothing more
  const food::OrderId c = f.order("c");
  const food::OrderId d = f.order("d");
  EXPECT_TRUE(f.shop->accept(c, "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->accept(d, "noodle") == Status::KitchenFull);
}

TEST(Kitchen, EveryKitchenCountsItsOwnPlaces) {
  Fixture f(1);
  f.shop->accept(f.order("a"), "noodle");
  EXPECT_TRUE(f.shop->accept(f.order("b", "pizza"), "pizza") == Status::Ok);
  EXPECT_TRUE(f.shop->accept(f.order("c"), "noodle") == Status::KitchenFull);
  EXPECT_TRUE(f.shop->accept(f.order("d", "pizza"), "pizza") == Status::KitchenFull);
}

TEST(Kitchen, KitchenFullIsTheLastCheckOfAccept) {
  Fixture f(1);
  const food::OrderId a = f.order("a");
  f.shop->accept(a, "noodle");
  const food::OrderId b = f.order("b");
  EXPECT_TRUE(f.shop->accept(b, "pizza") == Status::WrongParty);    // the wrong restaurant, even though noodle is full
  EXPECT_TRUE(f.shop->accept(a, "noodle") == Status::InvalidState); // already cooking: not "full"
  EXPECT_TRUE(f.shop->accept(404, "noodle") == Status::UnknownOrder);
  EXPECT_TRUE(f.shop->accept(b, "noodle") == Status::KitchenFull);
}

TEST(Kitchen, AnOrderRefusedForRoomCanBeAcceptedLater) {
  Fixture f(1);
  const food::OrderId a = f.order("a");
  const food::OrderId b = f.order("b");
  f.shop->accept(a, "noodle");
  EXPECT_TRUE(f.shop->accept(b, "noodle") == Status::KitchenFull);
  f.shop->ready(a, "noodle");
  EXPECT_TRUE(f.shop->accept(b, "noodle") == Status::Ok);  // the same order, accepted later
  EXPECT_TRUE(f.shop->order(b).state == OrderState::Accepted);
}

TEST(Kitchen, ACountBelowOneMeansOnePlace) {
  Fixture f(0);
  EXPECT_TRUE(f.shop->accept(f.order("a"), "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->accept(f.order("b"), "noodle") == Status::KitchenFull);
  Fixture g(-5);
  EXPECT_TRUE(g.shop->accept(g.order("a"), "noodle") == Status::Ok);
  EXPECT_TRUE(g.shop->accept(g.order("b"), "noodle") == Status::KitchenFull);
}

TEST(Kitchen, PromoCodesStillWorkOnThisSystem) {
  Fixture f;
  const auto r = f.shop->placeWithCode("ann", "noodle", {{"ramen", 1}}, "TEN");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.total, 1200 - 120 + 299);
  f.shop->accept(r.order, "noodle");
  EXPECT_EQ(f.shop->cancel(r.order, "ann").fee, 270);  // 1080 * 25 / 100
}

TEST(Kitchen, CouriersAreUnaffectedByTheLimit) {
  Fixture f;
  const food::OrderId a = f.order("a");
  const food::OrderId b = f.order("b");
  f.shop->accept(a, "noodle");
  f.shop->ready(a, "noodle");
  f.shop->accept(b, "noodle");
  f.shop->ready(b, "noodle");
  EXPECT_EQ(f.shop->order(a).courier, std::string("amy"));
  EXPECT_EQ(f.shop->order(b).courier, std::string("kit"));
}
