#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

using ride::DriverState;
using ride::Location;
using ride::Status;

namespace {
Location spot(long long x, long long y) {
  Location p;
  p.x = x;
  p.y = y;
  return p;
}

// Rated matching with a radius of 20, and a surge of 200 percent when at most one driver is free.
struct Fixture2 {
  std::unique_ptr<ride::Dispatch> dispatch = ride::makeRatedDispatch(1, 200, 20);
  int riders = 0;
  Fixture2() {
    dispatch->addDriver("d1");
    dispatch->addDriver("d2");
    dispatch->addDriver("d3");
  }
  // One completed, rated trip with `driver`, who must be the only one online.
  void earn(const std::string& driver, int stars) {
    const auto r = dispatch->requestRide("past" + std::to_string(riders++), spot(0, 0), spot(0, 1));
    dispatch->driverArrived(r.trip, driver);
    dispatch->startTrip(r.trip, driver);
    dispatch->completeTrip(r.trip, driver);
    dispatch->rate(r.trip, "past" + std::to_string(riders - 1), stars);
  }
  // Gives a driver one rating per entry, then takes them offline.
  void history(const std::string& driver, const std::vector<int>& stars) {
    dispatch->goOnline(driver, spot(0, 0));
    for (int s : stars) earn(driver, s);
    dispatch->goOffline(driver);
  }
  void online(const std::string& driver, long long x, long long y) { dispatch->goOnline(driver, spot(x, y)); }
  std::string match(const std::string& rider) { return dispatch->requestRide(rider, spot(0, 0), spot(0, 3)).driver; }
};
}  // namespace

TEST(RatedSetup, TheFactoryRefusesBadArguments) {
  EXPECT_TRUE(ride::makeRatedDispatch(-1, 150, 10) == nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(2, 99, 10) == nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(2, 501, 10) == nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(2, 150, 0) == nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(2, 150, -3) == nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(2, 150, 51) == nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(2, 150, 1) != nullptr);
  EXPECT_TRUE(ride::makeRatedDispatch(0, 100, 50) != nullptr);
}

TEST(Rated, TheBestRatedDriverWinsEvenWhenAnotherIsNearer) {
  Fixture2 f;
  f.history("d1", {3});
  f.history("d2", {5});
  f.online("d1", 1, 0);
  f.online("d2", 15, 0);
  EXPECT_EQ(f.match("ann"), "d2");
}

TEST(Rated, AnUnratedDriverCountsAsThree) {
  Fixture2 f;
  f.history("d1", {2});
  f.history("d2", {4});
  f.online("d1", 1, 0);
  f.online("d2", 3, 0);
  f.online("d3", 9, 0);  // unrated: better than d1, worse than d2
  EXPECT_EQ(f.match("ann"), "d2");
  EXPECT_EQ(f.match("bob"), "d3");
  EXPECT_EQ(f.match("cat"), "d1");
}

TEST(Rated, EqualRatingsGoToTheNearerThenTheLowestId) {
  Fixture2 f;
  f.history("d1", {4});
  f.history("d2", {4});
  f.history("d3", {4});
  f.online("d1", 6, 0);
  f.online("d2", 6, 0);
  f.online("d3", 2, 0);
  EXPECT_EQ(f.match("ann"), "d3");
  EXPECT_EQ(f.match("bob"), "d1");
  EXPECT_EQ(f.match("cat"), "d2");
}

TEST(Rated, RatingsAreComparedExactlyNotAsRoundedHundredths) {
  Fixture2 f;
  // d1: ten ratings summing 19 (1.900). d2: eleven ratings summing 21 (1.909...). Both read 190 in hundredths.
  f.history("d1", {2, 2, 2, 2, 2, 2, 2, 2, 2, 1});
  f.history("d2", {2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1});
  EXPECT_EQ(f.dispatch->rating("d1"), 190);
  EXPECT_EQ(f.dispatch->rating("d2"), 190);
  f.online("d1", 1, 0);  // nearer and listed first, but not the better average
  f.online("d2", 5, 0);
  EXPECT_EQ(f.match("ann"), "d2");
}

TEST(Rated, OnlyDriversWithinTheRadiusAreConsidered) {
  Fixture2 f;
  f.history("d1", {1});
  f.history("d2", {5});
  f.online("d1", 20, 0);  // exactly at the radius: allowed
  f.online("d2", 21, 0);  // one too far, however good
  EXPECT_EQ(f.match("ann"), "d1");
}

TEST(Rated, NoDriverInTheRadiusIsNoDriverEvenIfAFartherOneIsFree) {
  Fixture2 f;
  f.online("d1", 30, 0);  // within the default reach of 50, outside this radius of 20
  const auto r = f.dispatch->requestRide("ann", spot(0, 0), spot(0, 3));
  EXPECT_TRUE(r.status == Status::NoDriver);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Available);
}

TEST(Rated, SurgeStillAppliesWithTheSameRules) {
  Fixture2 f;
  f.online("d1", 1, 0);
  f.online("d2", 2, 0);
  const auto first = f.dispatch->requestRide("ann", spot(0, 0), spot(0, 3));  // two free, threshold 1: plain
  EXPECT_EQ(first.fare, 660);
  const auto second = f.dispatch->requestRide("bob", spot(0, 0), spot(0, 3));  // one free: surge
  EXPECT_EQ(second.fare, 1320);
}

TEST(Rated, TheRestOfTheLifecycleIsUnchanged) {
  Fixture2 f;
  f.online("d1", 4, 0);
  const auto r = f.dispatch->requestRide("ann", spot(0, 0), spot(0, 3));
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "bob") == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->startTrip(r.trip, "d1") == Status::BadState);
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "d1") == Status::Ok);
  EXPECT_TRUE(f.dispatch->startTrip(r.trip, "d1") == Status::Ok);
  EXPECT_EQ(f.dispatch->completeTrip(r.trip, "d1").fare, 1320);  // one free driver at request time: surge
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 4) == Status::Ok);
  EXPECT_EQ(f.dispatch->rating("d1"), 400);
}
