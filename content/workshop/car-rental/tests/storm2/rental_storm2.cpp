#include <utility>
#include <memory>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

using rental::Status;

namespace {
class FakeClock2 : public rental::Clock {
 public:
  long long nowHours() const override { return now_; }
  void set(long long hour) { now_ = hour; }

 private:
  long long now_ = 100;
};

// Now is hour 100. "compact": three cars, added as C3, C1, C2, at 24000 a day. Fee: 2 free hours, then 50% a hour.
struct Fixture2 {
  std::shared_ptr<FakeClock2> clock = std::make_shared<FakeClock2>();
  std::unique_ptr<rental::Rentals> rentals = rental::makeRotatingRentals(clock, 2, 50);
  Fixture2() {
    rentals->addCategory("compact", 24000);
    rentals->addCar("C3", "compact");
    rentals->addCar("C1", "compact");
    rentals->addCar("C2", "compact");
  }
  // Reserves and collects at the current hour; returns the plate (empty when something failed) and the id.
  std::pair<rental::ReservationId, std::string> rent(const std::string& who, long long dropoff) {
    const auto r = rentals->reserve(who, "compact", clock->nowHours(), dropoff);
    return {r.id, rentals->pickUp(r.id, who).plate};
  }
};
}  // namespace

TEST(Rotation, TheFactoryRefusesTheSameBadArgumentsAsTheFeeFactory) {
  const auto clock = std::make_shared<FakeClock2>();
  EXPECT_TRUE(rental::makeRotatingRentals(nullptr, 2, 50) == nullptr);
  EXPECT_TRUE(rental::makeRotatingRentals(clock, -1, 50) == nullptr);
  EXPECT_TRUE(rental::makeRotatingRentals(clock, 2, 1001) == nullptr);
  EXPECT_TRUE(rental::makeRotatingRentals(clock, 0, 0) != nullptr);
}

TEST(Rotation, CarsThatHaveNeverBeenRentedGoOutByPlate) {
  Fixture2 f;
  EXPECT_EQ(f.rent("a", 110).second, std::string("C1"));
  EXPECT_EQ(f.rent("b", 110).second, std::string("C2"));
  EXPECT_EQ(f.rent("c", 110).second, std::string("C3"));
}

TEST(Rotation, TheCarIdleLongestGoesNext) {
  Fixture2 f;
  const auto a = f.rent("a", 110);  // C1
  const auto b = f.rent("b", 110);  // C2
  const auto c = f.rent("c", 110);  // C3
  f.clock->set(105);
  f.rentals->returnCar(b.first, "b");  // C2 idle since 105
  f.clock->set(106);
  f.rentals->returnCar(c.first, "c");  // C3 idle since 106
  f.clock->set(107);
  f.rentals->returnCar(a.first, "a");  // C1 idle since 107
  EXPECT_EQ(f.rent("d", 120).second, std::string("C2"));
  EXPECT_EQ(f.rent("e", 120).second, std::string("C3"));
  EXPECT_EQ(f.rent("f", 120).second, std::string("C1"));
}

TEST(Rotation, CarsReturnedInTheSameHourGoByPlate) {
  Fixture2 f;
  const auto a = f.rent("a", 110);
  const auto b = f.rent("b", 110);
  const auto c = f.rent("c", 110);
  f.clock->set(105);
  f.rentals->returnCar(c.first, "c");
  f.rentals->returnCar(b.first, "b");
  f.rentals->returnCar(a.first, "a");
  EXPECT_EQ(f.rent("d", 120).second, std::string("C1"));
  EXPECT_EQ(f.rent("e", 120).second, std::string("C2"));
}

TEST(Rotation, ACarNeverRentedGoesBeforeOneThatHasBeenReturned) {
  Fixture2 f;
  const auto a = f.rent("a", 110);  // C1
  f.clock->set(105);
  f.rentals->returnCar(a.first, "a");
  EXPECT_EQ(f.rent("b", 120).second, std::string("C2"));
  EXPECT_EQ(f.rent("c", 120).second, std::string("C3"));
  EXPECT_EQ(f.rent("d", 120).second, std::string("C1"));
}

TEST(Rotation, IdleTimeCountsFromTheHourTheCarWasReturnedNotItsDropoff) {
  Fixture2 f;
  const auto a = f.rentals->reserve("a", "compact", 100, 104);  // C1, due 104, comes back late at 120
  const auto b = f.rentals->reserve("b", "compact", 100, 110);  // C2, due 110, comes back early at 108
  const auto c = f.rentals->reserve("c", "compact", 100, 130);  // C3, stays out
  f.rentals->pickUp(a.id, "a");
  f.rentals->pickUp(b.id, "b");
  f.rentals->pickUp(c.id, "c");
  f.clock->set(108);
  f.rentals->returnCar(b.id, "b");
  f.clock->set(120);
  f.rentals->returnCar(a.id, "a");
  EXPECT_EQ(f.rent("d", 125).second, std::string("C2"));  // idle since 108; C1 only since 120
}

TEST(Rotation, TheLateFeeStillApplies) {
  Fixture2 f;
  const auto a = f.rent("a", 124);
  f.clock->set(129);
  const auto r = f.rentals->returnCar(a.first, "a");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.charge, 24000 + 36000);
}

TEST(Rotation, EarlierRulesStillHoldWithRotation) {
  Fixture2 f;
  EXPECT_EQ(f.rentals->reserve("a", "compact", 100, 125).total, 48000);
  const auto b = f.rentals->reserve("b", "compact", 100, 110);
  EXPECT_TRUE(f.rentals->reserve("c", "compact", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.rentals->reserve("d", "compact", 100, 110).status == Status::NoneAvailable);
  EXPECT_TRUE(f.rentals->cancel(b.id, "b") == Status::Ok);
  EXPECT_TRUE(f.rentals->reserve("d", "compact", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.rentals->pickUp(999, "x").status == Status::UnknownReservation);
}
