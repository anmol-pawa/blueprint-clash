#include <algorithm>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using rooms::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<rooms::Scheduler> s = rooms::makeScheduler();
  Fixture() {
    s->addRoom("Atlas", 4);
    s->addRoom("Borealis", 10);
  }
  std::string spans(const std::string& room) const {
    std::string out;
    for (const auto& b : s->bookings(room)) {
      out += (out.empty() ? "" : " ") + b.id + "@" + std::to_string(b.start) + "-" + std::to_string(b.end);
    }
    return out;
  }
};

// A plain list of (room, id, start, end): the obvious, slow model.
struct Model {
  struct Item {
    std::string room, id;
    int start, end;
  };
  std::vector<Item> items;
  bool free(const std::string& room, int start, int end) const {
    for (const auto& it : items) {
      if (it.room == room && it.start < end && start < it.end) return false;
    }
    return true;
  }
};
}  // namespace

TEST(Rooms, AddRoomChecksItsArgumentsInOrder) {
  auto s = rooms::makeScheduler();
  IS(s->addRoom("", 4), InvalidInput);
  IS(s->addRoom(std::string(33, 'x'), 4), InvalidInput);
  IS(s->addRoom("Atlas", 0), InvalidInput);
  IS(s->addRoom("Atlas", rooms::kMaxCapacity + 1), InvalidInput);
  IS(s->addRoom(std::string(32, 'x'), rooms::kMaxCapacity), Ok);
  IS(s->addRoom("Atlas", 1), Ok);
  IS(s->addRoom("Atlas", 9), DuplicateRoom);
  IS(s->addRoom("Atlas", 0), InvalidInput);
  EXPECT_TRUE(s->bookings("Atlas").empty());
}

TEST(Booking, ASimpleBookingIsListedByStartTimeAndFindsItsRoom) {
  Fixture f;
  IS(f.s->book("c", "Atlas", 200, 260, 3), Ok);
  IS(f.s->book("a", "Atlas", 0, 30, 1), Ok);
  IS(f.s->book("b", "Atlas", 100, 160, 4), Ok);
  IS(f.s->book("other", "Borealis", 50, 70, 8), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("a@0-30 b@100-160 c@200-260"));
  EXPECT_EQ(f.spans("Borealis"), std::string("other@50-70"));
  const auto list = f.s->bookings("Atlas");
  EXPECT_EQ(list[1].attendees, 4);
  std::string room;
  IS(f.s->roomOf("b", room), Ok);
  EXPECT_EQ(room, std::string("Atlas"));
  IS(f.s->roomOf("other", room), Ok);
  EXPECT_EQ(room, std::string("Borealis"));
  IS(f.s->roomOf("nope", room), UnknownBooking);
  EXPECT_EQ(room, std::string("Borealis"));
  EXPECT_TRUE(f.s->bookings("Nowhere").empty());
}

TEST(Clash, SpansAreHalfOpenSoBackToBackMeetingsShareARoom) {
  Fixture f;
  IS(f.s->book("m1", "Atlas", 60, 120, 2), Ok);
  IS(f.s->book("before", "Atlas", 0, 60, 2), Ok);
  IS(f.s->book("after", "Atlas", 120, 180, 2), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("before@0-60 m1@60-120 after@120-180"));
  IS(f.s->book("x", "Atlas", 119, 121, 1), Conflict);
  IS(f.s->book("y", "Atlas", 59, 61, 1), Conflict);
  EXPECT_TRUE(f.s->isFree("Atlas", 180, 240));
  EXPECT_FALSE(f.s->isFree("Atlas", 179, 240));
}

TEST(Clash, EveryShapeOfOverlapIsRefused) {
  Fixture f;
  IS(f.s->book("base", "Atlas", 100, 200, 2), Ok);
  IS(f.s->book("same", "Atlas", 100, 200, 1), Conflict);
  IS(f.s->book("inside", "Atlas", 120, 140, 1), Conflict);
  IS(f.s->book("around", "Atlas", 50, 250, 1), Conflict);
  IS(f.s->book("left", "Atlas", 50, 101, 1), Conflict);
  IS(f.s->book("right", "Atlas", 199, 300, 1), Conflict);
  IS(f.s->book("one-minute", "Atlas", 150, 151, 1), Conflict);
  IS(f.s->book("elsewhere", "Borealis", 100, 200, 1), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("base@100-200"));
}

