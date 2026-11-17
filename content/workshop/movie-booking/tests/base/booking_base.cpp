#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using booking::SeatState;
using booking::Status;

class FakeClock : public booking::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

constexpr long long kHold = 10;

struct Fixture {
  Fixture() { service->addShow("s1", 3, 4); }  // seats 0..11, rows of 4
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<booking::BookingService> service = booking::makeService(clock, kHold);
};

std::string name(Status s) {
  switch (s) {
    case Status::Ok: return "Ok";
    case Status::UnknownShow: return "UnknownShow";
    case Status::UnknownHold: return "UnknownHold";
    case Status::BadSeat: return "BadSeat";
    case Status::TooManySeats: return "TooManySeats";
    case Status::SeatTaken: return "SeatTaken";
    case Status::NotOwner: return "NotOwner";
    case Status::Expired: return "Expired";
  }
  return "?";
}

std::string name(SeatState s) {
  switch (s) {
    case SeatState::Free: return "Free";
    case SeatState::Held: return "Held";
    case SeatState::Booked: return "Booked";
    case SeatState::Missing: return "Missing";
  }
  return "?";
}

std::string statusOf(const booking::HoldResult& r) { return name(r.status); }
std::string stateOf(const Fixture& f, int seat) { return name(f.service->seatState("s1", seat)); }
}  // namespace

TEST(Shows, AShowNameCanBeUsedOnce) {
  Fixture f;
  EXPECT_TRUE(f.service->addShow("s2", 1, 1));
  EXPECT_FALSE(f.service->addShow("s1", 5, 5));
  EXPECT_EQ(f.service->freeSeats("s1"), 12);
}

TEST(Shows, ASizeMustBePositive) {
  Fixture f;
  EXPECT_FALSE(f.service->addShow("zero-rows", 0, 4));
  EXPECT_FALSE(f.service->addShow("zero-width", 4, 0));
  EXPECT_FALSE(f.service->addShow("negative", -1, 3));
  EXPECT_EQ(f.service->freeSeats("zero-rows"), 0);
}

TEST(Shows, ABadClockOrPeriodIsRefused) {
  EXPECT_TRUE(booking::makeService(nullptr, 10) == nullptr);
  EXPECT_TRUE(booking::makeService(std::make_shared<FakeClock>(), 0) == nullptr);
  EXPECT_TRUE(booking::makeService(std::make_shared<FakeClock>(), -5) == nullptr);
}

TEST(Shows, UnknownShowsAndSeatsAreMissing) {
  Fixture f;
  EXPECT_EQ(name(f.service->seatState("nope", 0)), "Missing");
  EXPECT_EQ(stateOf(f, -1), "Missing");
  EXPECT_EQ(stateOf(f, 12), "Missing");
  EXPECT_EQ(stateOf(f, 11), "Free");
  EXPECT_EQ(f.service->freeSeats("nope"), 0);
}

TEST(Hold, HoldingSeatsMarksThemHeldAndGivesAnId) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1, 2});
  EXPECT_EQ(statusOf(r), "Ok");
  EXPECT_TRUE(r.id > 0);
  EXPECT_EQ(stateOf(f, 1), "Held");
  EXPECT_EQ(stateOf(f, 2), "Held");
  EXPECT_EQ(stateOf(f, 3), "Free");
  EXPECT_EQ(f.service->freeSeats("s1"), 10);
}

TEST(Hold, IdsAreDistinct) {
  Fixture f;
  const auto a = f.service->hold("s1", "ann", {0});
  const auto b = f.service->hold("s1", "bob", {1});
  EXPECT_TRUE(a.id > 0 && b.id > 0);
  EXPECT_NE(a.id, b.id);
}

TEST(Hold, ASeatHeldByAnotherCannotBeHeld) {
  Fixture f;
  f.service->hold("s1", "ann", {5});
  const auto r = f.service->hold("s1", "bob", {5});
  EXPECT_EQ(statusOf(r), "SeatTaken");
  EXPECT_EQ(r.id, booking::kNoHold);
}

TEST(Hold, AllOrNothingWhenOneSeatIsTaken) {
  Fixture f;
  f.service->hold("s1", "ann", {3});
  const auto r = f.service->hold("s1", "bob", {2, 3, 4});
  EXPECT_EQ(statusOf(r), "SeatTaken");
  EXPECT_EQ(stateOf(f, 2), "Free");
  EXPECT_EQ(stateOf(f, 4), "Free");
  EXPECT_EQ(f.service->freeSeats("s1"), 11);
}

