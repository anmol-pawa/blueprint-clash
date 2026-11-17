#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "bp_test.h"

using food::Line;
using food::MenuItem;
using food::OrderState;
using food::Status;

namespace {
// Two kitchens. noodle: ramen 1200, gyoza 600, tea 250. pizza: margherita 1000, cola 300.
// Couriers are registered in an order that is not alphabetical, so "first registered" is never right by accident.
// Two ramen and a tea cost 2650 of food, so the total is 2650 + 299 = 2949.
struct Fixture {
  std::unique_ptr<food::Food> shop = food::makeFood();
  Fixture(bool couriers = true) {
    shop->addRestaurant("noodle", {{"ramen", 1200}, {"gyoza", 600}, {"tea", 250}});
    shop->addRestaurant("pizza", {{"margherita", 1000}, {"cola", 300}});
    if (couriers) {
      for (const char* name : {"zed", "amy", "kit"}) shop->registerCourier(name);
    }
  }
  food::OrderId order(const std::string& customer = "ann", const std::string& restaurant = "noodle") {
    return shop->place(customer, restaurant, {{"ramen", 2}, {"tea", 1}}).order;
  }
  // Takes an order to Ready (so a courier is assigned if one is free).
  food::OrderId readyOrder(const std::string& customer = "ann", const std::string& restaurant = "noodle") {
    const food::OrderId id = order(customer, restaurant);
    shop->accept(id, restaurant);
    shop->ready(id, restaurant);
    return id;
  }
  OrderState stateOf(food::OrderId id) { return shop->order(id).state; }
  std::string courierOf(food::OrderId id) { return shop->order(id).courier; }
};
}  // namespace

TEST(Setup, AFactoryAlwaysReturnsASystem) { EXPECT_TRUE(food::makeFood() != nullptr); }

TEST(Setup, RestaurantsNeedANewNameAndAUsableMenu) {
  auto shop = food::makeFood();
  EXPECT_TRUE(shop->addRestaurant("noodle", {{"ramen", 1200}}));
  EXPECT_FALSE(shop->addRestaurant("noodle", {{"tea", 250}}));
  EXPECT_FALSE(shop->addRestaurant("", {{"tea", 250}}));
  EXPECT_FALSE(shop->addRestaurant("empty", {}));
  EXPECT_FALSE(shop->addRestaurant("nameless", {{"", 250}}));
  EXPECT_FALSE(shop->addRestaurant("free", {{"tea", 0}}));
  EXPECT_FALSE(shop->addRestaurant("twice", {{"tea", 250}, {"tea", 300}}));
  EXPECT_TRUE(shop->place("ann", "twice", {{"tea", 1}}).status == Status::UnknownRestaurant);  // a refused menu adds nothing
  EXPECT_TRUE(shop->place("ann", "noodle", {{"tea", 1}}).status == Status::UnknownItem);       // the duplicate did not replace it
}

TEST(Setup, CouriersNeedANewName) {
  auto shop = food::makeFood();
  EXPECT_TRUE(shop->registerCourier("amy"));
  EXPECT_FALSE(shop->registerCourier("amy"));
  EXPECT_FALSE(shop->registerCourier(""));
}

TEST(Place, TheTotalIsTheFoodPlusTheDeliveryFee) {
  Fixture f;
  const auto r = f.shop->place("ann", "noodle", {{"ramen", 2}, {"tea", 1}});
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.order > 0);
  EXPECT_EQ(r.total, 2949);
  const auto info = f.shop->order(r.order);
  EXPECT_TRUE(info.status == Status::Ok);
  EXPECT_TRUE(info.state == OrderState::Placed);
  EXPECT_EQ(info.customer, std::string("ann"));
  EXPECT_EQ(info.restaurant, std::string("noodle"));
  EXPECT_EQ(info.courier, std::string(""));
  EXPECT_EQ(info.total, 2949);
}

TEST(Place, TheSameItemInSeveralLinesAddsUp) {
  Fixture f;
  const auto r = f.shop->place("ann", "noodle", {{"ramen", 1}, {"gyoza", 1}, {"ramen", 2}});
  EXPECT_EQ(r.total, 3600 + 600 + 299);
}

TEST(Place, EveryOrderGetsItsOwnId) {
  Fixture f;
  const food::OrderId a = f.order("ann");
  const food::OrderId b = f.order("ann");
  EXPECT_TRUE(a > 0);
  EXPECT_TRUE(b > 0);
  EXPECT_NE(a, b);
}

