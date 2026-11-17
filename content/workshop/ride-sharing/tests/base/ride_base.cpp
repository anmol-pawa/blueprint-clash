#include <memory>
#include <string>

#include "api.h"
#include "bp_test.h"

using ride::Point;
using ride::Status;
using ride::TripState;

namespace {
Point at(int x, int y) { return Point{x, y}; }

// Drivers ana (0,0), ben (3,0) and cy (0,4), all online. They are registered in an order that is neither alphabetical
// nor by distance, so "first registered" is never the right answer by accident. The usual trip is from (1,0) to (1,6):
// six blocks, so the fare is 310 + 125 * 6 = 1060.
struct Fixture {
  std::unique_ptr<ride::Rides> rides = ride::makeRides();
  Fixture() {
    rides->registerDriver("ben", at(3, 0));
    rides->registerDriver("cy", at(0, 4));
    rides->registerDriver("ana", at(0, 0));
    for (const char* name : {"ana", "ben", "cy"}) rides->goOnline(name);
  }
  ride::RequestResult ask(const std::string& rider, Point pickup = at(1, 0), Point dropoff = at(1, 6)) {
    return rides->requestRide(rider, pickup, dropoff);
  }
  // Takes a rider all the way to the end of a trip with the matched driver.
  ride::CompleteResult drive(const std::string& rider, Point pickup, Point dropoff) {
    const auto r = ask(rider, pickup, dropoff);
    rides->arrived(r.trip, r.driver);
    rides->start(r.trip, r.driver);
    return rides->complete(r.trip, r.driver);
  }
};
}  // namespace

TEST(Setup, AFactoryAlwaysReturnsASystem) { EXPECT_TRUE(ride::makeRides() != nullptr); }

TEST(Setup, DriversNeedANewNameAndAPointOnTheMap) {
  auto rides = ride::makeRides();
  EXPECT_TRUE(rides->registerDriver("ana", at(0, 0)));
  EXPECT_FALSE(rides->registerDriver("ana", at(5, 5)));
  EXPECT_FALSE(rides->registerDriver("", at(0, 0)));
  EXPECT_FALSE(rides->registerDriver("far", at(1001, 0)));
  EXPECT_FALSE(rides->registerDriver("far", at(0, -1001)));
  EXPECT_EQ(rides->driver("ana").at.x, 0);  // the refused duplicate moved nobody
  EXPECT_TRUE(rides->driver("far").status == Status::UnknownDriver);
}

TEST(Setup, TheEdgeOfTheMapIsOnTheMap) {
  auto rides = ride::makeRides();
  EXPECT_TRUE(rides->registerDriver("corner", at(1000, -1000)));
  EXPECT_TRUE(rides->moveDriver("corner", at(-1000, 1000)) == Status::Ok);
  EXPECT_TRUE(rides->moveDriver("corner", at(1001, 0)) == Status::InvalidRequest);
  EXPECT_EQ(rides->driver("corner").at.x, -1000);  // a refused move changes nothing
  EXPECT_EQ(rides->driver("corner").at.y, 1000);
}

TEST(Setup, ANewDriverIsOfflineAndUnknownDriversAreReported) {
  Fixture f;
  EXPECT_TRUE(f.rides->registerDriver("dan", at(2, 2)));
  const auto info = f.rides->driver("dan");
  EXPECT_TRUE(info.status == Status::Ok);
  EXPECT_FALSE(info.online);
  EXPECT_FALSE(info.onTrip);
  EXPECT_TRUE(f.rides->goOnline("nobody") == Status::UnknownDriver);
  EXPECT_TRUE(f.rides->goOffline("nobody") == Status::UnknownDriver);
  EXPECT_TRUE(f.rides->moveDriver("nobody", at(0, 0)) == Status::UnknownDriver);
  EXPECT_TRUE(f.rides->goOnline("dan") == Status::Ok);
  EXPECT_TRUE(f.rides->goOnline("dan") == Status::Ok);  // idempotent
  EXPECT_TRUE(f.rides->driver("dan").online);
  EXPECT_TRUE(f.rides->goOffline("dan") == Status::Ok);
  EXPECT_TRUE(f.rides->goOffline("dan") == Status::Ok);
  EXPECT_FALSE(f.rides->driver("dan").online);
}

