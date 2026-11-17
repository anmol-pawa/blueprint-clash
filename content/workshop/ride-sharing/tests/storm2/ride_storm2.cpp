#include <memory>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

using ride::Point;
using ride::Status;
using ride::TripState;

namespace {
Point place(int x, int y) { return Point{x, y}; }

// Drivers ana (0,0), ben (3,0), cy (0,4) and dee (5,0), all online. The usual rider asks from (1,0): ana is 1 block
// away, ben 2, dee 4 and cy 5. The trip goes to (1,6), so the standard fare is 1060.
struct DeclineFixture {
  std::unique_ptr<ride::DecliningRides> rides = ride::makeDecliningRides();
  DeclineFixture() {
    rides->registerDriver("dee", place(5, 0));
    rides->registerDriver("ben", place(3, 0));
    rides->registerDriver("cy", place(0, 4));
    rides->registerDriver("ana", place(0, 0));
    for (const char* name : {"ana", "ben", "cy", "dee"}) rides->goOnline(name);
  }
  ride::RequestResult ask(const std::string& rider, Point pickup = place(1, 0)) {
    return rides->requestRide(rider, pickup, place(1, 6));
  }
};
}  // namespace

TEST(Decline, AFactoryReturnsASystem) { EXPECT_TRUE(ride::makeDecliningRides() != nullptr); }

TEST(Decline, ADeclinedTripGoesToTheNextBestDriverWithTheSameFare) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  EXPECT_EQ(r.driver, std::string("ana"));
  const auto d = f.rides->decline(r.trip, "ana");
  EXPECT_TRUE(d.status == Status::Ok);
  EXPECT_EQ(d.driver, std::string("ben"));
  const auto info = f.rides->trip(r.trip);
  EXPECT_TRUE(info.state == TripState::Matched);
  EXPECT_EQ(info.driver, std::string("ben"));
  EXPECT_EQ(info.fare, 1060);
  EXPECT_TRUE(f.rides->driver("ben").onTrip);
  EXPECT_TRUE(f.rides->arrived(r.trip, "ben") == Status::Ok);  // the new driver owns the trip now
}

TEST(Decline, TheDeclinerIsNotOfferedTheSameTripAgain) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  EXPECT_EQ(f.rides->decline(r.trip, "ana").driver, std::string("ben"));
  // Ana is free and nearest, but she already said no to this trip.
  EXPECT_EQ(f.rides->decline(r.trip, "ben").driver, std::string("dee"));
  EXPECT_EQ(f.rides->decline(r.trip, "dee").driver, std::string("cy"));
}

TEST(Decline, DecliningFreesTheDeclinerForOtherTrips) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  f.rides->decline(r.trip, "ana");
  const auto info = f.rides->driver("ana");
  EXPECT_FALSE(info.onTrip);
  EXPECT_TRUE(info.online);
  EXPECT_EQ(info.at.x, 0);
  EXPECT_EQ(f.ask("bob", place(0, 0)).driver, std::string("ana"));
}

TEST(Decline, WhenNobodyIsLeftTheTripIsCancelled) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  f.rides->decline(r.trip, "ana");
  f.rides->decline(r.trip, "ben");
  f.rides->decline(r.trip, "dee");
  const auto last = f.rides->decline(r.trip, "cy");
  EXPECT_TRUE(last.status == Status::NoDriverAvailable);
  EXPECT_EQ(last.driver, std::string(""));
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Cancelled);
  EXPECT_FALSE(f.rides->driver("cy").onTrip);
  EXPECT_TRUE(f.rides->decline(r.trip, "cy").status == Status::InvalidState);  // it is over
  EXPECT_TRUE(f.ask("ann").status == Status::Ok);  // the rider may ask again, with a fresh trip
}

TEST(Decline, DriversBeyondTheLimitAreNotRematched) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  f.rides->moveDriver("ben", place(40, 40));
  f.rides->moveDriver("dee", place(40, 40));
  f.rides->moveDriver("cy", place(40, 40));
  EXPECT_TRUE(f.rides->decline(r.trip, "ana").status == Status::NoDriverAvailable);
  EXPECT_TRUE(f.rides->trip(r.trip).state == TripState::Cancelled);
}

TEST(Decline, OnlyAMatchedTripCanBeDeclined) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  f.rides->arrived(r.trip, "ana");
  EXPECT_TRUE(f.rides->decline(r.trip, "ana").status == Status::InvalidState);
  f.rides->start(r.trip, "ana");
  EXPECT_TRUE(f.rides->decline(r.trip, "ana").status == Status::InvalidState);
  EXPECT_EQ(f.rides->trip(r.trip).driver, std::string("ana"));
  EXPECT_TRUE(f.rides->driver("ana").onTrip);
}

TEST(Decline, OnlyTheTripsDriverCanDeclineAndChecksRunInOrder) {
  DeclineFixture f;
  const auto r = f.ask("ann");
  EXPECT_TRUE(f.rides->decline(r.trip, "ben").status == Status::WrongParty);
  EXPECT_TRUE(f.rides->decline(999, "ben").status == Status::UnknownTrip);
  EXPECT_EQ(f.rides->trip(r.trip).driver, std::string("ana"));
  EXPECT_FALSE(f.rides->driver("ben").onTrip);
  f.rides->arrived(r.trip, "ana");
  EXPECT_TRUE(f.rides->decline(r.trip, "ben").status == Status::WrongParty);  // party beats state
}

TEST(Decline, TheFareIsNotRecalculatedByADecline) {
  DeclineFixture f;
  f.ask("x", place(0, 4));  // cy is busy: 1 of 4, so the next trip is quoted at the standard fare
  const auto r = f.ask("ann");
  EXPECT_EQ(r.fare, 1060);
  const auto d = f.rides->decline(r.trip, "ana");
  EXPECT_EQ(d.driver, std::string("ben"));
  EXPECT_EQ(f.rides->trip(r.trip).fare, 1060);
  f.rides->arrived(r.trip, "ben");
  f.rides->start(r.trip, "ben");
  EXPECT_EQ(f.rides->complete(r.trip, "ben").fare, 1060);
}

TEST(Decline, SurgePricingStillApplies) {
  DeclineFixture f;
  f.ask("x", place(0, 4));
  f.ask("y", place(3, 0));
  const auto r = f.ask("ann");  // two of four busy: 50%, x1.5
  EXPECT_EQ(r.fare, 1590);
}