TEST(Clash, AMeetingThatSpansSeveralOthersConflictsWithAnyOfThem) {
  Fixture f;
  IS(f.s->book("a", "Atlas", 0, 10, 1), Ok);
  IS(f.s->book("b", "Atlas", 20, 30, 1), Ok);
  IS(f.s->book("c", "Atlas", 40, 50, 1), Ok);
  IS(f.s->book("wide", "Atlas", 5, 45, 1), Conflict);
  IS(f.s->book("gap", "Atlas", 10, 20, 1), Ok);
  IS(f.s->book("gap2", "Atlas", 30, 40, 1), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("a@0-10 gap@10-20 b@20-30 gap2@30-40 c@40-50"));
}

TEST(Validation, BookChecksInTheDocumentedOrderAndARefusedCallChangesNothing) {
  Fixture f;
  IS(f.s->book("taken", "Atlas", 100, 200, 2), Ok);
  IS(f.s->book("", "Atlas", 10, 20, 1), InvalidInput);
  IS(f.s->book(std::string(33, 'i'), "Atlas", 10, 20, 1), InvalidInput);
  IS(f.s->book("neg", "Atlas", -1, 20, 1), InvalidInput);
  IS(f.s->book("empty", "Atlas", 20, 20, 1), InvalidInput);
  IS(f.s->book("backwards", "Atlas", 30, 20, 1), InvalidInput);
  IS(f.s->book("late", "Atlas", 10, rooms::kMaxTime + 1, 1), InvalidInput);
  IS(f.s->book("nobody", "Atlas", 10, 20, 0), InvalidInput);
  IS(f.s->book("ghost-room-bad-span", "Nowhere", 20, 20, 1), InvalidInput);
  IS(f.s->book("ghost", "Nowhere", 10, 20, 1), UnknownRoom);
  IS(f.s->book("taken", "Nowhere", 10, 20, 1), UnknownRoom);
  IS(f.s->book("taken", "Atlas", 300, 400, 1), DuplicateBooking);
  IS(f.s->book("taken", "Atlas", 300, 400, 99), DuplicateBooking);
  IS(f.s->book("big", "Atlas", 100, 200, 5), TooManyPeople);
  IS(f.s->book("big", "Atlas", 300, 400, 5), TooManyPeople);
  IS(f.s->book("late-edge", "Atlas", rooms::kMaxTime - 10, rooms::kMaxTime, 4), Ok);
  IS(f.s->book("zero", "Atlas", 0, 1, 4), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("zero@0-1 taken@100-200 late-edge@999990-1000000"));
  std::string room;
  IS(f.s->roomOf("big", room), UnknownBooking);
  IS(f.s->roomOf("neg", room), UnknownBooking);
}

TEST(Capacity, ExactlyTheCapacityFitsOneMoreDoesNot) {
  Fixture f;
  IS(f.s->book("full", "Atlas", 0, 10, 4), Ok);
  IS(f.s->book("over", "Atlas", 10, 20, 5), TooManyPeople);
  IS(f.s->book("ten", "Borealis", 0, 10, 10), Ok);
  IS(f.s->book("eleven", "Borealis", 10, 20, 11), TooManyPeople);
}

TEST(Cancel, CancelFreesTheSpanAtOnceAndTheIdCanBeUsedAgain) {
  Fixture f;
  IS(f.s->book("m", "Atlas", 100, 200, 2), Ok);
  IS(f.s->book("n", "Atlas", 150, 250, 2), Conflict);
  IS(f.s->cancel("m"), Ok);
  IS(f.s->cancel("m"), UnknownBooking);
  EXPECT_TRUE(f.s->isFree("Atlas", 100, 200));
  IS(f.s->book("n", "Atlas", 150, 250, 2), Ok);
  IS(f.s->book("m", "Borealis", 0, 10, 2), Ok);
  std::string room;
  IS(f.s->roomOf("m", room), Ok);
  EXPECT_EQ(room, std::string("Borealis"));
  IS(f.s->cancel("never-existed"), UnknownBooking);
  EXPECT_EQ(f.spans("Atlas"), std::string("n@150-250"));
}

