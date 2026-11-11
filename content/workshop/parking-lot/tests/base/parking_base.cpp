#include "api.h"
#include "bp_test.h"

using park::SpotSize;
using park::Status;
using park::Vehicle;

namespace {
std::unique_ptr<park::ParkingLot> lot() {
  auto p = park::makeParkingLot();
  p->addSpot("s1", SpotSize::Small);
  p->addSpot("m1", SpotSize::Medium);
  p->addSpot("m2", SpotSize::Medium);
  p->addSpot("l1", SpotSize::Large);
  return p;
}
}  // namespace

TEST(Registration, DuplicateSpotIsRefused) {
  auto p = lot();
  EXPECT_EQ(p->addSpot("m1", SpotSize::Large), Status::DuplicateId);
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 2);
  EXPECT_EQ(p->freeSpots(SpotSize::Large), 1);
}

TEST(Parking, ParkReturnsTicketAndSpot) {
  auto p = lot();
  auto t = p->park("CAR-1", Vehicle::Car);
  EXPECT_EQ(t.status, Status::Ok);
  EXPECT_TRUE(!t.ticketId.empty());
  EXPECT_EQ(t.spotId, "m1");
  EXPECT_EQ(p->spotOf("CAR-1"), "m1");
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 1);
  EXPECT_EQ(p->spotOf("nobody"), "");
}

TEST(Parking, TicketsAreDistinct) {
  auto p = lot();
  auto a = p->park("A", Vehicle::Car);
  auto b = p->park("B", Vehicle::Car);
  EXPECT_TRUE(a.ticketId != b.ticketId);
}

TEST(Parking, MotorcycleTakesSmallestFreeSpot) {
  auto p = lot();
  EXPECT_EQ(p->park("M1", Vehicle::Motorcycle).spotId, "s1");
  EXPECT_EQ(p->park("M2", Vehicle::Motorcycle).spotId, "m1");
}

TEST(Parking, CarPrefersMediumOverLarge) {
  auto p = lot();
  EXPECT_EQ(p->park("C1", Vehicle::Car).spotId, "m1");
  EXPECT_EQ(p->park("C2", Vehicle::Car).spotId, "m2");
  EXPECT_EQ(p->park("C3", Vehicle::Car).spotId, "l1");
  EXPECT_EQ(p->park("C4", Vehicle::Car).status, Status::LotFull);
}

TEST(Parking, TruckOnlyFitsLarge) {
  auto p = lot();
  EXPECT_EQ(p->park("T1", Vehicle::Truck).spotId, "l1");
  auto second = p->park("T2", Vehicle::Truck);
  EXPECT_EQ(second.status, Status::LotFull);
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 2);
}

TEST(Parking, TruckNeverTakesSmallSpot) {
  auto p = park::makeParkingLot();
  p->addSpot("s1", SpotSize::Small);
  p->addSpot("m1", SpotSize::Medium);
  EXPECT_EQ(p->park("T1", Vehicle::Truck).status, Status::LotFull);
  EXPECT_EQ(p->park("C1", Vehicle::Car).spotId, "m1");
}

TEST(Parking, LotFullChangesNothing) {
  auto p = lot();
  p->park("T1", Vehicle::Truck);
  auto refused = p->park("T2", Vehicle::Truck);
  EXPECT_EQ(refused.status, Status::LotFull);
  EXPECT_TRUE(refused.ticketId.empty());
  EXPECT_EQ(p->spotOf("T2"), "");
  EXPECT_EQ(p->freeSpots(SpotSize::Large), 0);
}

TEST(Parking, SamePlateTwiceIsRefused) {
  auto p = lot();
  EXPECT_EQ(p->park("C1", Vehicle::Car).status, Status::Ok);
  EXPECT_EQ(p->park("C1", Vehicle::Car).status, Status::AlreadyParked);
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 1);
  EXPECT_EQ(p->spotOf("C1"), "m1");
}

TEST(Leaving, SpotIsFreedAfterLeaving) {
  auto p = lot();
  auto t = p->park("C1", Vehicle::Car);
  auto r = p->leave(t.ticketId, 30);
  EXPECT_EQ(r.status, Status::Ok);
  EXPECT_EQ(r.spotId, "m1");
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 2);
  EXPECT_EQ(p->spotOf("C1"), "");
}

TEST(Leaving, UnknownOrUsedTicketIsRefused) {
  auto p = lot();
  EXPECT_EQ(p->leave("nope", 10).status, Status::NoSuchTicket);
  auto t = p->park("C1", Vehicle::Car);
  EXPECT_EQ(p->leave(t.ticketId, 10).status, Status::Ok);
  auto again = p->leave(t.ticketId, 10);
  EXPECT_EQ(again.status, Status::NoSuchTicket);
  EXPECT_EQ(again.feeCents, 0);
  EXPECT_EQ(p->freeSpots(SpotSize::Medium), 2);
}

TEST(Leaving, FreedSpotIsReused) {
  auto p = lot();
  auto t = p->park("T1", Vehicle::Truck);
  EXPECT_EQ(p->park("T2", Vehicle::Truck).status, Status::LotFull);
  p->leave(t.ticketId, 5);
  EXPECT_EQ(p->park("T2", Vehicle::Truck).spotId, "l1");
}

TEST(Leaving, PlateMayReturnAfterLeaving) {
  auto p = lot();
  auto t = p->park("C1", Vehicle::Car);
  p->leave(t.ticketId, 5);
  EXPECT_EQ(p->park("C1", Vehicle::Car).status, Status::Ok);
}

TEST(Fees, StartedHoursAreCharged) {
  auto p = lot();
  const int minutes[] = {0, 1, 60, 61, 120, 121};
  const long long expected[] = {100, 100, 100, 200, 200, 300};
  for (int i = 0; i < 6; ++i) {
    auto t = p->park("C1", Vehicle::Car);
    EXPECT_EQ(p->leave(t.ticketId, minutes[i]).feeCents, expected[i]);
  }
}

TEST(Fees, SameRateForEveryVehicle) {
  auto p = lot();
  auto m = p->park("M1", Vehicle::Motorcycle);
  auto c = p->park("C1", Vehicle::Car);
  auto t = p->park("T1", Vehicle::Truck);
  EXPECT_EQ(p->leave(m.ticketId, 90).feeCents, 200);
  EXPECT_EQ(p->leave(c.ticketId, 90).feeCents, 200);
  EXPECT_EQ(p->leave(t.ticketId, 90).feeCents, 200);
}