TEST(Match, TheNearestFreeDriverIsChosenAndTheFareIsReturned) {
  Fixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.trip > 0);
  EXPECT_EQ(r.driver, std::string("ana"));  // 1 block; ben is 2, cy is 5
  EXPECT_EQ(r.fare, 1060);
  EXPECT_TRUE(f.rides->driver("ana").onTrip);
  EXPECT_FALSE(f.rides->driver("ben").onTrip);
  const auto info = f.rides->trip(r.trip);
  EXPECT_TRUE(info.status == Status::Ok);
  EXPECT_TRUE(info.state == TripState::Matched);
  EXPECT_EQ(info.rider, std::string("ann"));
  EXPECT_EQ(info.driver, std::string("ana"));
  EXPECT_EQ(info.fare, 1060);
}

TEST(Match, TheNearestDriverNotTheFarthestOrTheFirstRegistered) {
  Fixture f;
  EXPECT_EQ(f.ask("ann", at(3, 1)).driver, std::string("ben"));   // ben 1, ana 4, cy 6
  EXPECT_EQ(f.ask("bob", at(0, 6)).driver, std::string("cy"));    // cy 2, ana 6, ben 9
}

TEST(Match, EqualDistancesGoToTheLowestName) {
  Fixture f;
  // (0,2) is two blocks from ana (0,0) and two from cy (0,4); ben is five away.
  EXPECT_EQ(f.ask("ann", at(0, 2), at(0, 3)).driver, std::string("ana"));
  EXPECT_EQ(f.ask("bob", at(0, 2), at(0, 3)).driver, std::string("cy"));  // ana is on a trip now
}

TEST(Match, MovingADriverChangesWhoIsNearest) {
  Fixture f;
  EXPECT_TRUE(f.rides->moveDriver("cy", at(1, 1)) == Status::Ok);
  EXPECT_EQ(f.ask("ann").driver, std::string("ana"));  // ana 1, cy 1: the tie goes to the lower name
  Fixture g;
  EXPECT_TRUE(g.rides->moveDriver("cy", at(1, 0)) == Status::Ok);
  EXPECT_EQ(g.ask("ann").driver, std::string("cy"));
}

TEST(Match, NobodyBeyondTheLimitIsMatched) {
  Fixture f;
  // (0,-20) is 20 blocks from ana, 23 from ben and 24 from cy.
  const auto r = f.ask("ann", at(0, -20), at(0, -21));
  EXPECT_TRUE(r.status == Status::NoDriverAvailable);
  EXPECT_EQ(r.trip, 0);
  EXPECT_EQ(r.driver, std::string(""));
  EXPECT_EQ(r.fare, 0);
  EXPECT_FALSE(f.rides->driver("ana").onTrip);
}

TEST(Match, ADriverExactlyAtTheLimitIsStillMatched) {
  Fixture f;
  f.rides->goOffline("ben");
  f.rides->goOffline("cy");
  f.rides->moveDriver("ana", at(10, 0));
  EXPECT_TRUE(f.ask("ann", at(0, 0), at(0, 3)).status == Status::Ok);  // ten blocks
  Fixture g;
  g.rides->goOffline("ben");
  g.rides->goOffline("cy");
  g.rides->moveDriver("ana", at(11, 0));
  EXPECT_TRUE(g.ask("ann", at(0, 0), at(0, 3)).status == Status::NoDriverAvailable);  // eleven
}

TEST(Match, OfflineDriversAreNeverMatched) {
  Fixture f;
  f.rides->goOffline("ana");
  f.rides->goOffline("ben");
  EXPECT_EQ(f.ask("ann").driver, std::string("cy"));
  Fixture g;
  for (const char* name : {"ana", "ben", "cy"}) g.rides->goOffline(name);
  EXPECT_TRUE(g.ask("ann").status == Status::NoDriverAvailable);
}

TEST(Match, ADriverOnATripIsNotMatchedAgain) {
  Fixture f;
  EXPECT_EQ(f.ask("r1").driver, std::string("ana"));
  EXPECT_EQ(f.ask("r2").driver, std::string("ben"));
  EXPECT_EQ(f.ask("r3").driver, std::string("cy"));
  EXPECT_TRUE(f.ask("r4").status == Status::NoDriverAvailable);
}

TEST(Match, ARiderWithAnOpenTripCannotRequestAnother) {
  Fixture f;
  const auto first = f.ask("ann");
  EXPECT_TRUE(f.ask("ann").status == Status::InvalidState);
  EXPECT_FALSE(f.rides->driver("ben").onTrip);  // the refused request took nobody
  f.rides->arrived(first.trip, first.driver);
  f.rides->start(first.trip, first.driver);
  EXPECT_TRUE(f.ask("ann").status == Status::InvalidState);  // still travelling
  f.rides->complete(first.trip, first.driver);
  EXPECT_TRUE(f.ask("ann").status == Status::Ok);  // the trip is over
}

