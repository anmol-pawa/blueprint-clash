#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

using tix::SeatState;
using tix::Status;
using Seats = std::vector<std::string>;

namespace {
class FakeClock : public tix::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

// A 3 x 5 hall called "s1", holds last 100 ticks.
struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<tix::Booking> booking = tix::makeBooking(clock, 100);
  Fixture() { booking->addShow("s1", 3, 5); }
  SeatState state(const std::string& seat, const std::string& show = "s1") const {
    const auto s = booking->seatState(show, seat);
    return s.has_value() ? *s : static_cast<SeatState>(-1);
  }
};
}  // namespace

TEST(Setup, AFactoryRefusesANullClockAndANonPositiveHold) {
  EXPECT_TRUE(tix::makeBooking(nullptr, 100) == nullptr);
  EXPECT_TRUE(tix::makeBooking(std::make_shared<FakeClock>(), 0) == nullptr);
  EXPECT_TRUE(tix::makeBooking(std::make_shared<FakeClock>(), -5) == nullptr);
}

TEST(Setup, ShowsMustBeNewAndHaveASaneSize) {
  Fixture f;
  EXPECT_FALSE(f.booking->addShow("s1", 2, 2));
  EXPECT_FALSE(f.booking->addShow("", 2, 2));
  EXPECT_FALSE(f.booking->addShow("x", 0, 5));
  EXPECT_FALSE(f.booking->addShow("x", 27, 5));
  EXPECT_FALSE(f.booking->addShow("x", 5, 0));
  EXPECT_FALSE(f.booking->addShow("x", 5, 51));
  EXPECT_TRUE(f.booking->addShow("big", 26, 50));
  EXPECT_EQ(f.booking->availableSeats("big").size(), static_cast<std::size_t>(1300));
}

TEST(Setup, AFreshShowListsEverySeatInRowOrder) {
  Fixture f;
  const Seats all = f.booking->availableSeats("s1");
  EXPECT_EQ(all.size(), static_cast<std::size_t>(15));
  EXPECT_EQ(all.front(), "A1");
  EXPECT_EQ(all[4], "A5");
  EXPECT_EQ(all[5], "B1");
  EXPECT_EQ(all.back(), "C5");
  EXPECT_TRUE(f.booking->availableSeats("nope").empty());
}

TEST(Setup, SeatNamesAreStrict) {
  Fixture f;
  EXPECT_TRUE(f.booking->seatState("s1", "A1").has_value());
  EXPECT_TRUE(f.booking->seatState("s1", "C5").has_value());
  for (const char* bad : {"a1", "A0", "A01", "A6", "D1", "A", "", "1A", "A-1", "AB", "A1 "}) {
    EXPECT_FALSE(f.booking->seatState("s1", bad).has_value());
  }
  EXPECT_FALSE(f.booking->seatState("nope", "A1").has_value());
}

TEST(Hold, HoldingFreeSeatsSucceedsAndMarksThemHeld) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"B2", "B3"});
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_GT(r.id, 0);
  EXPECT_TRUE(r.seats == (Seats{"B2", "B3"}));
  EXPECT_TRUE(f.state("B2") == SeatState::Held);
  EXPECT_TRUE(f.state("B3") == SeatState::Held);
  EXPECT_TRUE(f.state("B4") == SeatState::Available);
  EXPECT_EQ(f.booking->availableSeats("s1").size(), static_cast<std::size_t>(13));
}

TEST(Hold, TheResultEchoesTheSeatsInTheOrderRequested) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"C3", "A1", "B2"});
  EXPECT_TRUE(r.seats == (Seats{"C3", "A1", "B2"}));
}

TEST(Hold, HoldIdsAreUniqueAndPositive) {
  Fixture f;
  const auto a = f.booking->hold("s1", "ann", {"A1"});
  const auto b = f.booking->hold("s1", "bob", {"A2"});
  EXPECT_GT(a.id, 0);
  EXPECT_GT(b.id, 0);
  EXPECT_NE(a.id, b.id);
}

TEST(Hold, ASeatHeldByOneUserCannotBeHeldByAnother) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1"});
  const auto r = f.booking->hold("s1", "bob", {"A1"});
  EXPECT_TRUE(r.status == Status::SeatUnavailable);
  EXPECT_EQ(r.id, tix::kNoHold);
  EXPECT_TRUE(r.seats.empty());
}

TEST(Hold, TheSameUserCannotHoldTheSameSeatTwiceEither) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1"});
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1"}).status == Status::SeatUnavailable);
}