TEST(Place, QuantitiesMustBeBetweenOneAndTheMaximum) {
  Fixture f;
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"tea", 0}}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"tea", -1}}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"tea", food::kMaxQuantity + 1}}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"tea", 1}, {"gyoza", 0}}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"tea", 1}}).status == Status::Ok);
  const auto most = f.shop->place("ann", "noodle", {{"tea", food::kMaxQuantity}});
  EXPECT_TRUE(most.status == Status::Ok);
  EXPECT_EQ(most.total, 250 * 20 + 299);
}

TEST(Place, RequestsAreCheckedInTheDocumentedOrder) {
  Fixture f;
  EXPECT_TRUE(f.shop->place("", "noodle", {{"tea", 1}}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->place("ann", "nowhere", {{"tea", 0}}).status == Status::InvalidRequest);   // invalid before unknown
  EXPECT_TRUE(f.shop->place("ann", "nowhere", {{"sushi", 1}}).status == Status::UnknownRestaurant);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"tea", 1}, {"sushi", 1}}).status == Status::UnknownItem);
  EXPECT_TRUE(f.shop->place("ann", "noodle", {{"margherita", 1}}).status == Status::UnknownItem);  // another kitchen's item
  const auto failed = f.shop->place("ann", "noodle", {{"sushi", 1}});
  EXPECT_EQ(failed.order, 0);
  EXPECT_EQ(failed.total, 0);
}

TEST(Lifecycle, AnOrderWalksTheWholeWay) {
  Fixture f;
  const food::OrderId id = f.order();
  EXPECT_TRUE(f.shop->accept(id, "noodle") == Status::Ok);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Accepted);
  EXPECT_TRUE(f.shop->ready(id, "noodle") == Status::Ok);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Ready);
  EXPECT_EQ(f.courierOf(id), std::string("amy"));
  EXPECT_TRUE(f.shop->pickUp(id, "amy") == Status::Ok);
  EXPECT_TRUE(f.stateOf(id) == OrderState::PickedUp);
  EXPECT_TRUE(f.shop->deliver(id, "amy") == Status::Ok);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Delivered);
  EXPECT_EQ(f.courierOf(id), std::string("amy"));  // kept for the record
  EXPECT_EQ(f.shop->order(id).total, 2949);
}

TEST(Lifecycle, EachStepNeedsTheStepBefore) {
  Fixture f;
  const food::OrderId id = f.order();
  EXPECT_TRUE(f.shop->ready(id, "noodle") == Status::InvalidState);   // not accepted yet
  EXPECT_TRUE(f.stateOf(id) == OrderState::Placed);
  EXPECT_TRUE(f.shop->accept(id, "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->accept(id, "noodle") == Status::InvalidState);  // twice
  EXPECT_TRUE(f.shop->reject(id, "noodle") == Status::InvalidState);  // too late to reject
  EXPECT_TRUE(f.shop->ready(id, "noodle") == Status::Ok);
  EXPECT_TRUE(f.shop->ready(id, "noodle") == Status::InvalidState);
  EXPECT_TRUE(f.shop->deliver(id, "amy") == Status::InvalidState);    // not picked up yet
  EXPECT_TRUE(f.shop->pickUp(id, "amy") == Status::Ok);
  EXPECT_TRUE(f.shop->pickUp(id, "amy") == Status::InvalidState);
  EXPECT_TRUE(f.stateOf(id) == OrderState::PickedUp);
  EXPECT_TRUE(f.shop->deliver(id, "amy") == Status::Ok);
  EXPECT_TRUE(f.shop->deliver(id, "amy") == Status::InvalidState);
}

TEST(Lifecycle, OnlyTheOrdersOwnRestaurantAnswersIt) {
  Fixture f;
  const food::OrderId id = f.order();
  EXPECT_TRUE(f.shop->accept(id, "pizza") == Status::WrongParty);
  EXPECT_TRUE(f.shop->reject(id, "pizza") == Status::WrongParty);
  EXPECT_TRUE(f.shop->ready(id, "pizza") == Status::WrongParty);  // the party is checked before the state
  EXPECT_TRUE(f.shop->accept(999, "noodle") == Status::UnknownOrder);
  EXPECT_TRUE(f.shop->accept(0, "noodle") == Status::UnknownOrder);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Placed);
}

TEST(Lifecycle, OnlyTheAssignedCourierMovesTheOrder) {
  Fixture f;
  const food::OrderId id = f.readyOrder();  // amy
  EXPECT_TRUE(f.shop->pickUp(id, "kit") == Status::WrongParty);
  EXPECT_TRUE(f.shop->pickUp(id, "nobody") == Status::WrongParty);
  EXPECT_TRUE(f.shop->deliver(id, "kit") == Status::WrongParty);  // wrong courier is reported before the wrong state
  EXPECT_TRUE(f.stateOf(id) == OrderState::Ready);
  EXPECT_TRUE(f.shop->pickUp(id, "amy") == Status::Ok);
  EXPECT_TRUE(f.shop->deliver(id, "kit") == Status::WrongParty);
  EXPECT_TRUE(f.shop->deliver(id, "amy") == Status::Ok);
  EXPECT_TRUE(f.shop->pickUp(404, "amy") == Status::UnknownOrder);
}

TEST(Lifecycle, NoCourierIsTheAssignedCourierOfAnUnassignedOrder) {
  Fixture f(false);
  const food::OrderId id = f.readyOrder();  // nobody to give it to
  EXPECT_EQ(f.courierOf(id), std::string(""));
  EXPECT_TRUE(f.shop->pickUp(id, "") == Status::WrongParty);
  EXPECT_TRUE(f.shop->pickUp(id, "amy") == Status::WrongParty);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Ready);
}

