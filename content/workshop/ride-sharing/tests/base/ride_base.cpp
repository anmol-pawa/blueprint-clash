#include <algorithm>
#include <cstdlib>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

using ride::DriverState;
using ride::Location;
using ride::Status;
using ride::TripState;

namespace {
Location at(long long x, long long y) {
  Location p;
  p.x = x;
  p.y = y;
  return p;
}

// Drivers d1 and d2 are added, d2 first, so the lowest id is not the first added. Both start Offline.
struct Fixture {
  std::unique_ptr<ride::Dispatch> dispatch = ride::makeDispatch();
  Fixture() {
    dispatch->addDriver("d2");
    dispatch->addDriver("d1");
  }
  // Runs a whole trip with whichever driver is matched and returns the matched driver's id.
  std::string fullTrip(const std::string& rider, Location from, Location to, int stars = 0) {
    const auto r = dispatch->requestRide(rider, from, to);
    dispatch->driverArrived(r.trip, r.driver);
    dispatch->startTrip(r.trip, r.driver);
    dispatch->completeTrip(r.trip, r.driver);
    if (stars > 0) dispatch->rate(r.trip, rider, stars);
    return r.driver;
  }
};
}  // namespace

TEST(Setup, DriversNeedANewNonEmptyId) {
  Fixture f;
  EXPECT_FALSE(f.dispatch->addDriver("d1"));
  EXPECT_FALSE(f.dispatch->addDriver(""));
  EXPECT_TRUE(f.dispatch->addDriver("d3"));
  EXPECT_TRUE(f.dispatch->driverState("d3") == DriverState::Offline);
  EXPECT_TRUE(f.dispatch->driverState("nobody") == DriverState::Unknown);
}

TEST(Setup, AddingAnExistingDriverAgainChangesNothing) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 5));
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_FALSE(f.dispatch->addDriver("d1"));
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::OnTrip);
}

TEST(Setup, GoingOnlineFailsInTheDocumentedOrderAndChangesNothing) {
  Fixture f;
  EXPECT_TRUE(f.dispatch->goOnline("ghost", at(5000, 0)) == Status::UnknownDriver);
  EXPECT_TRUE(f.dispatch->goOnline("d1", at(1001, 0)) == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->goOnline("d1", at(0, -1001)) == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Offline);
  EXPECT_TRUE(f.dispatch->goOnline("d1", at(-1000, 1000)) == Status::Ok);
  f.dispatch->goOnline("d2", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 5));
  EXPECT_TRUE(f.dispatch->goOnline(r.driver, at(1, 1)) == Status::DriverBusy);
  EXPECT_TRUE(f.dispatch->goOnline(r.driver, at(5000, 5000)) == Status::InvalidRequest);
}

TEST(Setup, GoingOnlineAgainMovesTheDriver) {
  Fixture f;
  f.dispatch->goOnline("d1", at(40, 0));
  f.dispatch->goOnline("d2", at(10, 0));
  f.dispatch->goOnline("d2", at(45, 0));  // d2 moves away; d1 is now nearer to the origin
  EXPECT_EQ(f.dispatch->requestRide("ann", at(0, 0), at(0, 5)).driver, "d1");
}

TEST(Setup, GoingOfflineIsRefusedOnATripAndIsRepeatable) {
  Fixture f;
  EXPECT_TRUE(f.dispatch->goOffline("ghost") == Status::UnknownDriver);
  f.dispatch->goOnline("d1", at(0, 0));
  EXPECT_TRUE(f.dispatch->goOffline("d1") == Status::Ok);
  EXPECT_TRUE(f.dispatch->goOffline("d1") == Status::Ok);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Offline);
  f.dispatch->goOnline("d1", at(0, 0));
  f.dispatch->requestRide("ann", at(0, 0), at(0, 5));
  EXPECT_TRUE(f.dispatch->goOffline("d1") == Status::DriverBusy);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::OnTrip);
}

TEST(Match, TheNearestDriverGetsTheRideAndIsBusy) {
  Fixture f;
  f.dispatch->goOnline("d1", at(10, 0));
  f.dispatch->goOnline("d2", at(3, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 5));
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.driver, "d2");
  EXPECT_TRUE(r.trip != ride::kNoTrip);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Matched);
  EXPECT_TRUE(f.dispatch->driverState("d2") == DriverState::OnTrip);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Available);
}

