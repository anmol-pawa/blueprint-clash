#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

using ride::DriverState;
using ride::Point;
using ride::Status;
using ride::TripState;

namespace {
// Drivers: alex (10,10), bea (14,10), cy (40,40). Pickup (12,10) is 2 away from both alex and bea.
struct Fixture {
  std::unique_ptr<ride::RideService> svc = ride::makeRideService();
  Fixture() {
    svc->addDriver("alex", Point{10, 10});
    svc->addDriver("bea", Point{14, 10});
    svc->addDriver("cy", Point{40, 40});
  }
};
const Point kPickup{12, 10};
const Point kDrop{12, 15};  // 5 from the pickup: fare 300 + 500
}  // namespace

TEST(Drivers, ANewDriverIsIdleAtTheirPointAndNamesAreUnique) {
  Fixture f;
  EXPECT_FALSE(f.svc->addDriver("alex", Point{1, 1}));
  EXPECT_FALSE(f.svc->addDriver("", Point{1, 1}));
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Idle);
  EXPECT_EQ(f.svc->driverLocation("alex")->x, 10);
  EXPECT_EQ(f.svc->driverLocation("alex")->y, 10);
}

TEST(Drivers, ThePointMustBeOnTheGridAndTheEdgesCount) {
  auto svc = ride::makeRideService();
  EXPECT_FALSE(svc->addDriver("a", Point{-1, 0}));
  EXPECT_FALSE(svc->addDriver("b", Point{0, -1}));
  EXPECT_FALSE(svc->addDriver("c", Point{1001, 0}));
  EXPECT_FALSE(svc->addDriver("d", Point{0, 1001}));
  EXPECT_TRUE(svc->addDriver("e", Point{0, 0}));
  EXPECT_TRUE(svc->addDriver("f", Point{1000, 1000}));
}

TEST(Drivers, AnUnknownDriverHasNoStateAndNoLocation) {
  Fixture f;
  EXPECT_EQ(f.svc->driverState("nobody"), DriverState::Unknown);
  EXPECT_FALSE(f.svc->driverLocation("nobody").has_value());
}

TEST(Request, AMatchedTripNamesTheDriverTheFareAndMakesTheDriverBusy) {
  Fixture f;
  const auto r = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(r.status, Status::Ok);
  EXPECT_GT(r.trip, 0);
  EXPECT_EQ(r.driver, std::string("alex"));
  EXPECT_EQ(r.fare, 800);
  EXPECT_EQ(f.svc->tripState(r.trip), TripState::Matched);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Busy);
  EXPECT_EQ(f.svc->driverState("bea"), DriverState::Idle);
}

TEST(Request, TheNearestDriverWins) {
  Fixture f;
  EXPECT_EQ(f.svc->requestRide("rita", Point{14, 11}, Point{14, 12}).driver, std::string("bea"));  // bea 1, alex 5
  EXPECT_EQ(f.svc->requestRide("sam", Point{14, 11}, Point{14, 12}).driver, std::string("alex"));  // bea is busy
}

TEST(Request, TiesGoToTheNameThatSortsFirstWhateverTheRegistrationOrder) {
  auto svc = ride::makeRideService();
  svc->addDriver("zoe", Point{10, 10});
  svc->addDriver("amy", Point{14, 10});
  EXPECT_EQ(svc->requestRide("rita", kPickup, kDrop).driver, std::string("amy"));
}

TEST(Request, TheRangeIsInclusive) {
  auto svc = ride::makeRideService();
  svc->addDriver("d", Point{0, 0});
  EXPECT_EQ(svc->requestRide("far", Point{21, 0}, Point{22, 0}).status, Status::NoDriverNearby);
  EXPECT_EQ(svc->requestRide("edge", Point{12, 8}, Point{22, 8}).status, Status::Ok);  // 12 + 8 = 20
}

TEST(Request, DistanceIsTheSumOfTheTwoAxesNotTheLargerOne) {
  auto svc = ride::makeRideService();
  svc->addDriver("d", Point{0, 0});
  EXPECT_EQ(svc->requestRide("r", Point{15, 15}, Point{16, 16}).status, Status::NoDriverNearby);  // 30
}

TEST(Request, OnlyIdleDriversAreMatched) {
  Fixture f;
  EXPECT_EQ(f.svc->requestRide("r1", kPickup, kDrop).driver, std::string("alex"));
  EXPECT_EQ(f.svc->requestRide("r2", kPickup, kDrop).driver, std::string("bea"));
  EXPECT_EQ(f.svc->requestRide("r3", kPickup, kDrop).status, Status::NoDriverNearby);
}

