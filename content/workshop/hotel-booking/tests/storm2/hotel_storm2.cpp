#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
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

// Today is day 10. Tiers: 7+ days before check-in -> 100 percent, 2+ days -> 50 percent. Given smallest first.
struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<hotel::RefundingHotel> hotel = hotel::makeRefundingHotel(clock, {{2, 50}, {7, 100}});
  Fixture() {
    hotel->addRoomType("double", 2, 10000);
    hotel->addRoomType("suite", 1, 30000);
  }
  // Books `nights` nights of "double" starting `daysAhead` days from today.
  hotel::BookResult bookAhead(const std::string& guest, long long daysAhead, long long nights = 2) {
    return hotel->book(guest, "double", 10 + daysAhead, 10 + daysAhead + nights);
  }
};
}  // namespace

TEST(Setup, TheFactoryRefusesBadArguments) {
  const auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(hotel::makeRefundingHotel(nullptr, {{7, 100}}) == nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {{7, 101}}) == nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {{7, -1}}) == nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {{-1, 50}}) == nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {{7, 100}, {7, 50}}) == nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {{7, 100}, {2, 50}, {7, 20}}) == nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {{0, 0}, {7, 100}}) != nullptr);
  EXPECT_TRUE(hotel::makeRefundingHotel(clock, {}) != nullptr);
}

TEST(Refund, NoTiersMeansNothingIsEverRefunded) {
  const auto clock = std::make_shared<FakeClock>();
  auto h = hotel::makeRefundingHotel(clock, {});
  h->addRoomType("double", 2, 10000);
  const hotel::BookResult r = h->book("ann", "double", 30, 32);
  const hotel::CancelResult c = h->cancelWithRefund(r.id, "ann");
  EXPECT_TRUE(c.status == Status::Ok);
  EXPECT_EQ(c.refund, 0);
  EXPECT_EQ(h->available("double", 30, 32), 2);
}

TEST(Base, EarlierBehaviourStillHolds) {
  Fixture f;
  EXPECT_EQ(f.bookAhead("ann", 20).total, 20000);
  EXPECT_TRUE(f.hotel->book("bob", "suite", 20, 22).status == Status::Ok);
  EXPECT_TRUE(f.hotel->book("cat", "suite", 21, 23).status == Status::SoldOut);
  EXPECT_TRUE(f.hotel->book("cat", "suite", 5, 7).status == Status::InPast);
  EXPECT_TRUE(f.hotel->addSeason("suite", 30, 32, 10000));
  EXPECT_EQ(*f.hotel->quote("suite", 30, 32), 20000);
}

TEST(Refund, TheTierWithTheLargestMatchingDaysBeforeApplies) {
  Fixture f;
  const hotel::CancelResult far = f.hotel->cancelWithRefund(f.bookAhead("ann", 20).id, "ann");
  EXPECT_TRUE(far.status == Status::Ok);
  EXPECT_EQ(far.refund, 20000);
  const hotel::CancelResult middle = f.hotel->cancelWithRefund(f.bookAhead("ann", 4).id, "ann");
  EXPECT_EQ(middle.refund, 10000);
  const hotel::CancelResult near = f.hotel->cancelWithRefund(f.bookAhead("ann", 1).id, "ann");
  EXPECT_TRUE(near.status == Status::Ok);
  EXPECT_EQ(near.refund, 0);
}

TEST(Refund, ATierStartsExactlyItsDaysBefore) {
  Fixture f;
  EXPECT_EQ(f.hotel->cancelWithRefund(f.bookAhead("a", 7).id, "a").refund, 20000);
  EXPECT_EQ(f.hotel->cancelWithRefund(f.bookAhead("a", 6).id, "a").refund, 10000);
  EXPECT_EQ(f.hotel->cancelWithRefund(f.bookAhead("a", 2).id, "a").refund, 10000);
  EXPECT_EQ(f.hotel->cancelWithRefund(f.bookAhead("a", 1).id, "a").refund, 0);
}

TEST(Refund, TierOrderInTheInputDoesNotMatter) {
  const auto clock = std::make_shared<FakeClock>();
  auto sorted = hotel::makeRefundingHotel(clock, {{7, 100}, {2, 50}, {0, 10}});
  auto shuffled = hotel::makeRefundingHotel(clock, {{2, 50}, {0, 10}, {7, 100}});
  sorted->addRoomType("double", 2, 10000);
  shuffled->addRoomType("double", 2, 10000);
  for (const long long ahead : {1, 2, 5, 7, 12}) {
    const hotel::BookResult a = sorted->book("ann", "double", 10 + ahead, 12 + ahead);
    const hotel::BookResult b = shuffled->book("ann", "double", 10 + ahead, 12 + ahead);
    EXPECT_EQ(sorted->cancelWithRefund(a.id, "ann").refund, shuffled->cancelWithRefund(b.id, "ann").refund);
  }
  const hotel::BookResult c = shuffled->book("ann", "double", 11, 13);
  EXPECT_EQ(shuffled->cancelWithRefund(c.id, "ann").refund, 2000);
}