TEST(Match, DistanceIsManhattanNotAStraightLine) {
  Fixture f;
  f.dispatch->goOnline("d1", at(3, 3));  // 6 blocks away, but only 4.2 as the crow flies
  f.dispatch->goOnline("d2", at(0, 5));  // 5 blocks away
  EXPECT_EQ(f.dispatch->requestRide("ann", at(0, 0), at(0, 9)).driver, "d2");
}

TEST(Match, EqualDistancesGoToTheLowestDriverId) {
  Fixture f;
  f.dispatch->goOnline("d2", at(4, 0));
  f.dispatch->goOnline("d1", at(0, -4));
  EXPECT_EQ(f.dispatch->requestRide("ann", at(0, 0), at(0, 9)).driver, "d1");
}

TEST(Match, ADriverBeyondFiftyUnitsIsNeverMatched) {
  Fixture f;
  f.dispatch->goOnline("d1", at(26, 25));  // exactly 51 away
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(0, 0), at(0, 9)).status == Status::NoDriver);
  f.dispatch->goOnline("d2", at(25, -25));  // exactly 50 away: allowed
  EXPECT_EQ(f.dispatch->requestRide("ann", at(0, 0), at(0, 9)).driver, "d2");
}

TEST(Match, OfflineAndBusyDriversAreSkipped) {
  Fixture f;
  f.dispatch->goOnline("d1", at(1, 0));
  f.dispatch->goOnline("d2", at(20, 0));
  EXPECT_EQ(f.dispatch->requestRide("ann", at(0, 0), at(0, 9)).driver, "d1");  // d1 is now busy
  EXPECT_EQ(f.dispatch->requestRide("bob", at(0, 0), at(0, 9)).driver, "d2");
  EXPECT_TRUE(f.dispatch->requestRide("cat", at(0, 0), at(0, 9)).status == Status::NoDriver);
  f.dispatch->goOffline("d1");  // busy: refused, so still busy
  EXPECT_TRUE(f.dispatch->requestRide("dan", at(0, 0), at(0, 9)).status == Status::NoDriver);
}

TEST(Match, TheFareIsTheBasePlusThePriceOfTheDistance) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(3, -4));  // 7 units
  EXPECT_EQ(r.fare, 300 + 7 * 120);
}

TEST(Match, TheRequestIsCheckedAgainstTheGridAndForAnEmptyTrip) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  EXPECT_TRUE(f.dispatch->requestRide("", at(0, 0), at(0, 5)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(1001, 0), at(0, 5)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(0, 0), at(0, -1001)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(7, 7), at(7, 7)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Available);
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(1000, 1000), at(-1000, -1000)).status == Status::NoDriver);
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(0, 0), at(1000, 1000)).status == Status::Ok);
}

TEST(Match, ARiderWithAnUnfinishedTripCannotRequestAnotherAndFailuresChangeNothing) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  f.dispatch->goOnline("d2", at(1, 0));
  const auto first = f.dispatch->requestRide("ann", at(0, 0), at(0, 5));
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(0, 0), at(0, 5)).status == Status::RiderBusy);
  EXPECT_TRUE(f.dispatch->driverState("d2") == DriverState::Available);
  // The documented order: InvalidRequest comes before RiderBusy, RiderBusy before NoDriver.
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(4, 4), at(4, 4)).status == Status::InvalidRequest);
  f.dispatch->requestRide("bob", at(0, 0), at(0, 5));
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(0, 0), at(0, 5)).status == Status::RiderBusy);
  EXPECT_TRUE(f.dispatch->requestRide("cat", at(0, 0), at(0, 5)).status == Status::NoDriver);
  EXPECT_TRUE(f.dispatch->state(first.trip) == TripState::Matched);
}

TEST(Trip, ATripWalksThroughItsStatesInOrder) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(2, 0), at(2, 6));
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "d1") == Status::Ok);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::DriverArrived);
  EXPECT_TRUE(f.dispatch->startTrip(r.trip, "d1") == Status::Ok);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::InProgress);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::OnTrip);
  const auto done = f.dispatch->completeTrip(r.trip, "d1");
  EXPECT_TRUE(done.status == Status::Ok);
  EXPECT_EQ(done.fare, r.fare);
  EXPECT_EQ(done.fare, 300 + 6 * 120);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Completed);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Available);
}