TEST(Request, AnOfflineDriverIsNotMatchedUntilBackOnline) {
  Fixture f;
  EXPECT_EQ(f.svc->goOffline("alex"), Status::Ok);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Offline);
  EXPECT_EQ(f.svc->requestRide("r1", kPickup, kDrop).driver, std::string("bea"));
  EXPECT_EQ(f.svc->requestRide("r2", kPickup, kDrop).status, Status::NoDriverNearby);
  EXPECT_EQ(f.svc->goOnline("alex"), Status::Ok);
  EXPECT_EQ(f.svc->requestRide("r2", kPickup, kDrop).driver, std::string("alex"));
}

TEST(Request, InvalidRequestsAreAnEmptyRiderAPointOffTheGridOrTheSamePlace) {
  Fixture f;
  EXPECT_EQ(f.svc->requestRide("", kPickup, kDrop).status, Status::InvalidRequest);
  EXPECT_EQ(f.svc->requestRide("r", Point{-1, 10}, kDrop).status, Status::InvalidRequest);
  EXPECT_EQ(f.svc->requestRide("r", kPickup, Point{12, 1001}).status, Status::InvalidRequest);
  EXPECT_EQ(f.svc->requestRide("r", kPickup, kPickup).status, Status::InvalidRequest);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Idle);
}

TEST(Request, TheChecksRunInTheDocumentedOrder) {
  auto svc = ride::makeRideService();
  EXPECT_EQ(svc->requestRide("", Point{1, 1}, Point{1, 1}).status, Status::InvalidRequest);
  EXPECT_EQ(svc->requestRide("r", Point{1, 1}, Point{1, 2}).status, Status::NoDriverNearby);
  svc->addDriver("d", Point{1, 1});
  EXPECT_EQ(svc->requestRide("r", Point{1, 1}, Point{1, 2}).status, Status::Ok);
  // Busy rider, bad request: InvalidRequest. Busy rider, valid request with nobody near: RiderBusy.
  EXPECT_EQ(svc->requestRide("r", Point{1, 1}, Point{1, 1}).status, Status::InvalidRequest);
  EXPECT_EQ(svc->requestRide("r", Point{500, 500}, Point{501, 500}).status, Status::RiderBusy);
}

TEST(Request, ARiderWithAnActiveTripIsBusyUntilItEnds) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->requestRide("rita", kPickup, kDrop).status, Status::RiderBusy);
  f.svc->start(t.trip, "alex");
  EXPECT_EQ(f.svc->requestRide("rita", kPickup, kDrop).status, Status::RiderBusy);
  f.svc->complete(t.trip, "alex");
  EXPECT_EQ(f.svc->requestRide("rita", kPickup, kDrop).status, Status::Ok);
}

TEST(Request, ACancelledTripLeavesTheRiderFree) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::Ok);
  EXPECT_EQ(f.svc->requestRide("rita", kPickup, kDrop).status, Status::Ok);
}

TEST(Request, AFailedRequestChangesNothingAndBurnsNoId) {
  Fixture f;
  const auto first = f.svc->requestRide("r1", kPickup, kDrop);
  EXPECT_EQ(f.svc->requestRide("r1", kPickup, kDrop).status, Status::RiderBusy);
  EXPECT_EQ(f.svc->requestRide("", kPickup, kDrop).status, Status::InvalidRequest);
  EXPECT_EQ(f.svc->requestRide("r3", Point{500, 500}, Point{501, 500}).status, Status::NoDriverNearby);
  const auto second = f.svc->requestRide("r2", kPickup, kDrop);
  EXPECT_EQ(second.trip, first.trip + 1);
}

TEST(Request, TheFareIsTheBasePlusTheDistanceFromPickupToDestination) {
  Fixture f;
  EXPECT_EQ(f.svc->requestRide("r1", kPickup, Point{12, 11}).fare, 400);
  EXPECT_EQ(f.svc->requestRide("r2", kPickup, Point{52, 11}).fare, 300 + 100 * 41);
}

TEST(Request, TheFareIgnoresHowFarTheDriverHadToComeAndUsesBothAxes) {
  Fixture f;
  const auto r = f.svc->requestRide("r", Point{14, 11}, Point{17, 15});  // 3 + 4 = 7
  EXPECT_EQ(r.fare, 300 + 700);
}

