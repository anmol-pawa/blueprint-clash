#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using rental::Status;

namespace {
class FakeClock1 : public rental::Clock {
 public:
  long long nowHours() const override { return now_; }
  void set(long long hour) { now_ = hour; }

 private:
  long long now_ = 100;
};

// Now is hour 100. "compact": cars C1, C2 at 24000 a started day, so one hour of an ordinary rental is 1000.
// "mini": one car M1 at 1999 a day. Fee: after `grace` free hours, `percent` of a daily rate per late hour.
struct Fixture1 {
  std::shared_ptr<FakeClock1> clock = std::make_shared<FakeClock1>();
  std::unique_ptr<rental::Rentals> rentals;
  explicit Fixture1(int grace = 2, int percent = 50) : rentals(rental::makeLateFeeRentals(clock, grace, percent)) {
    rentals->addCategory("compact", 24000);
    rentals->addCar("C1", "compact");
    rentals->addCar("C2", "compact");
    rentals->addCategory("mini", 1999);
    rentals->addCar("M1", "mini");
  }
  // Rents `category` from hour 100 to `dropoff`, collects it now and returns it at `returnedAt`.
  rental::ReturnResult rentAndReturn(const std::string& category, long long dropoff, long long returnedAt) {
    const auto r = rentals->reserve("ann", category, 100, dropoff);
    rentals->pickUp(r.id, "ann");
    clock->set(returnedAt);
    return rentals->returnCar(r.id, "ann");
  }
};
}  // namespace

TEST(LateFeeSetup, TheFactoryRefusesBadArguments) {
  const auto clock = std::make_shared<FakeClock1>();
  EXPECT_TRUE(rental::makeLateFeeRentals(nullptr, 2, 50) == nullptr);
  EXPECT_TRUE(rental::makeLateFeeRentals(clock, -1, 50) == nullptr);
  EXPECT_TRUE(rental::makeLateFeeRentals(clock, 2, -1) == nullptr);
  EXPECT_TRUE(rental::makeLateFeeRentals(clock, 2, 1001) == nullptr);
  EXPECT_TRUE(rental::makeLateFeeRentals(clock, 0, 0) != nullptr);
  EXPECT_TRUE(rental::makeLateFeeRentals(clock, 0, 1000) != nullptr);
}

TEST(LateFee, ACarBroughtBackOnTimeOrEarlyCostsExactlyTheTotal) {
  Fixture1 f;
  EXPECT_EQ(f.rentAndReturn("compact", 124, 124).charge, 24000);
  Fixture1 g;
  EXPECT_EQ(g.rentAndReturn("compact", 124, 110).charge, 24000);
}

TEST(LateFee, TheGraceHoursAreFree) {
  Fixture1 f;
  EXPECT_EQ(f.rentAndReturn("compact", 124, 126).charge, 24000);  // exactly the grace
  Fixture1 g;
  EXPECT_EQ(g.rentAndReturn("compact", 124, 125).charge, 24000);
}

TEST(LateFee, OnlyTheHoursBeyondTheGraceAreBilled) {
  Fixture1 f;  // 5 hours late, 2 free, 3 billed at 50% of 24000 = 12000 each
  EXPECT_EQ(f.rentAndReturn("compact", 124, 129).charge, 24000 + 36000);
  Fixture1 g;  // one hour past the grace
  EXPECT_EQ(g.rentAndReturn("compact", 124, 127).charge, 24000 + 12000);
}

TEST(LateFee, TheFeeIsRoundedDownOnceNotPerHour) {
  Fixture1 f(0, 50);  // mini: 1999 * 2 * 50 / 100 = 1999; rounding each hour would give 999 + 999
  EXPECT_EQ(f.rentAndReturn("mini", 110, 112).charge, 1999 + 1999);
  Fixture1 g(0, 50);
  EXPECT_EQ(g.rentAndReturn("mini", 110, 111).charge, 1999 + 999);
}

TEST(LateFee, TheFeeUsesTheDailyRateNotTheTotalOfALongRental) {
  Fixture1 f;  // three days: total 72000; 3 hours late, grace 2, 1 billed -> 12000
  EXPECT_EQ(f.rentAndReturn("compact", 172, 175).charge, 72000 + 12000);
}

TEST(LateFee, APercentageAboveAHundredIsAllowed) {
  Fixture1 f(0, 200);
  EXPECT_EQ(f.rentAndReturn("compact", 110, 111).charge, 24000 + 48000);
}

TEST(LateFee, ReservingAndAvailabilityAreNotAffectedByTheFee) {
  Fixture1 f;
  const auto r = f.rentals->reserve("ann", "compact", 100, 124);
  EXPECT_EQ(r.total, 24000);
  EXPECT_EQ(f.rentals->available("compact", 100, 124), 1);
}

TEST(LateFee, ALateCarIsBackInThePoolAfterItIsReturned) {
  Fixture1 f;
  const auto a = f.rentals->reserve("ann", "mini", 100, 110);
  EXPECT_EQ(f.rentals->pickUp(a.id, "ann").plate, std::string("M1"));
  f.clock->set(115);
  const auto b = f.rentals->reserve("bob", "mini", 115, 120);
  EXPECT_TRUE(f.rentals->pickUp(b.id, "bob").status == Status::NoCarReady);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "ann").status == Status::Ok);
  EXPECT_EQ(f.rentals->pickUp(b.id, "bob").plate, std::string("M1"));
}

TEST(LateFee, EarlierRulesStillHoldInTheFeeGame) {
  Fixture1 f;
  EXPECT_EQ(f.rentals->reserve("ann", "compact", 100, 125).total, 48000);
  EXPECT_TRUE(f.rentals->reserve("", "compact", 100, 125).status == Status::InvalidRequest);
  EXPECT_TRUE(f.rentals->reserve("ann", "compact", 99, 125).status == Status::InPast);
  const auto b = f.rentals->reserve("bob", "compact", 100, 110);
  EXPECT_TRUE(f.rentals->reserve("cy", "compact", 100, 110).status == Status::NoneAvailable);
  EXPECT_TRUE(f.rentals->returnCar(b.id, "bob").status == Status::NotPickedUp);
}