TEST(Lifecycle, ARejectedOrderIsOverForGood) {
  Fixture f;
  const food::OrderId id = f.order();
  EXPECT_TRUE(f.shop->reject(id, "noodle") == Status::Ok);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Rejected);
  EXPECT_TRUE(f.shop->accept(id, "noodle") == Status::InvalidState);
  EXPECT_TRUE(f.shop->ready(id, "noodle") == Status::InvalidState);
  EXPECT_TRUE(f.shop->cancel(id, "ann").status == Status::InvalidState);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Rejected);
}

TEST(Lifecycle, OrdersAreKeptAndUnknownOnesReported) {
  Fixture f;
  const food::OrderId id = f.readyOrder();
  f.shop->pickUp(id, "amy");
  f.shop->deliver(id, "amy");
  EXPECT_TRUE(f.shop->order(id).status == Status::Ok);
  EXPECT_TRUE(f.shop->order(id + 1000).status == Status::UnknownOrder);
  EXPECT_TRUE(f.shop->order(0).status == Status::UnknownOrder);
}

TEST(Listeners, EveryChangeOfStateIsAnnouncedInOrder) {
  Fixture f;
  std::vector<std::string> log;
  auto name = [](OrderState s) { return std::to_string(static_cast<int>(s)); };
  f.shop->subscribe([&](food::OrderId id, OrderState from, OrderState to) {
    log.push_back("a" + std::to_string(id) + ":" + name(from) + ">" + name(to));
  });
  f.shop->subscribe([&](food::OrderId id, OrderState, OrderState) { log.push_back("b" + std::to_string(id)); });
  const food::OrderId id = f.order();  // placing is not a change of state
  EXPECT_EQ(log.size(), 0u);
  f.shop->accept(id, "noodle");
  f.shop->ready(id, "noodle");  // assigning a courier is not a change of state either
  f.shop->pickUp(id, "amy");
  f.shop->deliver(id, "amy");
  const std::string i = std::to_string(id);
  std::vector<std::string> expected;
  const std::pair<OrderState, OrderState> steps[] = {{OrderState::Placed, OrderState::Accepted},
                                                      {OrderState::Accepted, OrderState::Ready},
                                                      {OrderState::Ready, OrderState::PickedUp},
                                                      {OrderState::PickedUp, OrderState::Delivered}};
  for (const auto& step : steps) {
    expected.push_back("a" + i + ":" + name(step.first) + ">" + name(step.second));
    expected.push_back("b" + i);
  }
  EXPECT_TRUE(log == expected);
}

TEST(Listeners, RejectionsAndCancellationsAreAnnouncedAndFailuresAreNot) {
  Fixture f;
  std::vector<std::pair<OrderState, OrderState>> seen;
  f.shop->subscribe([&](food::OrderId, OrderState from, OrderState to) { seen.emplace_back(from, to); });
  const food::OrderId a = f.order();
  const food::OrderId b = f.order();
  const food::OrderId c = f.readyOrder();
  f.shop->reject(a, "noodle");
  f.shop->cancel(b, "ann");
  f.shop->cancel(c, "ann");
  const size_t before = seen.size();
  f.shop->cancel(c, "ann");          // already cancelled
  f.shop->accept(a, "pizza");        // wrong party
  f.shop->pickUp(404, "amy");        // unknown order
  EXPECT_EQ(seen.size(), before);
  EXPECT_EQ(seen.size(), 5u);  // c: accept, ready; a: reject; b: cancel; c: cancel
  EXPECT_TRUE(seen[seen.size() - 1] == std::make_pair(OrderState::Ready, OrderState::Cancelled));
  EXPECT_TRUE(seen[seen.size() - 2] == std::make_pair(OrderState::Placed, OrderState::Cancelled));
  EXPECT_TRUE(seen[seen.size() - 3] == std::make_pair(OrderState::Placed, OrderState::Rejected));
}

