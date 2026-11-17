#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
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

// Holds last 100 ticks, each user may use 4 seats per show.
struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<tix::LimitedBooking> booking = tix::makeLimitedBooking(clock, 100, 4);
  Fixture() {
    booking->addShow("s1", 4, 10);
    booking->addShow("s2", 4, 10);
  }
};
}  // namespace

TEST(Setup, TheFactoryRefusesBadArguments) {
  const auto clock = std::make_shared<FakeClock>();
  EXPECT_TRUE(tix::makeLimitedBooking(nullptr, 100, 4) == nullptr);
  EXPECT_TRUE(tix::makeLimitedBooking(clock, 0, 4) == nullptr);
  EXPECT_TRUE(tix::makeLimitedBooking(clock, 100, 0) == nullptr);
  EXPECT_TRUE(tix::makeLimitedBooking(clock, 100, 1) != nullptr);
}

TEST(Limit, AUserMayHoldUpToTheLimitAndNoMore) {
  Fixture f;
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4"}).status == Status::Ok);
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 4);
  const auto r = f.booking->hold("s1", "ann", {"B1"});
  EXPECT_TRUE(r.status == Status::OverLimit);
  EXPECT_EQ(r.id, tix::kNoHold);
  EXPECT_TRUE(*f.booking->seatState("s1", "B1") == SeatState::Available);
}

TEST(Limit, TheLimitCoversSeveralHoldsAtOnce) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1", "A2"});
  f.booking->hold("s1", "ann", {"A3"});
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A4", "A5"}).status == Status::OverLimit);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A4"}).status == Status::Ok);
}

TEST(Limit, AGroupLargerThanTheLimitIsRefusedEvenInAnEmptyHall) {
  Fixture f;
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4", "A5"}).status == Status::OverLimit);
  EXPECT_TRUE(f.booking->holdBest("s1", "ann", 5).status == Status::OverLimit);
  EXPECT_EQ(f.booking->availableSeats("s1").size(), static_cast<std::size_t>(40));
}

TEST(Limit, ConfirmedSeatsKeepCountingTowardsTheLimit) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1", "A2", "A3"});
  f.booking->confirm(r.id, "ann");
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 3);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"B1", "B2"}).status == Status::OverLimit);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"B1"}).status == Status::Ok);
  f.clock->advance(100000);
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 3);
}

TEST(Limit, ExpiredHoldsStopCounting) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4"});
  f.clock->advance(99);
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 4);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"B1"}).status == Status::OverLimit);
  f.clock->advance(1);
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 0);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"B1", "B2", "B3", "B4"}).status == Status::Ok);
}

TEST(Limit, ReleasedHoldsStopCounting) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4"});
  f.booking->release(r.id, "ann");
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 0);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"C1", "C2", "C3", "C4"}).status == Status::Ok);
}

TEST(Limit, ARefusedRequestDoesNotCount) {
  Fixture f;
  f.booking->hold("s1", "bob", {"A1"});
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "A2"}).status == Status::SeatUnavailable);
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 0);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A2", "A3", "A4", "A5"}).status == Status::Ok);
}

TEST(Limit, EachShowAndEachUserHasItsOwnAllowance) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4"});
  EXPECT_TRUE(f.booking->hold("s2", "ann", {"A1", "A2", "A3", "A4"}).status == Status::Ok);
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"B1", "B2", "B3", "B4"}).status == Status::Ok);
  EXPECT_EQ(f.booking->seatsInUse("s2", "bob"), 0);
  EXPECT_EQ(f.booking->seatsInUse("nope", "ann"), 0);
}

TEST(Limit, TheBestSeatSearchObeysTheLimitToo) {
  Fixture f;
  f.booking->hold("s1", "ann", {"A1", "A2"});
  EXPECT_TRUE(f.booking->holdBest("s1", "ann", 3).status == Status::OverLimit);
  const auto r = f.booking->holdBest("s1", "ann", 2);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(f.booking->seatsInUse("s1", "ann"), 4);
}

TEST(Limit, TheLimitIsCheckedBeforeAvailabilityButAfterTheSeatNames) {
  Fixture f;
  f.booking->hold("s1", "bob", {"A1"});
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4", "A5"}).status == Status::OverLimit);
  EXPECT_TRUE(f.booking->hold("s1", "ann", {"A1", "A2", "A3", "A4", "Z9"}).status == Status::UnknownSeat);
  EXPECT_TRUE(f.booking->holdBest("s1", "ann", 0).status == Status::InvalidRequest);
}

TEST(Limit, OlderRulesStillHold) {
  Fixture f;
  const auto r = f.booking->hold("s1", "ann", {"A1"});
  f.clock->advance(100);
  EXPECT_TRUE(f.booking->confirm(r.id, "ann") == Status::HoldExpired);
  EXPECT_TRUE(f.booking->hold("s1", "bob", {"A1"}).status == Status::Ok);
  EXPECT_TRUE(f.booking->holdBest("s1", "cat", 1).status == Status::Ok);
}