TEST(Trip, StatesCannotBeSkippedOrRepeated) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  EXPECT_TRUE(f.dispatch->startTrip(r.trip, "d1") == Status::BadState);
  EXPECT_TRUE(f.dispatch->completeTrip(r.trip, "d1").status == Status::BadState);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Matched);
  f.dispatch->driverArrived(r.trip, "d1");
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "d1") == Status::BadState);
  EXPECT_TRUE(f.dispatch->completeTrip(r.trip, "d1").status == Status::BadState);
  f.dispatch->startTrip(r.trip, "d1");
  EXPECT_TRUE(f.dispatch->startTrip(r.trip, "d1") == Status::BadState);
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "d1") == Status::BadState);
  f.dispatch->completeTrip(r.trip, "d1");
  EXPECT_TRUE(f.dispatch->completeTrip(r.trip, "d1").status == Status::BadState);
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "d1") == Status::BadState);
}

TEST(Trip, FailuresAreReportedInTheDocumentedOrder) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  f.dispatch->goOnline("d2", at(30, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  EXPECT_TRUE(f.dispatch->driverArrived(999, "d1") == Status::UnknownTrip);
  EXPECT_TRUE(f.dispatch->startTrip(0, "d1") == Status::UnknownTrip);
  EXPECT_TRUE(f.dispatch->completeTrip(-4, "d1").status == Status::UnknownTrip);
  // d2 is not this trip's driver: that is reported before the trip being in the wrong state.
  EXPECT_TRUE(f.dispatch->startTrip(r.trip, "d2") == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->completeTrip(r.trip, "d2").status == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "d2") == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->driverArrived(r.trip, "") == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Matched);
  EXPECT_TRUE(f.dispatch->state(12345) == TripState::Unknown);
}

TEST(Trip, ACompletedDriverIsAvailableAtTheDropoff) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  f.dispatch->goOnline("d2", at(10, 0));
  f.fullTrip("ann", at(0, 0), at(30, 30));  // d1, now at (30, 30)
  EXPECT_EQ(f.dispatch->requestRide("bob", at(29, 30), at(0, 0)).driver, "d1");
}

TEST(Trip, ADriverWhoHasArrivedIsAtThePickupSpot) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(20, 0), at(20, 8));
  f.dispatch->driverArrived(r.trip, "d1");
  f.dispatch->cancel(r.trip, "ann");
  f.dispatch->goOnline("d2", at(10, 0));
  // d1 stands at the pickup (20, 0); d2 is at (10, 0). A rider at (22, 0) is nearer to d1 (2 against 12).
  EXPECT_EQ(f.dispatch->requestRide("bob", at(22, 0), at(22, 9)).driver, "d1");
}

TEST(Trip, AFinishedTripStaysReadableAndItsRiderCanRideAgain) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto first = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  f.dispatch->driverArrived(first.trip, "d1");
  f.dispatch->startTrip(first.trip, "d1");
  f.dispatch->completeTrip(first.trip, "d1");
  EXPECT_TRUE(f.dispatch->state(first.trip) == TripState::Completed);
  const auto second = f.dispatch->requestRide("ann", at(0, 6), at(0, 0));
  EXPECT_TRUE(second.status == Status::Ok);
  EXPECT_TRUE(second.trip != first.trip);
  EXPECT_TRUE(f.dispatch->state(first.trip) == TripState::Completed);
}

TEST(Cancel, OnlyTheRiderCanCancelAndAFailureChangesNothing) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "bob") == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "d1") == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->cancel(777, "ann") == Status::UnknownTrip);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Matched);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::OnTrip);
}

TEST(Cancel, CancellingBeforeArrivalFreesTheDriverWhereTheyWere) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 8));
  f.dispatch->goOnline("d2", at(0, 20));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  EXPECT_EQ(r.driver, "d1");
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "ann") == Status::Ok);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::Cancelled);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::Available);
  EXPECT_EQ(f.dispatch->requestRide("bob", at(0, 9), at(0, 0)).driver, "d1");
}

TEST(Cancel, CancellingAfterArrivalLeavesTheDriverAtThePickup) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(30, 0), at(30, 5));
  f.dispatch->driverArrived(r.trip, "d1");
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "ann") == Status::Ok);
  f.dispatch->goOnline("d2", at(0, 0));
  // d1 stands at (30, 0), 25 from a rider at (55, 0); d2 at the origin is 55 away, out of reach.
  EXPECT_EQ(f.dispatch->requestRide("bob", at(55, 0), at(55, 9)).driver, "d1");
}