TEST(Hold, AHoldIsAllOrNothing) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A2"});
  const auto r = f.booking->hold("s1", "bob", {"A1", "A2", "A3"});
  EXPECT_TRUE(r.status == Status::SeatUnavailable);
  EXPECT_TRUE(f.state("A1") == SeatState::Available);
  EXPECT_TRUE(f.state("A3") == SeatState::Available);
  EXPECT_TRUE(f.booking->hold("s1", "cat", {"A1", "A3"}).status == Status::Ok);
}

TEST(Hold, TheSameSeatInDifferentShowsIsIndependent) {
  Fixture f;
  f.booking->addShow("s2", 3, 5);
  f.booking->hold("s1", "ann", {"A1"});
  EXPECT_TRUE(f.booking->hold("s2", "bob", {"A1"}).status == Status::Ok);
  EXPECT_TRUE(f.state("A1", "s2") == SeatState::Held);
}

TEST(Hold, InvalidRequestsAreRefusedWithNothingChanged) {
  Fixture f;
  EXPECT_TRUE(f.booking->hold("nope", "ann", {"A1"}).status == Status::UnknownShow);
  EXPECT_TRUE(f.booking->hold("s1", "", {"A1"}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "A1"}).status == Status::InvalidRequest);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "Z9"}).status == Status::UnknownSeat);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "a2"}).status == Status::UnknownSeat);
  EXPECT_EQ(f.booking->availableSeats("s1").size(), static_cast<std::size_t>(15));
}

TEST(Hold, ChecksRunInTheDocumentedOrder) {
  Fixture f;
  const auto held = f.booking->hold("s1", "ann", {"A1"});
  f.booking->confirm(held.id, "ann");
  // A1 is booked, Z9 does not exist: the unknown seat is reported first.
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"A1", "Z9"}).status == Status::UnknownSeat);
  // A duplicate beats an unknown show only after the show exists; an unknown show comes first.
  EXPECT_TRUE(f.booking->hold("nope", "", {}).status == Status::UnknownShow);
}

TEST(Expiry, AHoldIsLiveUntilItsLastTickAndGoneAtTheExpiryTick) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1"});  // placed at 1000, lasts to 1099
  f.clock->advance(99);
  EXPECT_TRUE(f.state("A1") == SeatState::Held);
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"A1"}).status == Status::SeatUnavailable);
  f.clock->advance(1);  // tick 1100 = 1000 + 100
  EXPECT_TRUE(f.state("A1") == SeatState::Available);
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"A1"}).status == Status::Ok);
}

TEST(Expiry, TheWindowCountsFromWhenTheHoldWasPlaced) {
  Fixture f;
  f.clock->advance(500);
  f.booking->hold("s1", "ann", {"A1"});  // placed at 1500
  f.clock->advance(99);
  EXPECT_TRUE(f.state("A1") == SeatState::Held);
  f.clock->advance(1);
  EXPECT_TRUE(f.state("A1") == SeatState::Available);
}

TEST(Expiry, ExpiredSeatsAreListedAsAvailable) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1", "A2"});
  f.clock->advance(100);
  EXPECT_EQ(f.booking->availableSeats("s1").size(), static_cast<std::size_t>(15));
}

TEST(Expiry, HoldsExpireIndependently) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1"});  // 1000
  f.clock->advance(60);
  f.booking->hold("s1", "bob", {"A2"});  // 1060
  f.clock->advance(40);                  // 1100: ann's is over, bob's has 60 left
  EXPECT_TRUE(f.state("A1") == SeatState::Available);
  EXPECT_TRUE(f.state("A2") == SeatState::Held);
}

TEST(Expiry, AnExpiredHoldCanBeTakenOverAndTheNewHolderKeepsItsFullWindow) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1"});
  f.clock->advance(100);
  const auto b = f.booking->hold("s1", "bob", {"A1"});  // placed at 1100, lasts to 1199
  EXPECT_TRUE(b.status == Status::Ok);
  f.clock->advance(50);
  EXPECT_TRUE(f.state("A1") == SeatState::Held);
  EXPECT_TRUE(f.booking->confirm(b.id, "bob") == Status::Ok);
}

TEST(Confirm, ConfirmingALiveHoldBooksTheSeatsForGood) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1", "A2"});
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.state("A1") == SeatState::Booked);
  EXPECT_TRUE(f.state("A2") == SeatState::Booked);
  f.clock->advance(100000);
  EXPECT_TRUE(f.state("A1") == SeatState::Booked);
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"A1"}).status == Status::SeatUnavailable);
}