TEST(Cancel, CancellingAMatchedTripFreesTheDriverWhereTheyWere) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::Ok);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Cancelled);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Idle);
  EXPECT_EQ(f.svc->driverLocation("alex")->x, 10);
  EXPECT_EQ(f.svc->requestRide("sam", kPickup, kDrop).driver, std::string("alex"));
}

TEST(Cancel, OnlyTheRiderCanCancelAndAFailureChangesNothing) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->cancel(t.trip, "sam"), Status::WrongParty);
  EXPECT_EQ(f.svc->cancel(t.trip, "alex"), Status::WrongParty);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Matched);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Busy);
}

TEST(Cancel, FailuresAreReportedInTheDocumentedOrder) {
  Fixture f;
  EXPECT_EQ(f.svc->cancel(77, "anyone"), Status::UnknownTrip);
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  f.svc->cancel(t.trip, "rita");
  EXPECT_EQ(f.svc->cancel(t.trip, "sam"), Status::WrongParty);
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::WrongState);
}

TEST(Cancel, ATripInProgressOrFinishedCannotBeCancelled) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  f.svc->start(t.trip, "alex");
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::WrongState);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::InProgress);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Busy);
  f.svc->complete(t.trip, "alex");
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::WrongState);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Completed);
}

TEST(Start, TheMatchedDriverStartsTheTripAndIsAtThePickup) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->start(t.trip, "alex"), Status::Ok);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::InProgress);
  EXPECT_EQ(f.svc->driverLocation("alex")->x, 12);
  EXPECT_EQ(f.svc->driverLocation("alex")->y, 10);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Busy);
}

TEST(Start, OnlyTheMatchedDriverMayStartAndFailuresChangeNothing) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->start(99, "alex"), Status::UnknownTrip);
  EXPECT_EQ(f.svc->start(t.trip, "bea"), Status::WrongParty);
  EXPECT_EQ(f.svc->start(t.trip, "rita"), Status::WrongParty);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Matched);
  EXPECT_EQ(f.svc->driverLocation("alex")->x, 10);
}

TEST(Start, ATripStartsOnlyOnceAndNeverAfterACancel) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->start(t.trip, "alex"), Status::Ok);
  EXPECT_EQ(f.svc->start(t.trip, "alex"), Status::WrongState);
  const auto u = f.svc->requestRide("sam", kPickup, kDrop);
  f.svc->cancel(u.trip, "sam");
  EXPECT_EQ(f.svc->start(u.trip, "bea"), Status::WrongState);
}

TEST(Complete, CompletingChargesTheFareAndLeavesTheDriverIdleAtTheDestination) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  f.svc->start(t.trip, "alex");
  const auto c = f.svc->complete(t.trip, "alex");
  EXPECT_EQ(c.status, Status::Ok);
  EXPECT_EQ(c.fare, 800);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Completed);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Idle);
  EXPECT_EQ(f.svc->driverLocation("alex")->x, 12);
  EXPECT_EQ(f.svc->driverLocation("alex")->y, 15);
}

TEST(Complete, OnlyAStartedTripCompletesAndAFailureChargesNothing) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->complete(t.trip, "alex").status, Status::WrongState);
  f.svc->start(t.trip, "alex");
  EXPECT_EQ(f.svc->complete(55, "alex").status, Status::UnknownTrip);
  EXPECT_EQ(f.svc->complete(t.trip, "bea").status, Status::WrongParty);
  EXPECT_EQ(f.svc->complete(t.trip, "bea").fare, 0);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::InProgress);
  EXPECT_EQ(f.svc->complete(t.trip, "alex").status, Status::Ok);
  const auto again = f.svc->complete(t.trip, "alex");
  EXPECT_EQ(again.status, Status::WrongState);
  EXPECT_EQ(again.fare, 0);
}

TEST(Complete, ADriverWhoFinishedIsMatchedFromWhereTheyNowAre) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, Point{12, 40});
  f.svc->start(t.trip, "alex");
  f.svc->complete(t.trip, "alex");
  // alex is now at (12,40); cy at (40,40) is 28 away from (12,40), alex is 0 away.
  EXPECT_EQ(f.svc->requestRide("sam", Point{12, 41}, Point{12, 42}).driver, std::string("alex"));
}

TEST(Offline, StateChangesAreReportedInTheDocumentedOrder) {
  Fixture f;
  EXPECT_EQ(f.svc->goOffline("nobody"), Status::UnknownDriver);
  EXPECT_EQ(f.svc->goOnline("nobody"), Status::UnknownDriver);
  EXPECT_EQ(f.svc->goOnline("alex"), Status::WrongState);
  EXPECT_EQ(f.svc->goOffline("alex"), Status::Ok);
  EXPECT_EQ(f.svc->goOffline("alex"), Status::WrongState);
}

