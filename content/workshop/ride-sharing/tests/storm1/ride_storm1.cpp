#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using ride::DriverState;
using ride::Location;
using ride::Status;
using ride::TripState;

namespace {
Location spot(long long x, long long y) {
  Location p;
  p.x = x;
  p.y = y;
  return p;
}

// Three drivers wait close to the origin: d1 at distance 1, d2 at 2, d3 at 3.
struct Fixture1 {
  std::unique_ptr<ride::Dispatch> dispatch;
  Fixture1(int threshold, int percent) : dispatch(ride::makeSurgeDispatch(threshold, percent)) {
    for (const char* id : {"d1", "d2", "d3"}) dispatch->addDriver(id);
    dispatch->goOnline("d1", spot(1, 0));
    dispatch->goOnline("d2", spot(2, 0));
    dispatch->goOnline("d3", spot(3, 0));
  }
  ride::RequestResult ask(const std::string& rider, long long distance) {
    return dispatch->requestRide(rider, spot(0, 0), spot(0, distance));
  }
};
}  // namespace

TEST(SurgeSetup, TheFactoryRefusesBadArguments) {
  EXPECT_TRUE(ride::makeSurgeDispatch(-1, 150) == nullptr);
  EXPECT_TRUE(ride::makeSurgeDispatch(2, 99) == nullptr);
  EXPECT_TRUE(ride::makeSurgeDispatch(2, 501) == nullptr);
  EXPECT_TRUE(ride::makeSurgeDispatch(0, 100) != nullptr);
  EXPECT_TRUE(ride::makeSurgeDispatch(0, 500) != nullptr);
  EXPECT_TRUE(ride::makeSurgeDispatch(1000, 250) != nullptr);
}

TEST(Surge, TheFareRisesOnceFreeDriversAreAtMostTheThreshold) {
  Fixture1 f(2, 150);
  EXPECT_EQ(f.ask("ann", 1).fare, 420);  // 3 free: no surge
  EXPECT_EQ(f.ask("bob", 1).fare, 630);  // 2 free: surge, 420 * 150 / 100
  EXPECT_EQ(f.ask("cat", 1).fare, 630);  // 1 free
  EXPECT_TRUE(f.ask("dan", 1).status == Status::NoDriver);
}

TEST(Surge, TheThresholdItselfSurges) {
  Fixture1 f(3, 200);
  EXPECT_EQ(f.ask("ann", 2).fare, (300 + 240) * 2);  // exactly 3 free
}

TEST(Surge, FreeDriversAreCountedBeforeTheMatch) {
  Fixture1 f(2, 200);
  f.dispatch->goOffline("d3");
  // Two free drivers now. Counted before matching that is 2 (surge); counted after it would be 1.
  EXPECT_EQ(f.ask("ann", 1).fare, 840);
  Fixture1 g(1, 200);
  g.dispatch->goOffline("d3");
  // Two free: above a threshold of 1, so no surge, even though the match leaves only one free.
  EXPECT_EQ(g.ask("ann", 1).fare, 420);
}

TEST(Surge, OnlyAvailableDriversCount) {
  Fixture1 f(1, 300);
  f.dispatch->goOffline("d2");
  f.dispatch->goOffline("d3");
  const auto a = f.ask("ann", 1);  // one free (d1), the others are offline: surge
  EXPECT_EQ(a.fare, 1260);
  f.dispatch->goOnline("d2", spot(2, 0));
  f.dispatch->goOnline("d3", spot(3, 0));
  EXPECT_EQ(f.ask("bob", 1).fare, 420);  // d1 is on a trip but two are free: above the threshold
}

TEST(Surge, TheWholeFareIsMultipliedAndRoundedDownOnce) {
  Fixture1 f(3, 133);
  EXPECT_EQ(f.ask("ann", 3).fare, (300 + 360) * 133 / 100);  // 877, not 876
  EXPECT_EQ(f.ask("bob", 1).fare, 420 * 133 / 100);          // 558
}

TEST(Surge, TheMultiplierIsFixedWhenTheRideIsRequested) {
  Fixture1 f(3, 200);
  const auto r = f.ask("ann", 2);
  EXPECT_EQ(r.fare, 1080);
  // Supply recovers while the ride is under way.
  f.dispatch->addDriver("d4");
  f.dispatch->addDriver("d5");
  f.dispatch->goOnline("d4", spot(5, 5));
  f.dispatch->goOnline("d5", spot(6, 6));
  f.dispatch->driverArrived(r.trip, r.driver);
  f.dispatch->startTrip(r.trip, r.driver);
  EXPECT_EQ(f.dispatch->completeTrip(r.trip, r.driver).fare, 1080);
}

TEST(Surge, ARideWithoutSurgeStaysWithoutItWhenSupplyDries) {
  Fixture1 f(1, 200);
  const auto r = f.ask("ann", 2);  // 3 free: plain
  EXPECT_EQ(r.fare, 540);
  f.dispatch->goOffline("d2");
  f.dispatch->goOffline("d3");
  f.dispatch->driverArrived(r.trip, r.driver);
  f.dispatch->startTrip(r.trip, r.driver);
  EXPECT_EQ(f.dispatch->completeTrip(r.trip, r.driver).fare, 540);
}

TEST(Surge, EverythingElseBehavesAsBefore) {
  Fixture1 f(0, 500);
  f.dispatch->goOnline("d2", spot(50, 0));
  f.dispatch->goOnline("d1", spot(0, 51));  // out of reach
  const auto r = f.dispatch->requestRide("ann", spot(0, 0), spot(0, 4));
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.driver, "d3");  // d3 at (3, 0) is nearest of those within 50
  EXPECT_EQ(r.fare, 780);     // threshold 0 and three free drivers: no surge
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "ann") == Status::Ok);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Cancelled);
  EXPECT_TRUE(f.dispatch->driverState("d3") == DriverState::Available);
}
