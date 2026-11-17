#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using booking::SeatState;
using booking::Status;
using Seats = std::vector<int>;

class FakeClock : public booking::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

constexpr long long kHold = 10;

struct Fixture {
  Fixture() { service->addShow("s1", 3, 4); }  // seats 0..11; rows are 0-3, 4-7, 8-11
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<booking::SeatingService> service = booking::makeSeatingService(clock, kHold);

  Seats best(const std::string& user, int count) {
    const auto r = service->holdBest("s1", user, count);
    return r.status == Status::Ok ? service->seatsOf(r.id) : Seats{};
  }
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
}  // namespace

TEST(Best, AnEmptyHallGivesTheFirstSeatsOfTheFirstRow) {
  Fixture f;
  EXPECT_TRUE(f.best("ann", 3) == (Seats{0, 1, 2}));
  EXPECT_TRUE(f.best("bob", 1) == (Seats{3}));
}

TEST(Best, TheSeatsAreOrdinaryHeldSeats) {
  Fixture f;
  const auto r = f.service->holdBest("s1", "ann", 2);
  EXPECT_EQ(name(r.status), "Ok");
  EXPECT_TRUE(f.service->seatState("s1", 0) == SeatState::Held);
  EXPECT_EQ(f.service->freeSeats("s1"), 10);
  EXPECT_EQ(name(f.service->confirm(r.id, "ann")), "Ok");
  EXPECT_TRUE(f.service->seatState("s1", 1) == SeatState::Booked);
}

TEST(Best, ARunNeverWrapsFromOneRowToTheNext) {
  Fixture f;
  f.best("ann", 3);  // seats 0, 1, 2; seat 3 is left at the end of row 0
  EXPECT_TRUE(f.best("bob", 2) == (Seats{4, 5}));  // 3 and 4 are adjacent numbers but different rows
}

TEST(Best, RowsAreTriedInOrderAndFullOnesAreSkipped) {
  Fixture f;
  f.service->hold("s1", "x", {1});        // row 0 now has free runs of length 1 (seat 0) and 2 (seats 2-3)
  f.service->hold("s1", "y", {5, 6});     // row 1 keeps seat 4 and seat 7 apart
  EXPECT_TRUE(f.best("ann", 2) == (Seats{2, 3}));
  EXPECT_TRUE(f.best("bob", 2) == (Seats{8, 9}));  // rows 0 and 1 have no pair left
}

TEST(Best, InsideARowTheLowestStartingSeatWins) {
  Fixture f;
  f.service->hold("s1", "x", {2});  // row 0: free 0-1 and 3
  f.service->hold("s1", "y", {5});  // row 1: free 4 and 6-7
  EXPECT_TRUE(f.best("ann", 1) == (Seats{0}));
  EXPECT_TRUE(f.best("bob", 2) == (Seats{6, 7}));
}

TEST(Best, ARowIsSkippedWhenNoRunIsLongEnough) {
  Fixture f;
  f.service->hold("s1", "x", {1, 3});  // row 0: only singles
  EXPECT_TRUE(f.best("ann", 2) == (Seats{4, 5}));
}

TEST(Best, SeatsFromLapsedHoldsAreCandidatesAgain) {
  Fixture f;
  f.service->hold("s1", "x", {0, 1, 2, 3});
  EXPECT_TRUE(f.best("ann", 2) == (Seats{4, 5}));
  f.clock->advance(kHold);
  EXPECT_TRUE(f.best("bob", 4) == (Seats{0, 1, 2, 3}));
}

TEST(Best, BookedSeatsAreNeverChosen) {
  Fixture f;
  const auto r = f.service->hold("s1", "x", {0, 1});
  f.service->confirm(r.id, "x");
  f.clock->advance(100);
  EXPECT_TRUE(f.best("ann", 2) == (Seats{2, 3}));
}

TEST(Best, WhenNothingFitsNothingIsHeld) {
  Fixture f;
  f.service->hold("s1", "x", {1, 5, 9});  // splits every row of 4 into pieces of 1 and 2
  const int before = f.service->freeSeats("s1");
  const auto r = f.service->holdBest("s1", "ann", 3);
  EXPECT_EQ(name(r.status), "SeatTaken");
  EXPECT_EQ(r.id, booking::kNoHold);
  EXPECT_EQ(f.service->freeSeats("s1"), before);
}

TEST(Best, ARowIsAsLongAsTheShowSays) {
  Fixture f;
  f.service->addShow("wide", 1, 8);
  const auto r = f.service->holdBest("wide", "ann", 6);
  EXPECT_EQ(name(r.status), "Ok");
  EXPECT_TRUE(f.service->seatsOf(r.id) == (Seats{0, 1, 2, 3, 4, 5}));
  EXPECT_EQ(name(f.service->holdBest("wide", "bob", 3).status), "SeatTaken");
}

TEST(Best, TheCountIsCheckedLikeAnyHold) {
  Fixture f;
  EXPECT_EQ(name(f.service->holdBest("nope", "ann", 2).status), "UnknownShow");
  EXPECT_EQ(name(f.service->holdBest("s1", "ann", 0).status), "BadSeat");
  EXPECT_EQ(name(f.service->holdBest("s1", "ann", -2).status), "BadSeat");
  EXPECT_EQ(name(f.service->holdBest("s1", "ann", 7).status), "TooManySeats");
  EXPECT_EQ(f.service->freeSeats("s1"), 12);
}

TEST(Best, ARowTooShortForTheCountIsSeatTakenNotTooMany) {
  Fixture f;  // rows of 4, count 5 is legal but cannot fit anywhere
  EXPECT_EQ(name(f.service->holdBest("s1", "ann", 5).status), "SeatTaken");
}

TEST(Best, SeatsOfShowsOnlyLiveHolds) {
  Fixture f;
  const auto a = f.service->holdBest("s1", "ann", 2);
  const auto b = f.service->holdBest("s1", "bob", 2);
  EXPECT_TRUE(f.service->seatsOf(a.id) == (Seats{0, 1}));
  f.service->release(a.id, "ann");
  EXPECT_TRUE(f.service->seatsOf(a.id).empty());
  f.clock->advance(kHold);
  EXPECT_TRUE(f.service->seatsOf(b.id).empty());
  EXPECT_TRUE(f.service->seatsOf(777).empty());
}

TEST(Best, ExplicitSeatsReportedBySeatsOfAreSorted) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {9, 2, 5});
  EXPECT_TRUE(f.service->seatsOf(r.id) == (Seats{2, 5, 9}));
}

TEST(Best, BestHoldsExtendLikeAnyOther) {
  Fixture f;
  const auto r = f.service->holdBest("s1", "ann", 2);
  f.clock->advance(6);
  EXPECT_TRUE(f.service->extend(r.id, "ann") == booking::ExtendResult::Ok);
  f.clock->advance(9);
  EXPECT_TRUE(f.service->seatState("s1", 0) == SeatState::Held);
  EXPECT_TRUE(f.service->extend(r.id, "ann") == booking::ExtendResult::AlreadyExtended);
}

TEST(Best, ANullClockIsStillRefused) {
  EXPECT_TRUE(booking::makeSeatingService(nullptr, 10) == nullptr);
}
