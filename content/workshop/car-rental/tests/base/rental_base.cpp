#include <algorithm>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

using rental::Status;

namespace {
class FakeClock : public rental::Clock {
 public:
  long long nowHours() const override { return now_; }
  void set(long long hour) { now_ = hour; }

 private:
  long long now_ = 100;
};

// Now is hour 100. "compact": two cars, plates C2 then C1 are added (so the lowest plate is not the first added),
// 5000 a started day. "van": one car V1, 12000 a started day.
struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<rental::Rentals> rentals = rental::makeRentals(clock);
  Fixture() {
    rentals->addCategory("compact", 5000);
    rentals->addCar("C2", "compact");
    rentals->addCar("C1", "compact");
    rentals->addCategory("van", 12000);
    rentals->addCar("V1", "van");
  }
  rental::ReserveResult reserve(const std::string& who, const std::string& category, long long pickup, long long dropoff) {
    return rentals->reserve(who, category, pickup, dropoff);
  }
};
}  // namespace

TEST(Setup, AFactoryRefusesANullClock) {
  EXPECT_TRUE(rental::makeRentals(nullptr) == nullptr);
  EXPECT_TRUE(rental::makeRentals(std::make_shared<FakeClock>()) != nullptr);
}

TEST(Setup, CategoriesMustBeNewAndHaveASaneRate) {
  Fixture f;
  EXPECT_FALSE(f.rentals->addCategory("van", 5000));
  EXPECT_FALSE(f.rentals->addCategory("", 5000));
  EXPECT_FALSE(f.rentals->addCategory("x", 0));
  EXPECT_FALSE(f.rentals->addCategory("x", 100001));
  EXPECT_TRUE(f.rentals->addCategory("limo", 100000));
  EXPECT_EQ(f.rentals->available("limo", 200, 210), 0);  // no cars yet
}

TEST(Setup, PlatesAreUniqueAcrossCategoriesAndCategoriesMustExist) {
  Fixture f;
  EXPECT_FALSE(f.rentals->addCar("C1", "van"));
  EXPECT_FALSE(f.rentals->addCar("C1", "compact"));
  EXPECT_FALSE(f.rentals->addCar("", "van"));
  EXPECT_FALSE(f.rentals->addCar("X1", "boat"));
  EXPECT_EQ(f.rentals->available("van", 200, 210), 1);
  EXPECT_EQ(f.rentals->available("compact", 200, 210), 2);
  EXPECT_TRUE(f.rentals->addCar("V2", "van"));
  EXPECT_EQ(f.rentals->available("van", 200, 210), 2);
}

TEST(Reserve, AReservationReturnsAPositiveIdAndTheTotal) {
  Fixture f;
  const auto a = f.reserve("ann", "compact", 100, 124);
  EXPECT_TRUE(a.status == Status::Ok);
  EXPECT_TRUE(a.id > 0);
  EXPECT_EQ(a.total, 5000);
  const auto b = f.reserve("bob", "van", 100, 110);
  EXPECT_TRUE(b.status == Status::Ok);
  EXPECT_TRUE(b.id != a.id);
  EXPECT_TRUE(b.id > 0);
}

TEST(Reserve, ADayStartedIsADayCharged) {
  Fixture f;
  EXPECT_EQ(f.reserve("a", "compact", 100, 101).total, 5000);
  EXPECT_EQ(f.reserve("b", "compact", 200, 224).total, 5000);
  EXPECT_EQ(f.reserve("c", "compact", 300, 325).total, 10000);
  EXPECT_EQ(f.reserve("d", "compact", 400, 448).total, 10000);
  EXPECT_EQ(f.reserve("e", "compact", 500, 549).total, 15000);
  EXPECT_EQ(f.reserve("f", "compact", 1000, 1720).total, 150000);
}

