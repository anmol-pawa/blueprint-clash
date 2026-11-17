#include <memory>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

using ride::DriverState;
using ride::Point;
using ride::RideClass;
using ride::Status;
using ride::TripState;

namespace {
// Cancelling an arrived trip costs 250. alex (10,10), bea (14,10).
struct Fixture2 {
  std::unique_ptr<ride::FeeService> svc = ride::makeFeeService(250);
  Fixture2() {
    svc->addDriver("alex", Point{10, 10});
    svc->addDriver("bea", Point{14, 10});
  }
  ride::RideResult ride(const std::string& rider) { return svc->requestRide(rider, Point{12, 10}, Point{12, 15}); }
};
}  // namespace

TEST(Fees, TheFactoryRefusesAFeeOutsideTheRange) {
  EXPECT_TRUE(ride::makeFeeService(-1) == nullptr);
  EXPECT_TRUE(ride::makeFeeService(ride::kMaxCancelFee + 1) == nullptr);
  EXPECT_TRUE(ride::makeFeeService(0) != nullptr);
  EXPECT_TRUE(ride::makeFeeService(ride::kMaxCancelFee) != nullptr);
}

TEST(Arrive, TheMatchedDriverArrivesAndTheTripIsStillMatched) {
  Fixture2 f;
  const auto t = f.ride("rita");
  EXPECT_FALSE(f.svc->isArrived(t.trip));
  EXPECT_EQ(f.svc->arrive(t.trip, "alex"), Status::Ok);
  EXPECT_TRUE(f.svc->isArrived(t.trip));
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Matched);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Busy);
}

TEST(Arrive, FailuresAreReportedInTheDocumentedOrderAndChangeNothing) {
  Fixture2 f;
  EXPECT_EQ(f.svc->arrive(9, "alex"), Status::UnknownTrip);
  const auto t = f.ride("rita");
  EXPECT_EQ(f.svc->arrive(t.trip, "bea"), Status::WrongParty);
  EXPECT_FALSE(f.svc->isArrived(t.trip));
  EXPECT_EQ(f.svc->arrive(t.trip, "alex"), Status::Ok);
  EXPECT_EQ(f.svc->arrive(t.trip, "alex"), Status::WrongState);
}

TEST(Arrive, ATripThatStartedOrWasCancelledCannotArrive) {
  Fixture2 f;
  const auto a = f.ride("rita");
  f.svc->start(a.trip, "alex");
  EXPECT_EQ(f.svc->arrive(a.trip, "alex"), Status::WrongState);
  const auto b = f.ride("sam");
  f.svc->cancel(b.trip, "sam");
  EXPECT_EQ(f.svc->arrive(b.trip, "bea"), Status::WrongState);
  EXPECT_FALSE(f.svc->isArrived(b.trip));
}

TEST(Cancel, CancellingBeforeTheDriverArrivesIsFree) {
  Fixture2 f;
  const auto t = f.ride("rita");
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::Ok);
  EXPECT_EQ(f.svc->feesOwed("rita"), 0);
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Idle);
}

TEST(Cancel, CancellingAnArrivedTripCostsTheFeeAndFreesTheDriver) {
  Fixture2 f;
  const auto t = f.ride("rita");
  f.svc->arrive(t.trip, "alex");
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::Ok);
  EXPECT_EQ(f.svc->feesOwed("rita"), 250);
  EXPECT_EQ(f.svc->tripState(t.trip), TripState::Cancelled);
  EXPECT_FALSE(f.svc->isArrived(t.trip));
  EXPECT_EQ(f.svc->driverState("alex"), DriverState::Idle);
}

TEST(Cancel, FeesAddUpPerRiderAndDoNotLeakToOthers) {
  Fixture2 f;
  const auto a = f.ride("rita");
  f.svc->arrive(a.trip, "alex");
  f.svc->cancel(a.trip, "rita");
  const auto b = f.ride("rita");
  f.svc->arrive(b.trip, "alex");
  f.svc->cancel(b.trip, "rita");
  EXPECT_EQ(f.svc->feesOwed("rita"), 500);
  EXPECT_EQ(f.svc->feesOwed("sam"), 0);
}

TEST(Cancel, AFailedCancelChargesNothing) {
  Fixture2 f;
  const auto t = f.ride("rita");
  f.svc->arrive(t.trip, "alex");
  EXPECT_EQ(f.svc->cancel(t.trip, "sam"), Status::WrongParty);
  EXPECT_EQ(f.svc->feesOwed("rita"), 0);
  EXPECT_EQ(f.svc->feesOwed("sam"), 0);
  f.svc->start(t.trip, "alex");
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::WrongState);
  EXPECT_EQ(f.svc->feesOwed("rita"), 0);
}

TEST(Cancel, ACancelledTripCannotBeCancelledAgainForASecondFee) {
  Fixture2 f;
  const auto t = f.ride("rita");
  f.svc->arrive(t.trip, "alex");
  f.svc->cancel(t.trip, "rita");
  EXPECT_EQ(f.svc->cancel(t.trip, "rita"), Status::WrongState);
  EXPECT_EQ(f.svc->feesOwed("rita"), 250);
}

TEST(Start, ATripStartsFromMatchedAndFromArrived) {
  Fixture2 f;
  const auto a = f.ride("rita");
  EXPECT_EQ(f.svc->start(a.trip, "alex"), Status::Ok);
  const auto b = f.ride("sam");
  f.svc->arrive(b.trip, "bea");
  EXPECT_EQ(f.svc->start(b.trip, "bea"), Status::Ok);
  EXPECT_EQ(f.svc->tripState(b.trip), TripState::InProgress);
  EXPECT_FALSE(f.svc->isArrived(b.trip));
}

TEST(Complete, AnArrivedTripCompletesAtTheNormalFareWithNoFee) {
  Fixture2 f;
  const auto t = f.ride("rita");
  f.svc->arrive(t.trip, "alex");
  f.svc->start(t.trip, "alex");
  const auto c = f.svc->complete(t.trip, "alex");
  EXPECT_EQ(c.status, Status::Ok);
  EXPECT_EQ(c.fare, 800);
  EXPECT_EQ(f.svc->feesOwed("rita"), 0);
}

TEST(Fees, AZeroFeeServiceChargesNothingForAnArrivedCancel) {
  auto svc = ride::makeFeeService(0);
  svc->addDriver("alex", Point{10, 10});
  const auto t = svc->requestRide("rita", Point{10, 10}, Point{10, 12});
  svc->arrive(t.trip, "alex");
  EXPECT_EQ(svc->cancel(t.trip, "rita"), Status::Ok);
  EXPECT_EQ(svc->feesOwed("rita"), 0);
}

TEST(Fees, TheClassesOfStormOneStillWork) {
  auto svc = ride::makeFeeService(250);
  svc->addDriverOf("x1", Point{10, 10}, RideClass::Xl);
  const auto t = svc->requestRideOf("rita", RideClass::Xl, Point{10, 10}, Point{10, 15});
  EXPECT_EQ(t.driver, std::string("x1"));
  EXPECT_EQ(t.fare, 1600);
  EXPECT_EQ(svc->requestRide("sam", Point{10, 10}, Point{10, 15}).status, Status::NoDriverNearby);
}
