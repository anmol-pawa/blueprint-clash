#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using food::OrderState;
using food::Promo;
using food::PromoKind;
using food::Status;

namespace {
// noodle: ramen 1200, gyoza 600, tea 250. pizza: margherita 1000, cola 300.
std::unique_ptr<food::PromoFood> shopWith(std::vector<Promo> promos) {
  auto shop = food::makePromoFood(promos);
  shop->addRestaurant("noodle", {{"ramen", 1200}, {"gyoza", 600}, {"tea", 250}});
  shop->addRestaurant("pizza", {{"margherita", 1000}, {"cola", 300}});
  shop->registerCourier("amy");
  return shop;
}

std::vector<Promo> usualCodes() {
  return {
      {"TEN", PromoKind::PercentOff, 10, 0},
      {"THIRD", PromoKind::PercentOff, 33, 0},
      {"FIVE", PromoKind::AmountOff, 500, 2000},
      {"HUGE", PromoKind::AmountOff, 99999, 0},
      {"FREE", PromoKind::PercentOff, 100, 0},
  };
}
}  // namespace

TEST(Promo, APercentageComesOffTheFoodAndNotOffTheDeliveryFee) {
  auto shop = shopWith(usualCodes());
  const auto r = shop->placeWithCode("ann", "noodle", {{"ramen", 2}}, "TEN");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.total, 2400 - 240 + 299);
  EXPECT_EQ(shop->order(r.order).total, 2459);
}

TEST(Promo, ThePercentageDiscountIsRoundedDownSoTheCustomerPaysTheRest) {
  auto shop = shopWith(usualCodes());
  EXPECT_EQ(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, "THIRD").total, 250 - 82 + 299);  // 250 * 33 / 100 = 82.5
}

TEST(Promo, AFixedAmountComesOffAndNeverBelowZero) {
  auto shop = shopWith(usualCodes());
  EXPECT_EQ(shop->placeWithCode("ann", "pizza", {{"margherita", 2}}, "FIVE").total, 2000 - 500 + 299);
  EXPECT_EQ(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, "HUGE").total, 299);  // free food, the delivery is still paid
}

TEST(Promo, ACodeThatTakesEverythingOffStillPaysTheDelivery) {
  auto shop = shopWith(usualCodes());
  EXPECT_EQ(shop->placeWithCode("ann", "noodle", {{"ramen", 3}}, "FREE").total, 299);
}

TEST(Promo, TheMinimumIsMeasuredOnTheFoodBeforeTheDiscountAndIsInclusive) {
  auto shop = shopWith(usualCodes());
  const auto low = shop->placeWithCode("ann", "noodle", {{"ramen", 1}, {"gyoza", 1}}, "FIVE");  // 1800
  EXPECT_TRUE(low.status == Status::PromoNotApplicable);
  EXPECT_EQ(low.order, 0);
  EXPECT_EQ(low.total, 0);
  EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"ramen", 1}, {"gyoza", 1}, {"tea", 1}}, "FIVE").status == Status::Ok);  // 2050
  EXPECT_TRUE(shop->placeWithCode("ann", "pizza", {{"margherita", 2}}, "FIVE").status == Status::Ok);  // exactly 2000
}

TEST(Promo, ChecksRunInTheDocumentedOrder) {
  auto shop = shopWith(usualCodes());
  EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, "").status == Status::InvalidRequest);
  EXPECT_TRUE(shop->placeWithCode("ann", "nowhere", {{"tea", 1}}, "NOPE").status == Status::UnknownRestaurant);
  EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"sushi", 1}}, "NOPE").status == Status::UnknownItem);
  EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, "NOPE").status == Status::UnknownPromo);
  EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"tea", 0}}, "TEN").status == Status::InvalidRequest);
  EXPECT_TRUE(shop->placeWithCode("", "noodle", {{"tea", 1}}, "TEN").status == Status::InvalidRequest);
  EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, "ten").status == Status::UnknownPromo);  // codes are exact
}

TEST(Promo, OrdinaryOrdersOnThisSystemAreNeverDiscounted) {
  auto shop = shopWith(usualCodes());
  EXPECT_EQ(shop->place("ann", "noodle", {{"ramen", 2}}).total, 2400 + 299);
}

TEST(Promo, TheCancellationFeeIsChargedOnTheDiscountedFood) {
  auto shop = shopWith(usualCodes());
  const food::OrderId cooking = shop->placeWithCode("ann", "noodle", {{"ramen", 2}}, "TEN").order;  // food 2160
  shop->accept(cooking, "noodle");
  EXPECT_EQ(shop->cancel(cooking, "ann").fee, 540);
  const food::OrderId ready = shop->placeWithCode("bob", "noodle", {{"ramen", 2}}, "TEN").order;
  shop->accept(ready, "noodle");
  shop->ready(ready, "noodle");
  EXPECT_EQ(shop->cancel(ready, "bob").fee, 2160);
  const food::OrderId free = shop->placeWithCode("cy", "noodle", {{"tea", 1}}, "HUGE").order;  // free food
  shop->accept(free, "noodle");
  shop->ready(free, "noodle");
  EXPECT_EQ(shop->cancel(free, "cy").fee, 0);
}

TEST(Promo, InvalidOrRepeatedCodesAreLeftOut) {
  auto shop = shopWith({
      {"", PromoKind::AmountOff, 100, 0},
      {"ZERO", PromoKind::PercentOff, 0, 0},
      {"OVER", PromoKind::PercentOff, 101, 0},
      {"NONE", PromoKind::AmountOff, 0, 0},
      {"NEGATIVE", PromoKind::AmountOff, 100, -1},
      {"DUP", PromoKind::AmountOff, 100, 0},
      {"DUP", PromoKind::PercentOff, 50, 0},
  });
  for (const char* code : {"ZERO", "OVER", "NONE", "NEGATIVE"}) {
    EXPECT_TRUE(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, code).status == Status::UnknownPromo);
  }
  EXPECT_EQ(shop->placeWithCode("ann", "noodle", {{"tea", 1}}, "DUP").total, 250 - 100 + 299);  // the first one wins
}

TEST(Promo, DiscountedOrdersGoThroughTheSameLifecycle) {
  auto shop = shopWith(usualCodes());
  const food::OrderId id = shop->placeWithCode("ann", "noodle", {{"ramen", 1}}, "TEN").order;
  EXPECT_TRUE(shop->accept(id, "noodle") == Status::Ok);
  EXPECT_TRUE(shop->ready(id, "noodle") == Status::Ok);
  EXPECT_EQ(shop->order(id).courier, std::string("amy"));
  EXPECT_TRUE(shop->pickUp(id, "amy") == Status::Ok);
  EXPECT_TRUE(shop->deliver(id, "amy") == Status::Ok);
  EXPECT_TRUE(shop->order(id).state == OrderState::Delivered);
}
