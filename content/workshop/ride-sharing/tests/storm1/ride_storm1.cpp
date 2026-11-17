#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using ride::DriverState;
using ride::Point;
using ride::RideClass;
using ride::Status;
using ride::TripState;

namespace {
// e1 Economy (10,10), c1 Comfort (11,10), x1 Xl (12,10), c2 Comfort (30,10).
struct Fixture1 {
  std::unique_ptr<ride::ClassedService> svc = ride::makeClassedService();
  Fixture1() {
    svc->addDriver("e1", Point{10, 10});
    svc->addDriverOf("c1", Point{11, 10}, RideClass::Comfort);
    svc->addDriverOf("x1", Point{12, 10}, RideClass::Xl);
    svc->addDriverOf("c2", Point{30, 10}, RideClass::Comfort);
  }
};
const Point kFrom{10, 10};
const Point kTo{10, 15};  // 5 units: raw fare 800
}  // namespace

TEST(Classes, TheFactoryGivesAServiceThatAlsoSpeaksTheBaseGame) {
  auto svc = ride::makeClassedService();
  ASSERT_TRUE(svc != nullptr);
  EXPECT_TRUE(svc->addDriver("a", Point{1, 1}));
  EXPECT_EQ(svc->requestRide("r", Point{1, 1}, Point{1, 4}).fare, 600);
}

TEST(Classes, ADriverNameIsUniqueAcrossClasses) {
  Fixture1 f;
  EXPECT_FALSE(f.svc->addDriverOf("e1", Point{1, 1}, RideClass::Xl));
  EXPECT_FALSE(f.svc->addDriverOf("", Point{1, 1}, RideClass::Xl));
  EXPECT_FALSE(f.svc->addDriverOf("new", Point{1001, 1}, RideClass::Xl));
  EXPECT_TRUE(f.svc->addDriverOf("new", Point{1, 1}, RideClass::Xl));
}

TEST(Matching, ARideIsMatchedOnlyWithDriversOfItsClassEvenWhenAnotherIsNearer) {
  Fixture1 f;
  EXPECT_EQ(f.svc->requestRideOf("r1", RideClass::Comfort, kFrom, kTo).driver, std::string("c1"));
  EXPECT_EQ(f.svc->requestRideOf("r2", RideClass::Xl, kFrom, kTo).driver, std::string("x1"));
  EXPECT_EQ(f.svc->requestRideOf("r3", RideClass::Economy, kFrom, kTo).driver, std::string("e1"));
}

TEST(Matching, TheBaseRideCallIsEconomyOnly) {
  Fixture1 f;
  EXPECT_EQ(f.svc->requestRide("r1", kFrom, kTo).driver, std::string("e1"));
  EXPECT_EQ(f.svc->requestRide("r2", kFrom, kTo).status, Status::NoDriverNearby);
  EXPECT_EQ(f.svc->driverState("c1"), DriverState::Idle);
}

TEST(Matching, NoDriverNearbyMeansNoneOfThatClassInRange) {
  Fixture1 f;
  EXPECT_EQ(f.svc->requestRideOf("r1", RideClass::Comfort, Point{45, 10}, Point{45, 12}).driver, std::string("c2"));
  EXPECT_EQ(f.svc->requestRideOf("r2", RideClass::Xl, Point{45, 10}, Point{45, 12}).status, Status::NoDriverNearby);
}

TEST(Matching, TheNearestDriverAndTheNameTieBreakStillApplyInsideAClass) {
  auto svc = ride::makeClassedService();
  svc->addDriverOf("zed", Point{10, 10}, RideClass::Comfort);
  svc->addDriverOf("amy", Point{14, 10}, RideClass::Comfort);
  svc->addDriverOf("bob", Point{12, 20}, RideClass::Comfort);
  EXPECT_EQ(svc->requestRideOf("r1", RideClass::Comfort, Point{12, 10}, Point{12, 11}).driver, std::string("amy"));
  EXPECT_EQ(svc->requestRideOf("r2", RideClass::Comfort, Point{12, 10}, Point{12, 11}).driver, std::string("zed"));
  EXPECT_EQ(svc->requestRideOf("r3", RideClass::Comfort, Point{12, 10}, Point{12, 11}).driver, std::string("bob"));
}

TEST(Fare, TheClassScalesTheWholeFare) {
  Fixture1 f;
  EXPECT_EQ(f.svc->requestRideOf("r1", RideClass::Economy, kFrom, kTo).fare, 800);
  EXPECT_EQ(f.svc->requestRideOf("r2", RideClass::Comfort, kFrom, kTo).fare, 1120);
  EXPECT_EQ(f.svc->requestRideOf("r3", RideClass::Xl, kFrom, kTo).fare, 1600);
}

TEST(Fare, CompletingChargesTheClassFare) {
  Fixture1 f;
  const auto t = f.svc->requestRideOf("r", RideClass::Xl, kFrom, kTo);
  f.svc->start(t.trip, "x1");
  const auto c = f.svc->complete(t.trip, "x1");
  EXPECT_EQ(c.status, Status::Ok);
  EXPECT_EQ(c.fare, 1600);
}

TEST(Lifecycle, ADriverKeepsTheirClassAfterATrip) {
  Fixture1 f;
  const auto t = f.svc->requestRideOf("r1", RideClass::Comfort, kFrom, Point{11, 12});
  f.svc->start(t.trip, "c1");
  f.svc->complete(t.trip, "c1");
  EXPECT_EQ(f.svc->requestRideOf("r2", RideClass::Comfort, Point{11, 12}, Point{11, 14}).driver, std::string("c1"));
  EXPECT_EQ(f.svc->requestRide("r3", Point{11, 12}, Point{11, 14}).driver, std::string("e1"));
}

TEST(Lifecycle, TheChecksAndTheTripRulesAreUnchangedForEveryClass) {
  Fixture1 f;
  EXPECT_EQ(f.svc->requestRideOf("", RideClass::Xl, kFrom, kFrom).status, Status::InvalidRequest);
  const auto t = f.svc->requestRideOf("r", RideClass::Comfort, kFrom, kTo);
  EXPECT_EQ(f.svc->requestRideOf("r", RideClass::Xl, Point{500, 500}, Point{501, 500}).status, Status::RiderBusy);
  EXPECT_EQ(f.svc->cancel(t.trip, "r"), Status::Ok);
  EXPECT_EQ(f.svc->driverState("c1"), DriverState::Idle);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Cancelled);
}