TEST(Cancel, ARideInProgressCannotBeCancelled) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  f.dispatch->driverArrived(r.trip, "d1");
  f.dispatch->startTrip(r.trip, "d1");
  EXPECT_TRUE(f.dispatch->cancel(r.trip, "ann") == Status::BadState);
  EXPECT_TRUE(f.dispatch->state(r.trip) == TripState::InProgress);
  EXPECT_TRUE(f.dispatch->driverState("d1") == DriverState::OnTrip);
}

TEST(Cancel, AFinishedTripCannotBeCancelled) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto a = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  f.dispatch->cancel(a.trip, "ann");
  EXPECT_TRUE(f.dispatch->cancel(a.trip, "ann") == Status::BadState);
  const auto b = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  f.dispatch->driverArrived(b.trip, "d1");
  f.dispatch->startTrip(b.trip, "d1");
  f.dispatch->completeTrip(b.trip, "d1");
  EXPECT_TRUE(f.dispatch->cancel(b.trip, "ann") == Status::BadState);
  EXPECT_TRUE(f.dispatch->state(b.trip) == TripState::Completed);
}

TEST(Cancel, ACancelledRiderCanRequestAgain) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto a = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  f.dispatch->cancel(a.trip, "ann");
  EXPECT_TRUE(f.dispatch->requestRide("ann", at(0, 0), at(0, 6)).status == Status::Ok);
}

TEST(Rating, ARatingNeedsACompletedTripFromItsRiderAndIsCheckedInOrder) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  EXPECT_TRUE(f.dispatch->rate(555, "ann", 5) == Status::UnknownTrip);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "bob", 5) == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "bob", 9) == Status::WrongParty);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 0) == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 6) == Status::InvalidRequest);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 5) == Status::BadState);  // not completed yet
  f.dispatch->driverArrived(r.trip, "d1");
  f.dispatch->startTrip(r.trip, "d1");
  f.dispatch->completeTrip(r.trip, "d1");
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 5) == Status::Ok);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 1) == Status::AlreadyRated);
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 9) == Status::InvalidRequest);
  EXPECT_EQ(f.dispatch->rating("d1"), 500);
}

TEST(Rating, ACancelledTripCannotBeRated) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  const auto r = f.dispatch->requestRide("ann", at(0, 0), at(0, 6));
  f.dispatch->cancel(r.trip, "ann");
  EXPECT_TRUE(f.dispatch->rate(r.trip, "ann", 5) == Status::BadState);
  EXPECT_EQ(f.dispatch->rating("d1"), 300);
}

TEST(Rating, AnUnratedDriverCountsAsThreeAndAnUnknownOneAsZero) {
  Fixture f;
  EXPECT_EQ(f.dispatch->rating("d1"), 300);
  EXPECT_EQ(f.dispatch->rating("ghost"), 0);
}

TEST(Rating, TheAverageIsInHundredthsRoundedDown) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  f.fullTrip("a", at(0, 0), at(0, 1), 5);
  f.fullTrip("b", at(0, 1), at(0, 2), 4);
  EXPECT_EQ(f.dispatch->rating("d1"), 450);
  f.fullTrip("c", at(0, 2), at(0, 3), 4);
  EXPECT_EQ(f.dispatch->rating("d1"), 433);  // 13 / 3 = 4.333...
  f.fullTrip("d", at(0, 3), at(0, 4), 1);
  EXPECT_EQ(f.dispatch->rating("d1"), 350);
  f.fullTrip("e", at(0, 4), at(0, 5), 1);
  f.fullTrip("f", at(0, 5), at(0, 6), 1);
  EXPECT_EQ(f.dispatch->rating("d1"), 266);  // 16 / 6 = 2.666...: rounded down, not to nearest
}

TEST(Rating, AnotherDriversRatingsAreNotMixedIn) {
  Fixture f;
  f.dispatch->goOnline("d1", at(0, 0));
  f.fullTrip("a", at(0, 0), at(0, 1), 5);
  f.dispatch->goOffline("d1");
  f.dispatch->goOnline("d2", at(0, 0));
  f.fullTrip("b", at(0, 0), at(0, 1), 1);
  EXPECT_EQ(f.dispatch->rating("d1"), 500);
  EXPECT_EQ(f.dispatch->rating("d2"), 100);
}

