#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using hotel::Status;

namespace {
class FakeClock : public hotel::Clock {
 public:
  long long today() const override { return today_; }
  void set(long long day) { today_ = day; }

 private:
  long long today_ = 10;
};

// Today is day 10. "double": 2 rooms at 10000. "suite": 1 room at 30000.
struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<hotel::SeasonalHotel> hotel = hotel::makeSeasonalHotel(clock);
  Fixture() {
    hotel->addRoomType("double", 2, 10000);
    hotel->addRoomType("suite", 1, 30000);
  }
};
}  // namespace

TEST(Setup, TheFactoryRefusesANullClock) {
  EXPECT_TRUE(hotel::makeSeasonalHotel(nullptr) == nullptr);
}

TEST(Base, EarlierBehaviourStillHolds) {
  Fixture f;
  const hotel::BookResult r = f.hotel->book("ann", "suite", 20, 22);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.total, 60000);
  EXPECT_TRUE(f.hotel->book("bob", "suite", 21, 23).status == Status::SoldOut);
  EXPECT_TRUE(f.hotel->book("bob", "suite", 22, 23).status == Status::Ok);
  EXPECT_TRUE(f.hotel->cancel(r.id, "bob") == Status::WrongGuest);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::Ok);
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 1);
}

TEST(Season, NightsInsideASeasonUseItsRateAndOthersKeepTheNormalRate) {
  Fixture f;
  EXPECT_TRUE(f.hotel->addSeason("double", 12, 14, 15000));
  // nights 11, 12, 13, 14 -> 10000 + 15000 + 15000 + 10000
  const hotel::BookResult r = f.hotel->book("ann", "double", 11, 15);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.total, 50000);
}

TEST(Season, ItStartsOnItsFirstDayAndEndsTheDayBeforeItsEndDate) {
  Fixture f;
  f.hotel->addSeason("double", 12, 14, 15000);
  EXPECT_EQ(*f.hotel->quote("double", 11, 12), 10000);
  EXPECT_EQ(*f.hotel->quote("double", 12, 13), 15000);
  EXPECT_EQ(*f.hotel->quote("double", 13, 14), 15000);
  EXPECT_EQ(*f.hotel->quote("double", 14, 15), 10000);
}

TEST(Season, ALaterSeasonWinsWhereTheyOverlap) {
  Fixture f;
  f.hotel->addSeason("double", 10, 20, 12000);
  f.hotel->addSeason("double", 14, 16, 20000);
  // nights 13, 14, 15, 16 -> 12000 + 20000 + 20000 + 12000
  EXPECT_EQ(*f.hotel->quote("double", 13, 17), 64000);
}

TEST(Season, TheLaterOneWinsEvenWhenItIsBroaderOrCheaper) {
  Fixture f;
  f.hotel->addSeason("double", 14, 16, 20000);
  f.hotel->addSeason("double", 10, 20, 12000);
  EXPECT_EQ(*f.hotel->quote("double", 13, 17), 48000);
  Fixture g;
  g.hotel->addSeason("double", 10, 20, 22000);
  g.hotel->addSeason("double", 14, 16, 5000);
  EXPECT_EQ(*g.hotel->quote("double", 13, 17), 22000 + 5000 + 5000 + 22000);
}

TEST(Season, ASeasonOnlyPricesItsOwnRoomType) {
  Fixture f;
  f.hotel->addSeason("double", 10, 40, 99000);
  EXPECT_EQ(*f.hotel->quote("suite", 20, 22), 60000);
  EXPECT_EQ(*f.hotel->quote("double", 20, 22), 198000);
}

TEST(Season, ASeasonMayBeCheaperThanTheNormalRate) {
  Fixture f;
  f.hotel->addSeason("suite", 20, 25, 1000);
  EXPECT_EQ(*f.hotel->quote("suite", 19, 26), 30000 + 5 * 1000 + 30000);
}

TEST(Season, ASeasonCanBeLongerThanAStayAndCoverFarAwayDays) {
  Fixture f;
  EXPECT_TRUE(f.hotel->addSeason("double", 0, 100000, 11000));
  EXPECT_EQ(*f.hotel->quote("double", 50000, 50003), 33000);
  EXPECT_TRUE(f.hotel->addSeason("double", -100, 5, 9000));
  EXPECT_EQ(*f.hotel->quote("double", 3, 7), 9000 + 9000 + 11000 + 11000);
}

TEST(Season, BadSeasonsAreRefusedAndChangeNothing) {
  Fixture f;
  EXPECT_FALSE(f.hotel->addSeason("nope", 12, 14, 15000));
  EXPECT_FALSE(f.hotel->addSeason("double", 14, 14, 15000));
  EXPECT_FALSE(f.hotel->addSeason("double", 15, 14, 15000));
  EXPECT_FALSE(f.hotel->addSeason("double", 12, 14, 0));
  EXPECT_FALSE(f.hotel->addSeason("double", 12, 14, 1000001));
  EXPECT_TRUE(f.hotel->addSeason("double", 12, 14, 1000000));
  EXPECT_TRUE(f.hotel->addSeason("double", 12, 14, 1));
  EXPECT_EQ(*f.hotel->quote("double", 12, 14), 2);
}

TEST(Season, BookingChargesWhatTheQuoteSays) {
  Fixture f;
  f.hotel->addSeason("suite", 21, 23, 50000);
  const long long quoted = *f.hotel->quote("suite", 20, 24);
  const hotel::BookResult r = f.hotel->book("ann", "suite", 20, 24);
  EXPECT_EQ(r.total, quoted);
  EXPECT_EQ(r.total, 30000 + 50000 + 50000 + 30000);
}

TEST(Season, ASeasonAddedLaterDoesNotChangeAnEarlierBookingsPrice) {
  Fixture f;
  const hotel::BookResult before = f.hotel->book("ann", "double", 20, 22);
  f.hotel->addSeason("double", 20, 22, 25000);
  const hotel::BookResult after = f.hotel->book("bob", "double", 20, 22);
  EXPECT_EQ(before.total, 20000);
  EXPECT_EQ(after.total, 50000);
}

TEST(Quote, IsEmptyForUnknownTypesAndInvalidStays) {
  Fixture f;
  EXPECT_FALSE(f.hotel->quote("nope", 20, 21).has_value());
  EXPECT_FALSE(f.hotel->quote("double", 20, 20).has_value());
  EXPECT_FALSE(f.hotel->quote("double", 21, 20).has_value());
  EXPECT_FALSE(f.hotel->quote("double", 20, 51).has_value());
  EXPECT_TRUE(f.hotel->quote("double", 20, 50).has_value());
}

TEST(Quote, IgnoresAvailabilityAndToday) {
  Fixture f;
  f.hotel->book("ann", "suite", 20, 22);
  EXPECT_EQ(*f.hotel->quote("suite", 20, 22), 60000);
  EXPECT_EQ(*f.hotel->quote("suite", 1, 3), 60000);
}

TEST(Quote, ChangesNothing) {
  Fixture f;
  f.hotel->quote("suite", 20, 22);
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 1);
  EXPECT_TRUE(f.hotel->book("ann", "suite", 20, 22).status == Status::Ok);
}

TEST(Season, SeasonsDoNotTouchAvailability) {
  Fixture f;
  f.hotel->addSeason("suite", 20, 22, 99000);
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 1);
  EXPECT_TRUE(f.hotel->book("ann", "suite", 20, 22).status == Status::Ok);
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 0);
}