TEST(Offline, ADriverOnATripCannotGoOffline) {
  Fixture f;
  const auto t = f.svc->requestRide("rita", kPickup, kDrop);
  EXPECT_EQ(f.svc->goOffline("alex"), Status::WrongState);
  EXPECT_EQ(f.svc->goOnline("alex"), Status::WrongState);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Busy);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Matched);
}

TEST(Trips, IdsArePositiveIncreasingAndAnUnknownIdHasNoState) {
  Fixture f;
  const auto a = f.svc->requestRide("a", kPickup, kDrop);
  const auto b = f.svc->requestRide("b", kPickup, kDrop);
  EXPECT_GT(a.trip, 0);
  EXPECT_GT(b.trip, a.trip);
  EXPECT_EQ(f.svc->tripState(12345), TripState::None);
  EXPECT_EQ(f.svc->tripState(ride::kNoTrip), TripState::None);
}

namespace {
// A tiny model: each driver has a point and a flag; the brute-force expectation picks the nearest idle by name.
struct Model {
  struct D { std::string name; Point at; bool idle; };
  std::vector<D> drivers;
  static int dist(Point a, Point b) { return (a.x > b.x ? a.x - b.x : b.x - a.x) + (a.y > b.y ? a.y - b.y : b.y - a.y); }
  std::string expect(Point from) const {
    std::string best;
    int bestD = 1 << 30;
    for (const auto& d : drivers) {
      if (!d.idle) continue;
      const int x = dist(d.at, from);
      if (x > ride::kMaxPickupDistance) continue;
      if (x < bestD || (x == bestD && d.name < best)) { bestD = x; best = d.name; }
    }
    return best;
  }
};
}  // namespace

TEST(Contention, ManyTripsAgreeWithABruteForceModel) {
  auto svc = ride::makeRideService();
  Model m;
  unsigned s = 12345;
  auto rnd = [&s](int n) { s = s * 1103515245u + 12345u; return static_cast<int>((s >> 16) % static_cast<unsigned>(n)); };
  for (int i = 0; i < 8; ++i) {
    const std::string name = std::string("d") + static_cast<char>('a' + i);
    const Point p{rnd(30), rnd(30)};
    svc->addDriver(name, p);
    m.drivers.push_back({name, p, true});
  }
  struct Open { ride::TripId id; std::string rider; size_t driver; Point to; bool started; };
  std::vector<Open> open;
  int riderNo = 0;
  for (int step = 0; step < 400; ++step) {
    const int action = rnd(4);
    if (action <= 1) {
      const Point from{rnd(30), rnd(30)};
      Point to{rnd(30), rnd(30)};
      if (to.x == from.x && to.y == from.y) to.x = (to.x + 1) % 30;
      const std::string rider = "r" + std::to_string(riderNo++);
      const auto r = svc->requestRide(rider, from, to);
      const std::string want = m.expect(from);
      if (want.empty()) {
        EXPECT_EQ(r.status, Status::NoDriverNearby);
      } else {
        ASSERT_EQ(r.status, Status::Ok);
        EXPECT_EQ(r.driver, want);
        size_t idx = 0;
        while (m.drivers[idx].name != want) ++idx;
        m.drivers[idx].idle = false;
        open.push_back({r.trip, rider, idx, to, false});
      }
    } else if (!open.empty()) {
      const size_t k = static_cast<size_t>(rnd(static_cast<int>(open.size())));
      Open o = open[k];
      auto& d = m.drivers[o.driver];
      if (!o.started && action == 2) {
        EXPECT_EQ(svc->cancel(o.id, o.rider), Status::Ok);
        d.idle = true;
        open.erase(open.begin() + static_cast<long>(k));
      } else if (!o.started) {
        // Start: the driver moves to the pickup, which the model learns from the service.
        EXPECT_EQ(svc->start(o.id, d.name), Status::Ok);
        open[k].started = true;
      } else {
        EXPECT_EQ(svc->complete(o.id, d.name).status, Status::Ok);
        d.idle = true;
        d.at = o.to;
        open.erase(open.begin() + static_cast<long>(k));
      }
    }
    for (const auto& d : m.drivers) {
      EXPECT_EQ(svc->driverState(d.name) == DriverState::Idle, d.idle);
    }
  }
}