TEST(Match, RequestsAreCheckedInTheDocumentedOrder) {
  Fixture f;
  EXPECT_TRUE(f.ask("", at(1, 0), at(1, 6)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.ask("ann", at(1001, 0), at(1, 6)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.ask("ann", at(1, 0), at(1, -1001)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.ask("ann", at(2, 2), at(2, 2)).status == Status::InvalidRequest);
  // Invalid beats "no driver" and beats "you already have a trip".
  for (const char* name : {"ana", "ben", "cy"}) f.rides->goOffline(name);
  EXPECT_TRUE(f.ask("ann", at(2, 2), at(2, 2)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.ask("ann").status == Status::NoDriverAvailable);
  for (const char* name : {"ana", "ben", "cy"}) f.rides->goOnline(name);
  EXPECT_TRUE(f.ask("ann").status == Status::Ok);
  EXPECT_TRUE(f.ask("ann", at(2, 2), at(2, 2)).status == Status::InvalidRequest);
  EXPECT_TRUE(f.ask("ann").status == Status::InvalidState);
}

TEST(Fare, TheFareIsTheBaseFarePlusTheBlocksDriven) {
  Fixture f;
  EXPECT_EQ(f.ask("ann", at(1, 0), at(1, 6)).fare, 1060);   // 310 + 6 * 125
  EXPECT_EQ(f.ask("bob", at(3, 1), at(6, -3)).fare, 1185);  // 310 + 7 * 125
  EXPECT_EQ(f.ask("cat", at(0, 6), at(0, 7)).fare, 435);    // 310 + 1 * 125
}

TEST(Fare, TheOriginalGameNeverSurges) {
  Fixture f;
  f.ask("r1", at(3, 0), at(3, 6));
  f.ask("r2", at(0, 4), at(0, 10));
  EXPECT_EQ(f.ask("r3", at(0, 0), at(0, 6)).fare, 1060);  // two of three drivers are busy
}

TEST(Lifecycle, ATripWalksThroughItsStates) {
  Fixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(f.rides->arrived(r.trip, "ana") == Status::Ok);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Arrived);
  EXPECT_TRUE(f.rides->start(r.trip, "ana") == Status::Ok);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::InProgress);
  const auto done = f.rides->complete(r.trip, "ana");
  EXPECT_TRUE(done.status == Status::Ok);
  EXPECT_EQ(done.fare, 1060);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Completed);
  EXPECT_TRUE(f.rides->trip(999).status == Status::UnknownTrip);
}

TEST(Lifecycle, EachStepNeedsTheStepBefore) {
  Fixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(f.rides->start(r.trip, "ana") == Status::InvalidState);  // not arrived yet
  EXPECT_TRUE(f.rides->complete(r.trip, "ana").status == Status::InvalidState);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Matched);
  EXPECT_TRUE(f.rides->arrived(r.trip, "ana") == Status::Ok);
  EXPECT_TRUE(f.rides->arrived(r.trip, "ana") == Status::InvalidState);  // twice
  EXPECT_TRUE(f.rides->complete(r.trip, "ana").status == Status::InvalidState);  // not started yet
  EXPECT_TRUE(f.rides->start(r.trip, "ana") == Status::Ok);
  EXPECT_TRUE(f.rides->start(r.trip, "ana") == Status::InvalidState);
  EXPECT_TRUE(f.rides->complete(r.trip, "ana").status == Status::Ok);
  EXPECT_TRUE(f.rides->complete(r.trip, "ana").status == Status::InvalidState);  // a second time
  EXPECT_TRUE(f.rides->arrived(r.trip, "ana") == Status::InvalidState);
}

TEST(Lifecycle, OnlyTheTripsOwnDriverMovesIt) {
  Fixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(f.rides->arrived(r.trip, "ben") == Status::WrongParty);
  EXPECT_TRUE(f.rides->start(r.trip, "ben") == Status::WrongParty);  // wrong party beats wrong state
  EXPECT_TRUE(f.rides->complete(r.trip, "ben").status == Status::WrongParty);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Matched);
  EXPECT_TRUE(f.rides->arrived(999, "ben") == Status::UnknownTrip);  // unknown beats everything
  EXPECT_TRUE(f.rides->complete(999, "ana").status == Status::UnknownTrip);
}

