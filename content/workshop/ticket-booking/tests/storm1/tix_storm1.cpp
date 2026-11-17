#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
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

struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<tix::SmartBooking> booking = tix::makeSmartBooking(clock, 100);
  Fixture(int rows = 5, int seats = 9) { booking->addShow("s", rows, seats); }
  SeatState state(const std::string& seat) const { return *booking->seatState("s", seat); }
};
}  // namespace

TEST(Setup, ASmartBookingStillDoesEverythingABookingDoes) {
  Fixture f;
  EXPECT_TRUE(tix::makeSmartBooking(nullptr, 100) == nullptr);
  EXPECT_TRUE(tix::makeSmartBooking(f.clock, 0) == nullptr);
  const auto r = f.booking->hold("s", "ann", {"A1"});
  EXPECT_TRUE(r.status == Status::Ok);
  f.clock->advance(100);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::HoldExpired);
}

TEST(Best, AnEmptyHallGivesTheMiddleOfTheMiddleRow) {
  Fixture f;  // 5 rows x 9 seats: middle row C, middle seat 5
  const auto r = f.booking->holdBest("s", "ann", 1);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.seats == (Seats{"C5"}));
  EXPECT_TRUE(f.state("C5") == SeatState::Held);
}

TEST(Best, AnOddGroupIsCentredOnTheMiddleSeat) {
  Fixture f;
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 3).seats == (Seats{"C4", "C5", "C6"}));
}

TEST(Best, AnEvenGroupInAnOddRowTiesAndTheLeftmostWins) {
  Fixture f;
  // Nine seats, runs of four: C3..C6 and C4..C7 are each half a seat off the middle (C5), so the lower first seat wins.
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 4).seats == (Seats{"C3", "C4", "C5", "C6"}));
}

TEST(Best, AnEvenHallPrefersTheUpperOfTheTwoMiddleRows) {
  Fixture f(4, 5);  // rows A..D: B and C are equally central, lower row index wins
  const auto r = f.booking->holdBest("s", "ann", 1);
  EXPECT_TRUE(r.seats == (Seats{"B3"}));
}

TEST(Best, TheRowComesBeforeTheSeatPosition) {
  Fixture f;
  // Occupy the dead centre of the middle row; a worse seat in the middle row still beats a perfect seat elsewhere.
  f.booking->hold("s", "x", {"C5"});
  const auto r = f.booking->holdBest("s", "ann", 1);
  EXPECT_TRUE(r.seats == (Seats{"C4"}));
}

TEST(Best, FullMiddleRowMovesToTheNextClosestRowsInOrder) {
  Fixture f;
  f.booking->hold("s", "x", {"C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"});
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 1).seats == (Seats{"B5"}));  // B and D tie, lower row wins
  EXPECT_TRUE(f.booking->holdBest("s", "bob", 1).seats == (Seats{"D5"}));  // rows B and D tie again: D5 is centred
}

TEST(Best, RunsNeverCrossAHeldSeat) {
  Fixture f(1, 9);
  f.booking->hold("s", "x", {"A5"});
  const auto r = f.booking->holdBest("s", "ann", 4);
  EXPECT_TRUE(r.status == Status::Ok);
  // Runs of four: A1..A4 and A6..A9 are equally far from the middle seat, so the lower first seat wins.
  EXPECT_TRUE(r.seats == (Seats{"A1", "A2", "A3", "A4"}));
}

TEST(Best, ARowThatCannotFitTheGroupIsSkippedEvenIfItIsMoreCentral) {
  Fixture f;
  f.booking->hold("s", "x", {"C3", "C7"});  // middle row: runs of at most 3 (C4..C6)
  const auto r = f.booking->holdBest("s", "ann", 4);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.seats == (Seats{"B3", "B4", "B5", "B6"}));
}

TEST(Best, ExpiredHoldsDoNotBlockTheBestSeats) {
  Fixture f;
  f.booking->hold("s", "x", {"C5"});
  f.clock->advance(100);
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 1).seats == (Seats{"C5"}));
}

TEST(Best, ConfirmedSeatsAreNeverOffered) {
  Fixture f;
  const auto x = f.booking->hold("s", "x", {"C5"});
  f.booking->confirm(x.id, "x");
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 1).seats == (Seats{"C4"}));
}

TEST(Best, ABestHoldBehavesLikeAnyOtherHold) {
  Fixture f;
  const auto r = f.booking->holdBest("s", "ann", 2);
  EXPECT_TRUE(f.booking->confirm(r.id, "bob") == Status::WrongUser);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::Ok);
  for (const std::string& seat : r.seats) EXPECT_TRUE(f.state(seat) == SeatState::Booked);
  const auto again = f.booking->holdBest("s", "bob", 2);
  EXPECT_NE(again.id, r.id);
}

TEST(Best, NoRoomIsSeatUnavailableAndChangesNothing) {
  Fixture f(1, 4);
  f.booking->hold("s", "x", {"A2"});
  const auto r = f.booking->holdBest("s", "ann", 3);
  EXPECT_TRUE(r.status == Status::SeatUnavailable);
  EXPECT_EQ(r.id, tix::kNoHold);
  EXPECT_TRUE(r.seats.empty());
  EXPECT_EQ(f.booking->availableSeats("s").size(), static_cast<std::size_t>(3));
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 5).status == Status::SeatUnavailable);
}

TEST(Best, InvalidRequestsAreRefused) {
  Fixture f;
  EXPECT_TRUE(f.booking->holdBest("nope", "ann", 1).status == Status::UnknownShow);
  EXPECT_TRUE(f.booking->holdBest("s", "", 1).status == Status::InvalidRequest);
  EXPECT_TRUE(f.booking->holdBest("s", "ann", 0).status == Status::InvalidRequest);
  EXPECT_TRUE(f.booking->holdBest("s", "ann", -2).status == Status::InvalidRequest);
}

TEST(Best, FillingTheHallByPairsLeavesTheEndSeatsAloneAndNeverDoubleBooks) {
  Fixture f(2, 4);
  int placed = 0;
  for (int i = 0; i < 10; ++i) {
    if (f.booking->holdBest("s", "u" + std::to_string(i), 2).status == Status::Ok) ++placed;
  }
  // Each row takes one pair in the middle (A2 A3, B2 B3); the single seats left at the ends can never hold a pair.
  EXPECT_EQ(placed, 2);
  EXPECT_TRUE(f.booking->availableSeats("s") == (Seats{"A1", "A4", "B1", "B4"}));
}
