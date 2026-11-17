#include <algorithm>
#include <iterator>
#include <map>
#include <memory>
#include <string>

#include "api.h"
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

// Today is day 10. "double": 2 rooms at 10000 a night. "suite": 1 room at 30000 a night.
struct Fixture {
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<hotel::Hotel> hotel = hotel::makeHotel(clock);
  Fixture() {
    hotel->addRoomType("double", 2, 10000);
    hotel->addRoomType("suite", 1, 30000);
  }
  hotel::BookResult book(const std::string& guest, const std::string& type, long long in, long long out) {
    return hotel->book(guest, type, in, out);
  }
};
}  // namespace

TEST(Setup, AFactoryRefusesANullClock) {
  EXPECT_TRUE(hotel::makeHotel(nullptr) == nullptr);
  EXPECT_TRUE(hotel::makeHotel(std::make_shared<FakeClock>()) != nullptr);
}

TEST(Setup, RoomTypesMustBeNewAndHaveSaneNumbers) {
  Fixture f;
  EXPECT_FALSE(f.hotel->addRoomType("double", 5, 5000));
  EXPECT_FALSE(f.hotel->addRoomType("", 5, 5000));
  EXPECT_FALSE(f.hotel->addRoomType("x", 0, 5000));
  EXPECT_FALSE(f.hotel->addRoomType("x", 1001, 5000));
  EXPECT_FALSE(f.hotel->addRoomType("x", 5, 0));
  EXPECT_FALSE(f.hotel->addRoomType("x", 5, 1000001));
  EXPECT_TRUE(f.hotel->addRoomType("big", 1000, 1000000));
  EXPECT_EQ(f.hotel->available("big", 20, 21), 1000);
}

TEST(Setup, ARefusedRoomTypeDoesNotDisturbTheExistingOne) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 20, 22).status == Status::Ok);
  EXPECT_FALSE(f.hotel->addRoomType("suite", 9, 1));
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 0);
  EXPECT_TRUE(f.book("bob", "suite", 20, 21).status == Status::SoldOut);
  EXPECT_EQ(f.book("bob", "suite", 22, 23).total, 30000);
}

TEST(Book, ABookingReturnsAPositiveIdAndTheTotal) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "double", 20, 23);
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.id > 0);
  EXPECT_EQ(r.total, 30000);
  EXPECT_EQ(f.book("bob", "suite", 20, 22).total, 60000);
}

TEST(Book, IdsAreDistinct) {
  Fixture f;
  const hotel::BookResult a = f.book("ann", "double", 20, 21);
  const hotel::BookResult b = f.book("bob", "double", 20, 21);
  EXPECT_TRUE(a.id > 0);
  EXPECT_TRUE(b.id > 0);
  EXPECT_TRUE(a.id != b.id);
}

TEST(Book, ARefusalCarriesNoIdAndNoTotal) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "nope", 20, 21);
  EXPECT_TRUE(r.status == Status::UnknownType);
  EXPECT_EQ(r.id, hotel::kNoReservation);
  EXPECT_EQ(r.total, 0);
}

TEST(Book, UnknownTypeIsCheckedFirst) {
  Fixture f;
  EXPECT_TRUE(f.book("", "nope", 5, 5).status == Status::UnknownType);
  EXPECT_TRUE(f.book("ann", "nope", 5, 6).status == Status::UnknownType);
}

TEST(Book, InvalidRequestsAreRefused) {
  Fixture f;
  EXPECT_TRUE(f.book("", "double", 20, 21).status == Status::InvalidRequest);
  EXPECT_TRUE(f.book("ann", "double", 20, 20).status == Status::InvalidRequest);
  EXPECT_TRUE(f.book("ann", "double", 21, 20).status == Status::InvalidRequest);
  EXPECT_EQ(f.hotel->available("double", 20, 21), 2);
}

TEST(Book, AStayIsAtMostThirtyNights) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "double", 20, 51).status == Status::InvalidRequest);
  EXPECT_TRUE(f.book("ann", "double", 20, 50).status == Status::Ok);
}

TEST(Book, InvalidIsCheckedBeforeInThePast) {
  Fixture f;
  EXPECT_TRUE(f.book("", "double", 2, 3).status == Status::InvalidRequest);
  EXPECT_TRUE(f.book("ann", "double", 4, 4).status == Status::InvalidRequest);
}

TEST(Book, CheckingInTodayIsAllowedButYesterdayIsNot) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "double", 10, 11).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "double", 9, 12).status == Status::InPast);
  EXPECT_EQ(f.hotel->available("double", 9, 12), 1);
}

TEST(Book, InThePastIsCheckedBeforeSoldOut) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 10, 12).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "suite", 9, 11).status == Status::InPast);
}