TEST(Dispatch, TheFreeCourierWithTheLowestNameGetsTheOrder) {
  Fixture f;
  EXPECT_EQ(f.courierOf(f.readyOrder("a1")), std::string("amy"));
  EXPECT_EQ(f.courierOf(f.readyOrder("a2")), std::string("kit"));
  EXPECT_EQ(f.courierOf(f.readyOrder("a3")), std::string("zed"));
}

TEST(Dispatch, CookingDoesNotTakeACourier) {
  Fixture f;
  const food::OrderId cooking = f.order("a1");
  f.shop->accept(cooking, "noodle");
  EXPECT_EQ(f.courierOf(cooking), std::string(""));
  EXPECT_EQ(f.courierOf(f.readyOrder("a2")), std::string("amy"));  // amy was not held by the order that is still cooking
}

TEST(Dispatch, WithNobodyFreeTheOrderWaitsAndTheNextFreeCourierTakesIt) {
  Fixture f;
  const food::OrderId first = f.readyOrder("a1");  // amy
  f.readyOrder("a2");                              // kit
  f.readyOrder("a3");                              // zed
  const food::OrderId waiting = f.readyOrder("a4");
  EXPECT_TRUE(f.stateOf(waiting) == OrderState::Ready);
  EXPECT_EQ(f.courierOf(waiting), std::string(""));
  f.shop->pickUp(first, "amy");
  EXPECT_EQ(f.courierOf(waiting), std::string(""));  // picking up does not free a courier
  f.shop->deliver(first, "amy");
  EXPECT_EQ(f.courierOf(waiting), std::string("amy"));
  EXPECT_TRUE(f.shop->pickUp(waiting, "amy") == Status::Ok);
}

TEST(Dispatch, WaitingOrdersAreServedOldestFirstByOrderId) {
  Fixture f(false);
  f.shop->registerCourier("amy");
  const food::OrderId o1 = f.order("a");
  const food::OrderId o2 = f.order("b");
  const food::OrderId o3 = f.order("c");
  for (const food::OrderId id : {o1, o2, o3}) f.shop->accept(id, "noodle");
  f.shop->ready(o1, "noodle");  // amy
  f.shop->ready(o3, "noodle");  // waits first...
  f.shop->ready(o2, "noodle");  // ...but o2 is the older order
  f.shop->pickUp(o1, "amy");
  f.shop->deliver(o1, "amy");
  EXPECT_EQ(f.courierOf(o2), std::string("amy"));
  EXPECT_EQ(f.courierOf(o3), std::string(""));
}

TEST(Dispatch, ANewCourierTakesTheOldestWaitingOrder) {
  Fixture f(false);
  const food::OrderId o1 = f.readyOrder("a");
  const food::OrderId o2 = f.readyOrder("b");
  EXPECT_TRUE(f.shop->registerCourier("kit"));
  EXPECT_EQ(f.courierOf(o1), std::string("kit"));
  EXPECT_EQ(f.courierOf(o2), std::string(""));
  EXPECT_TRUE(f.shop->registerCourier("amy"));
  EXPECT_EQ(f.courierOf(o2), std::string("amy"));
  EXPECT_FALSE(f.shop->registerCourier("amy"));  // a refused name takes nothing
}

TEST(Dispatch, ACourierWhoDeliveredIsFreeForTheNextOrder) {
  Fixture f;
  const food::OrderId first = f.readyOrder("a1");  // amy
  f.shop->pickUp(first, "amy");
  f.shop->deliver(first, "amy");
  EXPECT_EQ(f.courierOf(f.readyOrder("a2")), std::string("amy"));
}