TEST(Hold, ABookedSeatCannotBeHeld) {
  Fixture f;
  const auto a = f.service->hold("s1", "ann", {7});
  EXPECT_EQ(name(f.service->confirm(a.id, "ann")), "Ok");
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {7})), "SeatTaken");
  f.clock->advance(100);
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {7})), "SeatTaken");
}

TEST(Hold, YouCannotHoldASeatYouAlreadyHold) {
  Fixture f;
  f.service->hold("s1", "ann", {0, 1});
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {1, 2})), "SeatTaken");
}

TEST(Hold, UnknownShowsAreReported) {
  Fixture f;
  EXPECT_EQ(statusOf(f.service->hold("nope", "ann", {0})), "UnknownShow");
}

TEST(Hold, EmptyRepeatedAndOutOfRangeSeatsAreBad) {
  Fixture f;
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {})), "BadSeat");
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {4, 4})), "BadSeat");
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {0, -1})), "BadSeat");
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {12})), "BadSeat");
  EXPECT_EQ(f.service->freeSeats("s1"), 12);
}

TEST(Hold, DuplicateSeatsAreRefusedEvenWhenTheyAreFree) {
  Fixture f;
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {3, 3})), "BadSeat");
  EXPECT_EQ(stateOf(f, 3), "Free");
}

TEST(Hold, SixSeatsAreAllowedSevenAreNot) {
  Fixture f;
  EXPECT_EQ(statusOf(f.service->hold("s1", "ann", {0, 1, 2, 3, 4, 5})), "Ok");
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {6, 7, 8, 9, 10, 11, 12})), "BadSeat");  // 12 is outside, checked first
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {6, 7, 8, 9, 10, 11, 0})), "TooManySeats");
  EXPECT_EQ(f.service->freeSeats("s1"), 6);
}

TEST(Hold, ChecksRunInTheDocumentedOrder) {
  Fixture f;
  f.service->hold("s1", "ann", {0});
  // Too many seats beats a taken seat, bad seat beats too many.
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {0, 1, 2, 3, 4, 5, 6})), "TooManySeats");
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {0, 1, 2, 3, 4, 5, 99})), "BadSeat");
  EXPECT_EQ(statusOf(f.service->hold("nope", "bob", {})), "UnknownShow");
}

TEST(Expiry, ASeatIsHeldUntilItsLastTickAndFreeAtTheExpiryTick) {
  Fixture f;
  f.service->hold("s1", "ann", {2});
  f.clock->advance(kHold - 1);
  EXPECT_EQ(stateOf(f, 2), "Held");
  f.clock->advance(1);
  EXPECT_EQ(stateOf(f, 2), "Free");
}

TEST(Expiry, TheHoldPeriodCountsFromTheMomentOfTheHold) {
  Fixture f;
  f.clock->advance(7);
  f.service->hold("s1", "ann", {2});
  f.clock->advance(9);
  EXPECT_EQ(stateOf(f, 2), "Held");
  f.clock->advance(1);
  EXPECT_EQ(stateOf(f, 2), "Free");
}

TEST(Expiry, LapsedSeatsCanBeHeldAgainWithoutAnyCleanupCall) {
  Fixture f;
  f.service->hold("s1", "ann", {2, 3});
  f.clock->advance(kHold);
  const auto r = f.service->hold("s1", "bob", {3, 4});
  EXPECT_EQ(statusOf(r), "Ok");
  EXPECT_EQ(stateOf(f, 2), "Free");
  EXPECT_EQ(stateOf(f, 3), "Held");
}

TEST(Expiry, FreeSeatsGetsLapsedHoldsBack) {
  Fixture f;
  f.service->hold("s1", "ann", {0, 1, 2});
  EXPECT_EQ(f.service->freeSeats("s1"), 9);
  f.clock->advance(kHold);
  EXPECT_EQ(f.service->freeSeats("s1"), 12);
}

TEST(Confirm, ConfirmingBooksTheSeatsForGood) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {4, 5});
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "Ok");
  EXPECT_EQ(stateOf(f, 4), "Booked");
  EXPECT_EQ(stateOf(f, 5), "Booked");
  f.clock->advance(1000);
  EXPECT_EQ(stateOf(f, 4), "Booked");
  EXPECT_EQ(f.service->freeSeats("s1"), 10);
}