TEST(Reserve, ARentalIsBetweenOneAndSevenHundredTwentyHours) {
  Fixture f;
  EXPECT_TRUE(f.reserve("a", "compact", 100, 820).status == Status::Ok);
  EXPECT_TRUE(f.reserve("b", "compact", 100, 821).status == Status::InvalidRequest);
  EXPECT_TRUE(f.reserve("c", "compact", 100, 100).status == Status::InvalidRequest);
  EXPECT_TRUE(f.reserve("d", "compact", 100, 99).status == Status::InvalidRequest);
  EXPECT_TRUE(f.reserve("", "compact", 100, 110).status == Status::InvalidRequest);
}

TEST(Reserve, TheChecksRunInTheDocumentedOrder) {
  Fixture f;
  EXPECT_TRUE(f.reserve("", "boat", 5, 5).status == Status::UnknownCategory);
  EXPECT_TRUE(f.reserve("", "compact", 50, 50).status == Status::InvalidRequest);
  EXPECT_TRUE(f.reserve("ann", "compact", 50, 60).status == Status::InPast);
  EXPECT_TRUE(f.reserve("ann", "van", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 50, 60).status == Status::InPast);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::NoneAvailable);
}

TEST(Reserve, CollectingThisVeryHourIsAllowedButTheHourBeforeIsNot) {
  Fixture f;
  EXPECT_TRUE(f.reserve("a", "compact", 99, 110).status == Status::InPast);
  EXPECT_TRUE(f.reserve("a", "compact", 100, 110).status == Status::Ok);
  f.clock->set(120);
  EXPECT_TRUE(f.reserve("b", "compact", 119, 130).status == Status::InPast);
  EXPECT_TRUE(f.reserve("b", "compact", 120, 130).status == Status::Ok);
}

TEST(Overlap, ACarBroughtBackAtTheHourAnotherCollectsIsNotAClash) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "van", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 110, 120).status == Status::Ok);
  EXPECT_TRUE(f.reserve("cy", "van", 109, 111).status == Status::NoneAvailable);
  EXPECT_TRUE(f.reserve("cy", "van", 120, 121).status == Status::Ok);
}

TEST(Overlap, ARentalThatOnlyTouchesAnotherAtItsFarEndStillClashes) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "van", 105, 115).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 106).status == Status::NoneAvailable);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 105).status == Status::Ok);
  EXPECT_TRUE(f.reserve("cy", "van", 114, 130).status == Status::NoneAvailable);
}

TEST(Overlap, ARentalThatSurroundsOrFitsInsideAnotherClashes) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "van", 110, 120).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 130).status == Status::NoneAvailable);
  EXPECT_TRUE(f.reserve("bob", "van", 112, 114).status == Status::NoneAvailable);
}

TEST(Overlap, TheBusiestHourDecidesNotTheNumberOfOverlappingReservations) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "compact", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "compact", 110, 120).status == Status::Ok);
  EXPECT_EQ(f.rentals->available("compact", 100, 120), 1);
  EXPECT_TRUE(f.reserve("cy", "compact", 100, 120).status == Status::Ok);  // two others overlap it, never at once
  EXPECT_EQ(f.rentals->available("compact", 100, 120), 0);
  EXPECT_TRUE(f.reserve("dee", "compact", 100, 101).status == Status::NoneAvailable);
  EXPECT_TRUE(f.reserve("dee", "compact", 119, 120).status == Status::NoneAvailable);
  EXPECT_TRUE(f.reserve("dee", "compact", 120, 121).status == Status::Ok);
}

TEST(Overlap, CategoriesDoNotShareCars) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "van", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "compact", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("cy", "compact", 100, 110).status == Status::Ok);
  EXPECT_EQ(f.rentals->available("van", 100, 110), 0);
}

TEST(Reserve, ARefusedRequestChangesNothing) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "van", 105, 115).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::NoneAvailable);
  EXPECT_TRUE(f.reserve("bob", "van", 50, 60).status == Status::InPast);
  EXPECT_EQ(f.rentals->available("van", 100, 105), 1);
  EXPECT_EQ(f.rentals->available("van", 105, 115), 0);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 105).status == Status::Ok);
}