namespace {
struct ModelDriver {
  int state = 0;  // 0 offline, 1 available, 2 on a trip
  Location where;
};
struct ModelTrip {
  ride::TripId id;
  std::string rider;
  std::string driver;
  Location pickup;
  Location dropoff;
  TripState state;
};
}  // namespace

TEST(Contention, ManyRequestsAgreeWithASimpleModel) {
  auto d = ride::makeDispatch();
  const std::vector<std::string> names = {"d0", "d1", "d2", "d3", "d4", "d5"};
  std::vector<ModelDriver> model(names.size());
  for (const auto& n : names) d->addDriver(n);
  std::vector<ModelTrip> trips;
  unsigned seed = 2024;
  auto next = [&seed](unsigned bound) {
    seed = seed * 1103515245u + 12345u;
    return (seed >> 16) % bound;
  };
  auto spot = [&next]() { return at(static_cast<long long>(next(61)) - 30, static_cast<long long>(next(61)) - 30); };
  for (int step = 0; step < 600; ++step) {
    const unsigned op = next(10);
    if (op < 4) {
      const Location from = spot();
      Location to = spot();
      if (to.x == from.x && to.y == from.y) to.x += 1;
      const std::string rider = "r" + std::to_string(step);
      int best = -1;
      long long bestDist = 0;
      for (std::size_t i = 0; i < names.size(); ++i) {
        if (model[i].state != 1) continue;
        const long long dist = std::llabs(model[i].where.x - from.x) + std::llabs(model[i].where.y - from.y);
        if (dist > 50) continue;
        if (best < 0 || dist < bestDist) {
          best = static_cast<int>(i);
          bestDist = dist;
        }
      }
      const auto r = d->requestRide(rider, from, to);
      if (best < 0) {
        EXPECT_TRUE(r.status == Status::NoDriver);
      } else {
        EXPECT_TRUE(r.status == Status::Ok);
        EXPECT_EQ(r.driver, names[static_cast<std::size_t>(best)]);
        model[static_cast<std::size_t>(best)].state = 2;
        trips.push_back({r.trip, rider, r.driver, from, to, TripState::Matched});
      }
    } else if (op < 8 && !trips.empty()) {
      ModelTrip& t = trips[next(static_cast<unsigned>(trips.size()))];
      const std::size_t di = static_cast<std::size_t>(t.driver[1] - '0');
      if (t.state == TripState::Matched) {
        EXPECT_TRUE(d->driverArrived(t.id, t.driver) == Status::Ok);
        t.state = TripState::DriverArrived;
        model[di].where = t.pickup;
      } else if (t.state == TripState::DriverArrived) {
        if (next(3) == 0) {
          EXPECT_TRUE(d->cancel(t.id, t.rider) == Status::Ok);
          t.state = TripState::Cancelled;
          model[di].state = 1;
        } else {
          EXPECT_TRUE(d->startTrip(t.id, t.driver) == Status::Ok);
          t.state = TripState::InProgress;
        }
      } else if (t.state == TripState::InProgress) {
        EXPECT_TRUE(d->completeTrip(t.id, t.driver).status == Status::Ok);
        t.state = TripState::Completed;
        model[di].state = 1;
        model[di].where = t.dropoff;
      }
    } else {
      const std::size_t di = next(static_cast<unsigned>(names.size()));
      if (model[di].state == 2) continue;
      if (next(4) == 0) {
        EXPECT_TRUE(d->goOffline(names[di]) == Status::Ok);
        model[di].state = 0;
      } else {
        const Location where = spot();
        EXPECT_TRUE(d->goOnline(names[di], where) == Status::Ok);
        model[di].state = 1;
        model[di].where = where;
      }
    }
    for (std::size_t i = 0; i < names.size(); ++i) {
      const DriverState want = model[i].state == 0 ? DriverState::Offline
                               : model[i].state == 1 ? DriverState::Available
                                                     : DriverState::OnTrip;
      EXPECT_TRUE(d->driverState(names[i]) == want);
    }
  }
  for (const auto& t : trips) EXPECT_TRUE(d->state(t.id) == t.state);
}