TEST(Confirm, ConfirmingAtTheExpiryTickIsTooLate) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  f.clock->advance(99);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::Ok);
  const auto late = f.booking->hold("s1", "bob", {"B1"});
  f.clock->advance(100);
  EXPECT_TRUE(f.booking->confirm(late.id, "bob") == Status::HoldExpired);
  EXPECT_TRUE(f.state("B1") == SeatState::Available);
}

TEST(Confirm, AnExpiredHoldStaysExpiredWhenAskedAgain) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  f.clock->advance(150);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::HoldExpired);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::HoldExpired);
  EXPECT_TRUE(f.booking->release(r.id, "ann") == Status::HoldExpired);
}

TEST(Confirm, ALateConfirmCannotStealASeatSomeoneElseNowHolds) {
  Fixture f;
  const auto a = f.booking->hold("s1", "ann", {"A1"});
  f.clock->advance(100);
  const auto b = f.booking->hold("s1", "bob", {"A1"});
  EXPECT_TRUE(f.booking->confirm(a.id, "ann") == Status::HoldExpired);
  EXPECT_TRUE(f.state("A1") == SeatState::Held);
  EXPECT_TRUE(f.booking->confirm(b.id, "bob") == Status::Ok);
  EXPECT_TRUE(f.state("A1") == SeatState::Booked);
}

TEST(Confirm, ABookingIsSpentOnce) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::UnknownHold);
  EXPECT_TRUE(f.booking->release(r.id, "ann") == Status::UnknownHold);
  EXPECT_TRUE(f.state("A1") == SeatState::Booked);
}

TEST(Confirm, OnlyTheHolderCanConfirmOrRelease) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  EXPECT_TRUE(f.booking->confirm(r.id, "bob") == Status::WrongUser);
  EXPECT_TRUE(f.booking->release(r.id, "bob") == Status::WrongUser);
  EXPECT_TRUE(f.state("A1") == SeatState::Held);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::Ok);
}

TEST(Confirm, WrongUserIsReportedBeforeExpiry) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  f.clock->advance(500);
  EXPECT_TRUE(f.booking->confirm(r.id, "bob") == Status::WrongUser);
}

TEST(Confirm, UnknownIdsAreRefused) {
  Fixture f;
  EXPECT_TRUE(f.booking->confirm(12345, "ann") == Status::UnknownHold);
  EXPECT_TRUE(f.booking->confirm(tix::kNoHold, "ann") == Status::UnknownHold);
  EXPECT_TRUE(f.booking->release(-4, "ann") == Status::UnknownHold);
}

TEST(Release, ReleasingFreesTheSeatsAtOnce) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1", "A2"});
  EXPECT_TRUE(f.booking->release(r.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.state("A1") == SeatState::Available);
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"A1", "A2"}).status == Status::Ok);
}

TEST(Release, AReleasedHoldCannotBeConfirmedEvenIfTheSeatsAreStillFree) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  f.booking->release(r.id, "ann");
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::UnknownHold);
  EXPECT_TRUE(f.state("A1") == SeatState::Available);
}

TEST(Release, ReleasingOneHoldLeavesTheOthersAlone) {
  Fixture f;
  const auto a = f.booking->hold("s1", "ann", {"A1"});
  const auto b = f.booking->hold("s1", "ann", {"A2"});
  f.booking->release(a.id, "ann");
  EXPECT_TRUE(f.state("A2") == SeatState::Held);
  EXPECT_TRUE(f.booking->confirm(b.id, "ann") == Status::Ok);
}

TEST(Contention, TwoUsersRacingForTheSameSeatsExactlyOneWins) {
  Fixture f;
  int winners = 0;
  for (const char* user : {"ann", "bob", "cat", "dan"}) {
    if (f.booking->hold("s1", user, {"B2", "B3"}).status == Status::Ok) ++winners;
  }
  EXPECT_EQ(winners, 1);
}

TEST(Contention, ASeatIsSoldAtMostOnceEvenAcrossManyExpiriesAndRetries) {
  Fixture f;
  int confirmed = 0;
  for (int round = 0; round < 6; ++round) {
    for (const char* user : {"ann", "bob", "cat"}) {
      const auto r = f.booking->hold("s1", user, {"C1"});
      if (r.status != Status::Ok) continue;
      f.clock->advance(round % 2 == 0 ? 100 : 10);  // even rounds: the hold lapses before the confirm
      if (f.booking->confirm(r.id, user) == Status::Ok) ++confirmed;
    }
  }
  EXPECT_EQ(confirmed, 1);
  EXPECT_TRUE(f.state("C1") == SeatState::Booked);
}