TEST(Query, IsFreeIsFalseForBadSpansAndUnknownRoomsAndNeverChangesAnything) {
  Fixture f;
  IS(f.s->book("m", "Atlas", 100, 200, 2), Ok);
  EXPECT_TRUE(f.s->isFree("Atlas", 0, 100));
  EXPECT_TRUE(f.s->isFree("Atlas", 200, 300));
  EXPECT_FALSE(f.s->isFree("Atlas", 99, 101));
  EXPECT_FALSE(f.s->isFree("Atlas", 150, 150));
  EXPECT_FALSE(f.s->isFree("Atlas", 300, 200));
  EXPECT_FALSE(f.s->isFree("Atlas", -5, 10));
  EXPECT_FALSE(f.s->isFree("Atlas", 0, rooms::kMaxTime + 1));
  EXPECT_FALSE(f.s->isFree("Nowhere", 0, 10));
  EXPECT_TRUE(f.s->isFree("Borealis", 100, 200));
  EXPECT_EQ(f.spans("Atlas"), std::string("m@100-200"));
}

TEST(Isolation, EachSchedulerHasItsOwnRooms) {
  auto a = rooms::makeScheduler();
  auto b = rooms::makeScheduler();
  IS(a->addRoom("Atlas", 4), Ok);
  IS(b->addRoom("Atlas", 4), Ok);
  IS(a->book("m", "Atlas", 0, 10, 1), Ok);
  EXPECT_TRUE(b->isFree("Atlas", 0, 10));
  IS(b->book("m", "Atlas", 0, 10, 1), Ok);
}

TEST(Model, RandomOperationsAgreeWithAListOfBookings) {
  unsigned long long seed = 20240601ULL;
  auto next = [&seed](int bound) {
    seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<int>((seed >> 33) % static_cast<unsigned long long>(bound));
  };
  auto s = rooms::makeScheduler();
  const std::vector<std::string> names = {"A", "B", "C"};
  s->addRoom("A", 3);
  s->addRoom("B", 6);
  s->addRoom("C", 12);
  const int caps[] = {3, 6, 12};
  Model model;
  for (int step = 0; step < 4000; ++step) {
    const int op = next(10);
    if (op < 7) {
      const int r = next(3);
      const int start = next(200);
      const int end = start + 1 + next(25);
      const int people = 1 + next(13);
      const std::string id = "b" + std::to_string(next(60));
      bool live = false;
      for (const auto& it : model.items) live = live || it.id == id;
      Status expected = Status::Ok;
      if (live) expected = Status::DuplicateBooking;
      else if (people > caps[r]) expected = Status::TooManyPeople;
      else if (!model.free(names[r], start, end)) expected = Status::Conflict;
      EXPECT_TRUE(s->book(id, names[r], start, end, people) == expected);
      if (expected == Status::Ok) model.items.push_back({names[r], id, start, end});
    } else if (op < 9) {
      const std::string id = "b" + std::to_string(next(60));
      bool live = false;
      for (const auto& it : model.items) live = live || it.id == id;
      EXPECT_TRUE(s->cancel(id) == (live ? Status::Ok : Status::UnknownBooking));
      model.items.erase(std::remove_if(model.items.begin(), model.items.end(), [&](const Model::Item& it) { return it.id == id; }),
                        model.items.end());
    } else {
      const int r = next(3);
      const int start = next(200);
      const int end = start + 1 + next(40);
      EXPECT_EQ(s->isFree(names[r], start, end), model.free(names[r], start, end));
    }
  }
  for (int r = 0; r < 3; ++r) {
    std::vector<Model::Item> mine;
    for (const auto& it : model.items) {
      if (it.room == names[r]) mine.push_back(it);
    }
    std::sort(mine.begin(), mine.end(), [](const Model::Item& x, const Model::Item& y) { return x.start < y.start; });
    const auto got = s->bookings(names[r]);
    ASSERT_EQ(got.size(), mine.size());
    for (std::size_t i = 0; i < mine.size(); ++i) {
      EXPECT_EQ(got[i].id, mine[i].id);
      EXPECT_EQ(got[i].start, mine[i].start);
      EXPECT_EQ(got[i].end, mine[i].end);
    }
  }
}