TEST(Book, TheClockDecidesWhatIsInThePast) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "double", 14, 15).status == Status::Ok);
  f.clock->set(15);
  EXPECT_TRUE(f.book("bob", "double", 14, 16).status == Status::InPast);
  EXPECT_TRUE(f.book("bob", "double", 15, 16).status == Status::Ok);
}

TEST(Book, TypesAreIndependent) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 20, 22).status == Status::Ok);
  EXPECT_EQ(f.hotel->available("double", 20, 22), 2);
  EXPECT_TRUE(f.book("bob", "double", 20, 22).status == Status::Ok);
}

TEST(Overlap, TheLastRoomOfATypeCannotBeBookedTwice) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 20, 23).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "suite", 20, 23).status == Status::SoldOut);
  EXPECT_TRUE(f.book("bob", "suite", 22, 25).status == Status::SoldOut);
  EXPECT_TRUE(f.book("bob", "suite", 18, 21).status == Status::SoldOut);
}

TEST(Overlap, AGuestMayLeaveOnTheDayAnotherArrives) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 20, 23).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "suite", 23, 25).status == Status::Ok);
  EXPECT_TRUE(f.book("cat", "suite", 18, 20).status == Status::Ok);
  EXPECT_EQ(f.hotel->available("suite", 18, 25), 0);
  EXPECT_EQ(f.hotel->available("suite", 25, 26), 1);
}

TEST(Overlap, AStayThatSurroundsOrFitsInsideAnotherOverlaps) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 20, 30).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "suite", 24, 25).status == Status::SoldOut);
  EXPECT_TRUE(f.book("cat", "suite", 15, 40).status == Status::SoldOut);
  EXPECT_TRUE(f.book("cat", "suite", 19, 31).status == Status::SoldOut);
  Fixture g;
  EXPECT_TRUE(g.book("ann", "suite", 24, 25).status == Status::Ok);
  EXPECT_TRUE(g.book("bob", "suite", 20, 30).status == Status::SoldOut);
}

TEST(Overlap, TheTightestNightDecidesAvailability) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "double", 20, 22).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "double", 21, 23).status == Status::Ok);
  // night 21 has both rooms taken; 20 and 22 have one free each
  EXPECT_EQ(f.hotel->available("double", 20, 23), 0);
  EXPECT_EQ(f.hotel->available("double", 20, 21), 1);
  EXPECT_EQ(f.hotel->available("double", 22, 23), 1);
  EXPECT_EQ(f.hotel->available("double", 21, 22), 0);
  EXPECT_TRUE(f.book("cat", "double", 20, 23).status == Status::SoldOut);
}

TEST(Book, ASoldOutRequestChangesNothing) {
  Fixture f;
  EXPECT_TRUE(f.book("ann", "suite", 22, 24).status == Status::Ok);
  EXPECT_TRUE(f.book("bob", "suite", 20, 23).status == Status::SoldOut);
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 1);
  EXPECT_TRUE(f.book("cat", "suite", 20, 22).status == Status::Ok);
}

TEST(Available, CountsDropWithEveryBookingAndIgnoreOtherNights) {
  Fixture f;
  EXPECT_EQ(f.hotel->available("double", 20, 23), 2);
  f.book("ann", "double", 20, 21);
  EXPECT_EQ(f.hotel->available("double", 20, 23), 1);
  EXPECT_EQ(f.hotel->available("double", 21, 23), 2);
  f.book("bob", "double", 22, 23);
  EXPECT_EQ(f.hotel->available("double", 20, 23), 1);
  f.book("cat", "double", 20, 21);
  EXPECT_EQ(f.hotel->available("double", 20, 23), 0);
  EXPECT_EQ(f.hotel->available("double", 21, 22), 2);
}

TEST(Available, UnknownTypesAndBadRangesHaveNoRooms) {
  Fixture f;
  EXPECT_EQ(f.hotel->available("nope", 20, 21), 0);
  EXPECT_EQ(f.hotel->available("double", 20, 20), 0);
  EXPECT_EQ(f.hotel->available("double", 21, 20), 0);
  EXPECT_EQ(f.hotel->available("double", 20, 51), 0);
}

TEST(Available, IgnoresToday) {
  Fixture f;
  EXPECT_EQ(f.hotel->available("double", 1, 3), 2);
}

TEST(Cancel, FreesEveryNightOfTheStay) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "suite", 20, 25);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::Ok);
  EXPECT_EQ(f.hotel->available("suite", 20, 25), 1);
  EXPECT_TRUE(f.book("bob", "suite", 20, 25).status == Status::Ok);
}