TEST(Available, IsTheNumberOfCarsMinusTheBusiestHour) {
  Fixture f;
  EXPECT_EQ(f.rentals->available("compact", 100, 110), 2);
  EXPECT_TRUE(f.reserve("ann", "compact", 100, 105).status == Status::Ok);
  EXPECT_EQ(f.rentals->available("compact", 100, 110), 1);
  EXPECT_EQ(f.rentals->available("compact", 105, 110), 2);
  EXPECT_TRUE(f.reserve("bob", "compact", 102, 108).status == Status::Ok);
  EXPECT_EQ(f.rentals->available("compact", 100, 110), 0);
  EXPECT_EQ(f.rentals->available("compact", 105, 110), 1);
  EXPECT_EQ(f.rentals->available("compact", 108, 110), 2);
}

TEST(Available, IsZeroForNothingSensibleAndIgnoresNow) {
  Fixture f;
  EXPECT_EQ(f.rentals->available("boat", 100, 110), 0);
  EXPECT_EQ(f.rentals->available("compact", 110, 110), 0);
  EXPECT_EQ(f.rentals->available("compact", 100, 821), 0);
  f.clock->set(500);
  EXPECT_EQ(f.rentals->available("compact", 100, 110), 2);
}

TEST(Reserve, CarsAddedLaterRaiseTheCapacity) {
  Fixture f;
  EXPECT_TRUE(f.reserve("ann", "van", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::NoneAvailable);
  EXPECT_TRUE(f.rentals->addCar("V2", "van"));
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::Ok);
}

TEST(Cancel, CancellingGivesTheCarBackAndSpendsTheId) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::NoneAvailable);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::UnknownReservation);
  EXPECT_TRUE(f.rentals->cancel(999, "ann") == Status::UnknownReservation);
}

TEST(Cancel, CancellingFreesOnlyItsOwnCar) {
  Fixture f;
  const auto a = f.reserve("ann", "compact", 100, 110);
  EXPECT_TRUE(f.reserve("bob", "compact", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::Ok);
  EXPECT_EQ(f.rentals->available("compact", 100, 110), 1);
  EXPECT_TRUE(f.reserve("cy", "compact", 100, 110).status == Status::Ok);
  EXPECT_TRUE(f.reserve("dee", "compact", 100, 110).status == Status::NoneAvailable);
}

TEST(Cancel, OnlyTheCustomerCanCancelAndAFailureChangesNothing) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  EXPECT_TRUE(f.rentals->cancel(a.id, "bob") == Status::WrongCustomer);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::NoneAvailable);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::Ok);
}

TEST(Cancel, ACarThatHasBeenCollectedCannotBeCancelled) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::Ok);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::AlreadyPickedUp);
  EXPECT_TRUE(f.reserve("bob", "van", 100, 110).status == Status::NoneAvailable);
}

TEST(Cancel, FailuresAreReportedInTheDocumentedOrder) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  EXPECT_TRUE(f.rentals->cancel(999, "bob") == Status::UnknownReservation);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::Ok);
  EXPECT_TRUE(f.rentals->cancel(a.id, "bob") == Status::WrongCustomer);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::AlreadyPickedUp);
}

TEST(Cancel, AReservationThatLapsedCanStillBeCancelled) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  f.clock->set(120);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::Lapsed);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::UnknownReservation);
}

TEST(PickUp, TheFreeCarWithTheLowestPlateGoesFirst) {
  Fixture f;
  const auto a = f.reserve("ann", "compact", 100, 110);
  const auto b = f.reserve("bob", "compact", 100, 110);
  const auto first = f.rentals->pickUp(a.id, "ann");
  EXPECT_TRUE(first.status == Status::Ok);
  EXPECT_EQ(first.plate, std::string("C1"));
  EXPECT_EQ(f.rentals->pickUp(b.id, "bob").plate, std::string("C2"));
}