TEST(Complete, TheDriverIsFreeAtTheDropoffAfterTheTrip) {
  Fixture f;
  f.drive("ann", at(1, 0), at(1, 6));
  const auto info = f.rides->driver("ana");
  EXPECT_FALSE(info.onTrip);
  EXPECT_TRUE(info.online);
  EXPECT_EQ(info.at.x, 1);
  EXPECT_EQ(info.at.y, 6);
}

TEST(Complete, ADriverWhoFinishedIsMatchedFromTheNewPlace) {
  Fixture f;
  f.drive("ann", at(1, 0), at(1, 6));
  // Ana is now at (1,6). From (1,7) she is one block away; cy at (0,4) is four, ben at (3,0) nine.
  EXPECT_EQ(f.ask("bob", at(1, 7), at(1, 9)).driver, std::string("ana"));
}

TEST(Cancel, CancellingBeforeTheDriverArrivesIsFree) {
  Fixture f;
  const auto r = f.ask("ann");
  const auto c = f.rides->cancel(r.trip, "ann");
  EXPECT_TRUE(c.status == Status::Ok);
  EXPECT_EQ(c.fee, 0);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Cancelled);
}

TEST(Cancel, CancellingAfterTheDriverArrivedCostsTheLateFee) {
  Fixture f;
  const auto r = f.ask("ann");
  f.rides->arrived(r.trip, "ana");
  const auto c = f.rides->cancel(r.trip, "ann");
  EXPECT_TRUE(c.status == Status::Ok);
  EXPECT_EQ(c.fee, 200);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Cancelled);
}

TEST(Cancel, CancellingFreesTheDriverWhereTheyWere) {
  Fixture f;
  const auto r = f.ask("ann");
  f.rides->moveDriver("ana", at(2, 1));  // driving towards the rider
  f.rides->cancel(r.trip, "ann");
  const auto info = f.rides->driver("ana");
  EXPECT_FALSE(info.onTrip);
  EXPECT_TRUE(info.online);
  EXPECT_EQ(info.at.x, 2);
  EXPECT_EQ(info.at.y, 1);
  EXPECT_EQ(f.ask("bob").driver, std::string("ana"));  // and she can be matched again: two blocks, tied with ben
  EXPECT_TRUE(f.ask("ann").status == Status::Ok);      // the rider can ask again too
}

TEST(Cancel, ATripInProgressCannotBeCancelled) {
  Fixture f;
  const auto r = f.ask("ann");
  f.rides->arrived(r.trip, "ana");
  f.rides->start(r.trip, "ana");
  const auto c = f.rides->cancel(r.trip, "ann");
  EXPECT_TRUE(c.status == Status::InvalidState);
  EXPECT_EQ(c.fee, 0);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::InProgress);
  EXPECT_TRUE(f.rides->driver("ana").onTrip);
}

TEST(Cancel, FinishedTripsCannotBeCancelledAgain) {
  Fixture f;
  const auto a = f.ask("ann");
  f.rides->cancel(a.trip, "ann");
  EXPECT_TRUE(f.rides->cancel(a.trip, "ann").status == Status::InvalidState);
  f.drive("bob", at(1, 0), at(1, 6));
  const auto b = f.ask("cat", at(1, 6), at(1, 8));
  EXPECT_TRUE(f.rides->cancel(b.trip, "cat").status == Status::Ok);
}

TEST(Cancel, OnlyTheRiderCanCancelAndChecksRunInOrder) {
  Fixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(f.rides->cancel(r.trip, "mallory").status == Status::WrongParty);
  EXPECT_TRUE(f.rides->cancel(r.trip, "ana").status == Status::WrongParty);  // the driver is not the rider
  EXPECT_TRUE(f.rides->cancel(999, "ann").status == Status::UnknownTrip);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Matched);
  EXPECT_TRUE(f.rides->driver("ana").onTrip);
  f.rides->arrived(r.trip, "ana");
  f.rides->start(r.trip, "ana");
  f.rides->complete(r.trip, "ana");
  EXPECT_TRUE(f.rides->cancel(r.trip, "mallory").status == Status::WrongParty);  // party beats state
}

TEST(Driver, AnOnlineDriverOnATripCannotGoOffline) {
  Fixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(f.rides->goOffline("ana") == Status::DriverBusy);
  EXPECT_TRUE(f.rides->driver("ana").online);
  EXPECT_TRUE(f.rides->moveDriver("ana", at(2, 1)) == Status::Ok);  // moving is allowed on a trip
  f.rides->arrived(r.trip, "ana");
  f.rides->start(r.trip, "ana");
  f.rides->complete(r.trip, "ana");
  EXPECT_TRUE(f.rides->goOffline("ana") == Status::Ok);
}