TEST(Confirm, ConfirmingTwiceIsRefused) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {4});
  f.service->confirm(r.id, "ann");
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "UnknownHold");
  EXPECT_EQ(stateOf(f, 4), "Booked");
}

TEST(Confirm, OnlyTheHolderCanConfirmAndTheHoldSurvivesTheAttempt) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {4});
  EXPECT_EQ(name(f.service->confirm(r.id, "mallory")), "NotOwner");
  EXPECT_EQ(stateOf(f, 4), "Held");
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "Ok");
}

TEST(Confirm, AnUnknownHoldIsReported) {
  Fixture f;
  EXPECT_EQ(name(f.service->confirm(12345, "ann")), "UnknownHold");
  EXPECT_EQ(name(f.service->confirm(booking::kNoHold, "ann")), "UnknownHold");
}

TEST(Confirm, ALapsedHoldCannotBeConfirmed) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {4});
  f.clock->advance(kHold);
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "Expired");
  EXPECT_EQ(stateOf(f, 4), "Free");
}

TEST(Confirm, AConfirmOnTheLastLiveTickStillWorks) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {4});
  f.clock->advance(kHold - 1);
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "Ok");
}

TEST(Confirm, AStaleConfirmDoesNotStealSeatsFromTheNewHolder) {
  Fixture f;
  const auto old = f.service->hold("s1", "ann", {4, 5});
  f.clock->advance(kHold);
  const auto fresh = f.service->hold("s1", "bob", {5, 6});
  EXPECT_EQ(statusOf(fresh), "Ok");
  EXPECT_EQ(name(f.service->confirm(old.id, "ann")), "Expired");
  EXPECT_EQ(stateOf(f, 5), "Held");
  EXPECT_EQ(stateOf(f, 4), "Free");
  EXPECT_EQ(name(f.service->confirm(fresh.id, "bob")), "Ok");
  EXPECT_EQ(stateOf(f, 5), "Booked");
}

TEST(Confirm, AWrongUserBeatsALapsedHoldInTheCheckOrder) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {4});
  f.clock->advance(kHold);
  EXPECT_EQ(name(f.service->confirm(r.id, "mallory")), "NotOwner");
}

TEST(Release, ReleasingFreesTheSeatsAtOnce) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1, 2});
  EXPECT_EQ(name(f.service->release(r.id, "ann")), "Ok");
  EXPECT_EQ(stateOf(f, 1), "Free");
  EXPECT_EQ(f.service->freeSeats("s1"), 12);
  EXPECT_EQ(statusOf(f.service->hold("s1", "bob", {1, 2})), "Ok");
}

TEST(Release, OnlyTheHolderCanRelease) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  EXPECT_EQ(name(f.service->release(r.id, "mallory")), "NotOwner");
  EXPECT_EQ(stateOf(f, 1), "Held");
}

TEST(Release, AConfirmedBookingCannotBeReleased) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.service->confirm(r.id, "ann");
  EXPECT_EQ(name(f.service->release(r.id, "ann")), "UnknownHold");
  EXPECT_EQ(stateOf(f, 1), "Booked");
}

TEST(Release, AReleasedHoldCannotBeConfirmedOrReleasedAgain) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.service->release(r.id, "ann");
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "UnknownHold");
  EXPECT_EQ(name(f.service->release(r.id, "ann")), "UnknownHold");
}

TEST(Release, ALapsedHoldIsReportedExpiredAndTouchesNothing) {
  Fixture f;
  const auto old = f.service->hold("s1", "ann", {1});
  f.clock->advance(kHold);
  const auto fresh = f.service->hold("s1", "bob", {1});
  EXPECT_EQ(name(f.service->release(old.id, "ann")), "Expired");
  EXPECT_EQ(stateOf(f, 1), "Held");
  EXPECT_EQ(name(f.service->confirm(fresh.id, "bob")), "Ok");
}

TEST(Shows, ShowsDoNotShareSeats) {
  Fixture f;
  f.service->addShow("s2", 1, 4);
  const auto r = f.service->hold("s1", "ann", {0});
  f.service->confirm(r.id, "ann");
  EXPECT_EQ(statusOf(f.service->hold("s2", "bob", {0})), "Ok");
  EXPECT_EQ(f.service->freeSeats("s2"), 3);
  EXPECT_EQ(f.service->freeSeats("s1"), 11);
}