TEST(PickUp, ItIsTooEarlyUntilThePickupHour) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 110, 120);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::TooEarly);
  f.clock->set(109);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::TooEarly);
  f.clock->set(110);
  EXPECT_EQ(f.rentals->pickUp(a.id, "ann").plate, std::string("V1"));
}

TEST(PickUp, TheReservationLapsesAtTheDropoffHourAndTheLastHourStillWorks) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  f.clock->set(110);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::Lapsed);
  const auto b = f.reserve("bob", "van", 110, 120);
  f.clock->set(119);
  EXPECT_TRUE(f.rentals->pickUp(b.id, "bob").status == Status::Ok);
}

TEST(PickUp, FailuresAreReportedInTheDocumentedOrder) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 110, 120);
  EXPECT_TRUE(f.rentals->pickUp(999, "").status == Status::UnknownReservation);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "bob").status == Status::WrongCustomer);  // before TooEarly
  f.clock->set(110);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::Ok);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::AlreadyPickedUp);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "bob").status == Status::WrongCustomer);  // before AlreadyPickedUp
  const auto b = f.reserve("bob", "compact", 110, 115);
  EXPECT_TRUE(f.rentals->pickUp(b.id, "bob").status == Status::Ok);
  const auto c = f.reserve("cy", "compact", 110, 115);
  EXPECT_TRUE(f.rentals->pickUp(c.id, "cy").status == Status::Ok);
  const auto d = f.reserve("dee", "compact", 115, 120);
  f.clock->set(115);
  EXPECT_TRUE(f.rentals->pickUp(d.id, "dee").status == Status::NoCarReady);
  f.clock->set(121);
  EXPECT_TRUE(f.rentals->pickUp(d.id, "dee").status == Status::Lapsed);  // before NoCarReady
}

TEST(PickUp, NoCarReadyWhileTheCarIsStillOutAndTheRetryWorksAfterItComesBack) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  EXPECT_EQ(f.rentals->pickUp(a.id, "ann").plate, std::string("V1"));
  f.clock->set(110);
  const auto b = f.reserve("bob", "van", 110, 120);
  EXPECT_TRUE(b.status == Status::Ok);
  EXPECT_TRUE(f.rentals->pickUp(b.id, "bob").status == Status::NoCarReady);
  EXPECT_TRUE(f.rentals->pickUp(b.id, "bob").status == Status::NoCarReady);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "ann").status == Status::Ok);
  EXPECT_EQ(f.rentals->pickUp(b.id, "bob").plate, std::string("V1"));
}

TEST(PickUp, ACollectedCarIsNotGivenToSomeoneElse) {
  Fixture f;
  const auto a = f.reserve("ann", "compact", 100, 110);
  const auto b = f.reserve("bob", "compact", 100, 110);
  const auto first = f.rentals->pickUp(a.id, "ann");
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::AlreadyPickedUp);
  const auto second = f.rentals->pickUp(b.id, "bob");
  EXPECT_TRUE(first.plate != second.plate);
}

TEST(Return, ReturningChargesTheTotalAndSpendsTheId) {
  Fixture f;
  const auto a = f.reserve("ann", "compact", 100, 124);
  f.rentals->pickUp(a.id, "ann");
  f.clock->set(110);
  const auto r = f.rentals->returnCar(a.id, "ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.charge, 5000);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "ann").status == Status::UnknownReservation);
  EXPECT_TRUE(f.rentals->cancel(a.id, "ann") == Status::UnknownReservation);
  EXPECT_TRUE(f.rentals->pickUp(a.id, "ann").status == Status::UnknownReservation);
}

TEST(Return, FailuresAreReportedInTheDocumentedOrder) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  EXPECT_TRUE(f.rentals->returnCar(999, "bob").status == Status::UnknownReservation);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "bob").status == Status::WrongCustomer);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "ann").status == Status::NotPickedUp);
  f.rentals->pickUp(a.id, "ann");
  EXPECT_TRUE(f.rentals->returnCar(a.id, "bob").status == Status::WrongCustomer);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "ann").status == Status::Ok);
}