TEST(Cancel, CancellingFreesOnlyItsOwnRoom) {
  Fixture f;
  const hotel::BookResult a = f.book("ann", "double", 20, 22);
  f.book("bob", "double", 20, 22);
  EXPECT_TRUE(f.hotel->cancel(a.id, "ann") == Status::Ok);
  EXPECT_EQ(f.hotel->available("double", 20, 22), 1);
  EXPECT_TRUE(f.book("cat", "double", 20, 22).status == Status::Ok);
  EXPECT_TRUE(f.book("dan", "double", 20, 22).status == Status::SoldOut);
}

TEST(Cancel, OnlyTheGuestCanCancel) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "suite", 20, 22);
  EXPECT_TRUE(f.hotel->cancel(r.id, "bob") == Status::WrongGuest);
  EXPECT_TRUE(f.hotel->cancel(r.id, "") == Status::WrongGuest);
  EXPECT_EQ(f.hotel->available("suite", 20, 22), 0);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::Ok);
}

TEST(Cancel, UnknownIdsAreReported) {
  Fixture f;
  EXPECT_TRUE(f.hotel->cancel(12345, "ann") == Status::UnknownReservation);
  EXPECT_TRUE(f.hotel->cancel(hotel::kNoReservation, "ann") == Status::UnknownReservation);
  EXPECT_TRUE(f.hotel->cancel(-3, "ann") == Status::UnknownReservation);
}

TEST(Cancel, AStayThatHasStartedCannotBeCancelled) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "suite", 14, 16);
  f.clock->set(13);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::Ok);
  const hotel::BookResult s = f.book("ann", "suite", 14, 16);
  f.clock->set(14);
  EXPECT_TRUE(f.hotel->cancel(s.id, "ann") == Status::StayStarted);
  f.clock->set(15);
  EXPECT_TRUE(f.hotel->cancel(s.id, "ann") == Status::StayStarted);
  EXPECT_EQ(f.hotel->available("suite", 14, 16), 0);
}

TEST(Cancel, FailuresAreReportedInTheDocumentedOrder) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "suite", 12, 14);
  f.clock->set(13);
  EXPECT_TRUE(f.hotel->cancel(r.id, "bob") == Status::WrongGuest);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::StayStarted);
  EXPECT_TRUE(f.hotel->cancel(999, "bob") == Status::UnknownReservation);
}

TEST(Cancel, ACancelledReservationIsSpent) {
  Fixture f;
  const hotel::BookResult r = f.book("ann", "double", 20, 22);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.hotel->cancel(r.id, "ann") == Status::UnknownReservation);
  EXPECT_EQ(f.hotel->available("double", 20, 22), 2);
}

TEST(Cancel, IdsAreNeverReused) {
  Fixture f;
  const hotel::BookResult a = f.book("ann", "double", 20, 22);
  f.hotel->cancel(a.id, "ann");
  const hotel::BookResult b = f.book("bob", "double", 20, 22);
  EXPECT_TRUE(b.id > 0);
  EXPECT_TRUE(b.id != a.id);
  EXPECT_TRUE(f.hotel->cancel(a.id, "bob") == Status::UnknownReservation);
}

TEST(Contention, ManyStaysAgreeWithASimpleNightByNightModel) {
  auto h = hotel::makeHotel(std::make_shared<FakeClock>());
  h->addRoomType("r", 3, 1000);
  std::map<long long, int> model;  // night -> rooms taken
  struct Live {
    hotel::ReservationId id;
    long long in;
    long long out;
  };
  std::map<int, Live> live;
  unsigned seed = 12345;
  auto next = [&seed](unsigned bound) {
    seed = seed * 1103515245u + 12345u;
    return (seed >> 16) % bound;
  };
  int nextKey = 0;
  for (int step = 0; step < 400; ++step) {
    if (next(4) != 0 || live.empty()) {
      const long long in = 11 + static_cast<long long>(next(12));
      const long long out = in + 1 + static_cast<long long>(next(5));
      int tightest = 3;
      for (long long n = in; n < out; ++n) tightest = std::min(tightest, 3 - model[n]);
      EXPECT_EQ(h->available("r", in, out), tightest);
      const hotel::BookResult r = h->book("g", "r", in, out);
      if (tightest > 0) {
        EXPECT_TRUE(r.status == Status::Ok);
        for (long long n = in; n < out; ++n) ++model[n];
        live[nextKey++] = Live{r.id, in, out};
      } else {
        EXPECT_TRUE(r.status == Status::SoldOut);
      }
    } else {
      auto it = live.begin();
      std::advance(it, static_cast<long>(next(static_cast<unsigned>(live.size()))));
      EXPECT_TRUE(h->cancel(it->second.id, "g") == Status::Ok);
      for (long long n = it->second.in; n < it->second.out; ++n) --model[n];
      live.erase(it);
    }
  }
  for (long long n = 11; n < 30; ++n) EXPECT_EQ(h->available("r", n, n + 1), 3 - model[n]);
}