TEST(Cancel, BeforeTheKitchenAnswersItIsFree) {
  Fixture f;
  const food::OrderId id = f.order();
  const auto r = f.shop->cancel(id, "ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.fee, 0);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Cancelled);
}

TEST(Cancel, WhileTheKitchenCooksItCostsAQuarterOfTheFoodRoundedDown) {
  Fixture f;
  const food::OrderId id = f.order();
  f.shop->accept(id, "noodle");
  const auto r = f.shop->cancel(id, "ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.fee, 662);  // 2650 * 25 / 100 = 662.5, and the delivery fee is not part of it
  EXPECT_TRUE(f.stateOf(id) == OrderState::Cancelled);
}

TEST(Cancel, OnceTheFoodIsReadyTheWholeFoodIsCharged) {
  Fixture f;
  const food::OrderId id = f.readyOrder();
  const auto r = f.shop->cancel(id, "ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.fee, 2650);
}

TEST(Cancel, OnlyTheCustomerCanCancelAndTheChecksRunInOrder) {
  Fixture f;
  const food::OrderId id = f.order();
  EXPECT_TRUE(f.shop->cancel(id, "bob").status == Status::WrongParty);
  EXPECT_TRUE(f.shop->cancel(id, "noodle").status == Status::WrongParty);
  EXPECT_TRUE(f.shop->cancel(404, "ann").status == Status::UnknownOrder);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Placed);
  const auto r = f.shop->cancel(id, "bob");
  EXPECT_EQ(r.fee, 0);
  f.shop->cancel(id, "ann");
  EXPECT_TRUE(f.shop->cancel(id, "bob").status == Status::WrongParty);  // the caller is checked before the state
}

TEST(Cancel, OnceTheCourierHasTheFoodItIsTooLate) {
  Fixture f;
  const food::OrderId id = f.readyOrder();
  f.shop->pickUp(id, "amy");
  const auto late = f.shop->cancel(id, "ann");
  EXPECT_TRUE(late.status == Status::InvalidState);
  EXPECT_EQ(late.fee, 0);
  f.shop->deliver(id, "amy");
  EXPECT_TRUE(f.shop->cancel(id, "ann").status == Status::InvalidState);
  EXPECT_TRUE(f.stateOf(id) == OrderState::Delivered);
  const food::OrderId other = f.order("bob");
  f.shop->cancel(other, "bob");
  EXPECT_TRUE(f.shop->cancel(other, "bob").status == Status::InvalidState);  // not twice
}

TEST(Cancel, CancellingAReadyOrderFreesItsCourierForTheWaitingOrder) {
  Fixture f;
  const food::OrderId o1 = f.readyOrder("a1");  // amy
  f.readyOrder("a2");                           // kit
  f.readyOrder("a3");                           // zed
  const food::OrderId waiting = f.readyOrder("a4");
  EXPECT_EQ(f.courierOf(waiting), std::string(""));
  f.shop->cancel(o1, "a1");
  EXPECT_EQ(f.courierOf(waiting), std::string("amy"));
}

TEST(Cancel, ACancelledOrdersCourierIsFreeForTheNextOrder) {
  Fixture f;
  const food::OrderId o1 = f.readyOrder("a1");  // amy
  f.shop->cancel(o1, "a1");
  EXPECT_EQ(f.courierOf(f.readyOrder("a2")), std::string("amy"));
}

TEST(Cancel, ACancelledWaitingOrderLeavesTheQueue) {
  Fixture f(false);
  f.shop->registerCourier("amy");
  const food::OrderId o1 = f.readyOrder("a");  // amy
  const food::OrderId o2 = f.readyOrder("b");  // waits
  const food::OrderId o3 = f.readyOrder("c");  // waits
  f.shop->cancel(o2, "b");
  f.shop->pickUp(o1, "amy");
  f.shop->deliver(o1, "amy");
  EXPECT_EQ(f.courierOf(o3), std::string("amy"));
  EXPECT_EQ(f.courierOf(o2), std::string(""));
}

TEST(Cancel, CancellingBeforeReadyNeverTouchesTheCouriers) {
  Fixture f(false);
  f.shop->registerCourier("amy");
  const food::OrderId o1 = f.readyOrder("a");   // amy
  const food::OrderId cooking = f.order("b");
  f.shop->accept(cooking, "noodle");
  f.shop->cancel(cooking, "b");                 // amy still has o1
  const food::OrderId o3 = f.readyOrder("c");   // must wait: amy is busy
  EXPECT_EQ(f.courierOf(o3), std::string(""));
  EXPECT_EQ(f.courierOf(o1), std::string("amy"));
}

TEST(Kitchens, TheOriginalGameHasNoLimitOnWhatAKitchenCooks) {
  Fixture f;
  std::vector<food::OrderId> ids;
  for (int i = 0; i < 6; ++i) ids.push_back(f.order("c" + std::to_string(i)));
  for (const food::OrderId id : ids) EXPECT_TRUE(f.shop->accept(id, "noodle") == Status::Ok);
}
