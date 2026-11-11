#include "api_storm1.h"
#include "bp_test.h"

using park::SpotSize;
using park::Status;
using park::Vehicle;

namespace {
std::unique_ptr<park::ParkingLot> lot() {
  auto p = park::makePricedParkingLot();
  p->addSpot("s1", SpotSize::Small);
  p->addSpot("m1", SpotSize::Medium);
  p->addSpot("l1", SpotSize::Large);
  return p;
}

long long feeFor(park::ParkingLot& p, Vehicle v, int minutes) {
  auto t = p.park("PLATE", v);
  return p.leave(t.ticketId, minutes).feeCents;
}
}  // namespace

TEST(Pricing, FirstFifteenMinutesAreFree) {
  auto p = lot();
  EXPECT_EQ(feeFor(*p, Vehicle::Car, 0), 0);
  EXPECT_EQ(feeFor(*p, Vehicle::Car, 15), 0);
  EXPECT_EQ(feeFor(*p, Vehicle::Car, 16), 100);
}

TEST(Pricing, CarRateMatchesBase) {
  auto p = lot();
  EXPECT_EQ(feeFor(*p, Vehicle::Car, 60), 100);
  EXPECT_EQ(feeFor(*p, Vehicle::Car, 61), 200);
}

TEST(Pricing, TruckPaysDouble) {
  auto p = lot();
  EXPECT_EQ(feeFor(*p, Vehicle::Truck, 61), 400);
  EXPECT_EQ(feeFor(*p, Vehicle::Truck, 10), 0);
}

TEST(Pricing, MotorcycleIsHalf) {
  auto p = lot();
  EXPECT_EQ(feeFor(*p, Vehicle::Motorcycle, 61), 100);
  EXPECT_EQ(feeFor(*p, Vehicle::Motorcycle, 30), 50);
}

TEST(Pricing, MotorcycleInBiggerSpotStillPaysMotorcycleRate) {
  auto p = lot();
  auto first = p->park("M1", Vehicle::Motorcycle);  // takes the Small spot
  auto second = p->park("M2", Vehicle::Motorcycle);  // overflows into the Medium spot
  EXPECT_EQ(second.spotId, "m1");
  EXPECT_EQ(p->leave(second.ticketId, 61).feeCents, 100);
  EXPECT_EQ(p->leave(first.ticketId, 61).feeCents, 100);
}

TEST(Pricing, BaseRulesStillHold) {
  auto p = lot();
  EXPECT_EQ(p->park("T1", Vehicle::Truck).spotId, "l1");
  EXPECT_EQ(p->park("T2", Vehicle::Truck).status, Status::LotFull);
  EXPECT_EQ(p->park("T1", Vehicle::Truck).status, Status::AlreadyParked);
  EXPECT_EQ(p->leave("missing", 5).status, Status::NoSuchTicket);
  EXPECT_EQ(p->freeSpots(SpotSize::Large), 0);
}

TEST(Pricing, FreeStayStillFreesTheSpot) {
  auto p = lot();
  auto t = p->park("C1", Vehicle::Car);
  auto r = p->leave(t.ticketId, 5);
  EXPECT_EQ(r.status, Status::Ok);
  EXPECT_EQ(r.feeCents, 0);
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 1);
}