TEST(Refund, DaysAreCountedFromTheMomentOfCancelling) {
  Fixture f;
  const hotel::BookResult r = f.bookAhead("ann", 20);  // check-in on day 30
  f.clock->set(24);                                     // 6 days to go
  const hotel::CancelResult c = f.hotel->cancelWithRefund(r.id, "ann");
  EXPECT_EQ(c.refund, 10000);
}

TEST(Refund, IsAPercentageOfWhatWasChargedNotOfTodaysPrices) {
  Fixture f;
  const hotel::BookResult r = f.bookAhead("ann", 20);  // charged 20000
  EXPECT_EQ(r.total, 20000);
  f.hotel->addSeason("double", 25, 60, 90000);
  EXPECT_EQ(f.hotel->cancelWithRefund(r.id, "ann").refund, 20000);
}

TEST(Refund, SeasonalTotalsAreRefundedAsCharged) {
  Fixture f;
  f.hotel->addSeason("double", 30, 31, 25000);
  const hotel::BookResult r = f.hotel->book("ann", "double", 30, 32);  // 25000 + 10000
  EXPECT_EQ(r.total, 35000);
  f.clock->set(25);  // 5 days before -> 50 percent
  EXPECT_EQ(f.hotel->cancelWithRefund(r.id, "ann").refund, 17500);
}

TEST(Refund, RoundsDownToWholeCents) {
  const auto clock = std::make_shared<FakeClock>();
  auto h = hotel::makeRefundingHotel(clock, {{0, 33}});
  h->addRoomType("tiny", 1, 999);
  const hotel::BookResult r = h->book("ann", "tiny", 20, 21);
  EXPECT_EQ(r.total, 999);
  EXPECT_EQ(h->cancelWithRefund(r.id, "ann").refund, 329);
}

TEST(Refund, FailuresRefundNothingAndChangeNothing) {
  Fixture f;
  const hotel::BookResult r = f.bookAhead("ann", 20);
  EXPECT_TRUE(f.hotel->cancelWithRefund(r.id, "bob").status == Status::WrongGuest);
  EXPECT_EQ(f.hotel->cancelWithRefund(r.id, "bob").refund, 0);
  EXPECT_TRUE(f.hotel->cancelWithRefund(777, "ann").status == Status::UnknownReservation);
  EXPECT_EQ(f.hotel->available("double", 30, 32), 1);
  f.clock->set(30);
  const hotel::CancelResult started = f.hotel->cancelWithRefund(r.id, "ann");
  EXPECT_TRUE(started.status == Status::StayStarted);
  EXPECT_EQ(started.refund, 0);
  EXPECT_EQ(f.hotel->available("double", 30, 32), 1);
}

TEST(Refund, ACancelledReservationCannotBeRefundedTwice) {
  Fixture f;
  const hotel::BookResult r = f.bookAhead("ann", 20);
  EXPECT_EQ(f.hotel->cancelWithRefund(r.id, "ann").refund, 20000);
  const hotel::CancelResult again = f.hotel->cancelWithRefund(r.id, "ann");
  EXPECT_TRUE(again.status == Status::UnknownReservation);
  EXPECT_EQ(again.refund, 0);
}

TEST(Refund, PlainCancelBehavesLikeCancelWithRefundWithoutTheMoney) {
  Fixture f;
  const hotel::BookResult r = f.bookAhead("ann", 20);
  EXPECT_TRUE(f.hotel->cancel(r.id, "bob") == Status::WrongGuest);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::Ok);
  EXPECT_EQ(f.hotel->available("double", 30, 32), 2);
  EXPECT_TRUE(f.hotel->cancelWithRefund(r.id, "ann").status == Status::UnknownReservation);
}

TEST(Refund, ACancellationFreesTheRoomsEvenWhenNothingIsRefunded) {
  Fixture f;
  const hotel::BookResult a = f.hotel->book("ann", "suite", 11, 13);
  EXPECT_TRUE(f.hotel->book("bob", "suite", 11, 13).status == Status::SoldOut);
  const hotel::CancelResult c = f.hotel->cancelWithRefund(a.id, "ann");
  EXPECT_EQ(c.refund, 0);
  EXPECT_TRUE(f.hotel->book("bob", "suite", 11, 13).status == Status::Ok);
}