TEST(Return, AReturnedCarGoesBackToThePoolWithItsOwnPlate) {
  Fixture f;
  const auto a = f.reserve("ann", "compact", 100, 110);
  const auto b = f.reserve("bob", "compact", 100, 110);
  const auto c = f.reserve("cy", "compact", 110, 120);
  EXPECT_EQ(f.rentals->pickUp(a.id, "ann").plate, std::string("C1"));
  EXPECT_EQ(f.rentals->pickUp(b.id, "bob").plate, std::string("C2"));
  f.clock->set(110);
  EXPECT_TRUE(f.rentals->pickUp(c.id, "cy").status == Status::NoCarReady);
  EXPECT_TRUE(f.rentals->returnCar(b.id, "bob").status == Status::Ok);
  EXPECT_EQ(f.rentals->pickUp(c.id, "cy").plate, std::string("C2"));
}

TEST(Return, ABringingBackEarlyFreesTheRestOfItsHours) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 120);
  f.rentals->pickUp(a.id, "ann");
  EXPECT_TRUE(f.reserve("bob", "van", 106, 110).status == Status::NoneAvailable);
  f.clock->set(105);
  EXPECT_TRUE(f.rentals->returnCar(a.id, "ann").status == Status::Ok);
  EXPECT_EQ(f.rentals->available("van", 104, 106), 0);  // hour 104 was still hers
  EXPECT_EQ(f.rentals->available("van", 105, 120), 1);
  EXPECT_TRUE(f.reserve("bob", "van", 105, 110).status == Status::Ok);
}

TEST(Return, ALateReturnCostsNoExtraInTheBaseGame) {
  Fixture f;
  const auto a = f.reserve("ann", "van", 100, 110);
  f.rentals->pickUp(a.id, "ann");
  f.clock->set(200);
  const auto r = f.rentals->returnCar(a.id, "ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.charge, 12000);
}

// A model with one counter per hour: a rental is accepted when every hour of it has a car left.
TEST(Contention, ManyRentalsAgreeWithASimpleHourByHourModel) {
  Fixture f;
  std::vector<int> held(200, 0);
  struct Live {
    rental::ReservationId id;
    long long from;
    long long to;
  };
  std::vector<Live> live;
  unsigned seed = 12345;
  auto next = [&seed](unsigned bound) {
    seed = seed * 1103515245u + 12345u;
    return (seed >> 16) % bound;
  };
  for (int step = 0; step < 400; ++step) {
    if (!live.empty() && next(4) == 0) {
      const std::size_t pick = next(static_cast<unsigned>(live.size()));
      EXPECT_TRUE(f.rentals->cancel(live[pick].id, "u") == Status::Ok);
      for (long long h = live[pick].from; h < live[pick].to; ++h) --held[static_cast<std::size_t>(h)];
      live.erase(live.begin() + static_cast<long>(pick));
      continue;
    }
    const long long from = 100 + next(60);
    const long long to = from + 1 + next(15);
    bool fits = true;
    int busiest = 0;
    for (long long h = from; h < to; ++h) {
      busiest = std::max(busiest, held[static_cast<std::size_t>(h)]);
      if (held[static_cast<std::size_t>(h)] >= 2) fits = false;
    }
    EXPECT_EQ(f.rentals->available("compact", from, to), 2 - busiest);
    const auto r = f.reserve("u", "compact", from, to);
    EXPECT_TRUE((r.status == Status::Ok) == fits);
    if (r.status == Status::Ok) {
      live.push_back({r.id, from, to});
      for (long long h = from; h < to; ++h) ++held[static_cast<std::size_t>(h)];
    }
  }
}
