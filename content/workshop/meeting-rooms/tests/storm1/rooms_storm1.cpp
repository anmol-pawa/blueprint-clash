#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using rooms::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<rooms::FindingScheduler> s = rooms::makeFindingScheduler();
  Fixture() {
    s->addRoom("Huge", 20);
    s->addRoom("Small", 4);
    s->addRoom("Medium", 8);
    s->addRoom("Small-twin", 4);
  }
  std::string any(const std::string& id, int start, int end, int people) {
    std::string room = "-";
    const Status st = s->bookAny(id, start, end, people, room);
    return st == Status::Ok ? room : "refused:" + std::to_string(static_cast<int>(st));
  }
};
}  // namespace

TEST(Finding, PicksTheSmallestRoomThatIsBigEnough) {
  Fixture f;
  EXPECT_EQ(f.any("a", 0, 10, 2), std::string("Small"));
  EXPECT_EQ(f.any("b", 0, 10, 4), std::string("Small-twin"));
  EXPECT_EQ(f.any("c", 0, 10, 5), std::string("Medium"));
  EXPECT_EQ(f.any("d", 0, 10, 9), std::string("Huge"));
  EXPECT_EQ(f.any("e", 20, 30, 8), std::string("Medium"));
}

TEST(Finding, TiesGoToTheRoomAddedFirstAndBusyRoomsAreSkipped) {
  Fixture f;
  EXPECT_EQ(f.any("a", 0, 10, 1), std::string("Small"));
  EXPECT_EQ(f.any("b", 5, 15, 1), std::string("Small-twin"));
  EXPECT_EQ(f.any("c", 8, 12, 1), std::string("Medium"));
  EXPECT_EQ(f.any("d", 9, 11, 1), std::string("Huge"));
  EXPECT_EQ(f.any("e", 10, 20, 1), std::string("Small"));
}

TEST(Finding, AChosenBookingIsAnOrdinaryBooking) {
  Fixture f;
  EXPECT_EQ(f.any("a", 100, 160, 3), std::string("Small"));
  std::string room;
  IS(f.s->roomOf("a", room), Ok);
  EXPECT_EQ(room, std::string("Small"));
  IS(f.s->book("b", "Small", 150, 170, 1), Conflict);
  EXPECT_FALSE(f.s->isFree("Small", 100, 101));
  IS(f.s->cancel("a"), Ok);
  EXPECT_TRUE(f.s->isFree("Small", 100, 160));
  EXPECT_EQ(f.any("a", 100, 160, 3), std::string("Small"));
  IS(f.s->book("m", "Medium", 0, 10, 8), Ok);
  EXPECT_EQ(f.any("n", 5, 6, 5), std::string("Huge"));
}

TEST(Finding, TheRoomOnlyHoldsAsLongAsTheCallerKeepsItFreeOverTheWholeSpan) {
  Fixture f;
  IS(f.s->book("late", "Small", 50, 60, 1), Ok);
  IS(f.s->book("late2", "Small-twin", 50, 60, 1), Ok);
  EXPECT_EQ(f.any("a", 40, 55, 4), std::string("Medium"));
  EXPECT_EQ(f.any("b", 40, 50, 4), std::string("Small"));
}

TEST(Finding, RefusalsFollowTheDocumentedOrderAndLeaveTheRoomUntouched) {
  Fixture f;
  std::string room = "untouched";
  IS(f.s->bookAny("", 0, 10, 2, room), InvalidInput);
  IS(f.s->bookAny("x", 10, 10, 2, room), InvalidInput);
  IS(f.s->bookAny("x", 0, 10, 0, room), InvalidInput);
  IS(f.s->bookAny("x", 0, rooms::kMaxTime + 1, 2, room), InvalidInput);
  IS(f.s->bookAny("x", 10, 10, 99, room), InvalidInput);
  IS(f.s->book("taken", "Small", 0, 10, 1), Ok);
  IS(f.s->bookAny("taken", 0, 10, 99, room), DuplicateBooking);
  IS(f.s->bookAny("big", 0, 10, 21, room), TooManyPeople);
  EXPECT_EQ(room, std::string("untouched"));
  IS(f.s->book("h", "Huge", 0, 10, 20), Ok);
  IS(f.s->book("m", "Medium", 0, 10, 8), Ok);
  IS(f.s->book("t", "Small-twin", 0, 10, 4), Ok);
  IS(f.s->bookAny("none", 5, 6, 1, room), NoRoomFree);
  EXPECT_EQ(room, std::string("untouched"));
  IS(f.s->bookAny("ok", 10, 11, 1, room), Ok);
  EXPECT_EQ(room, std::string("Small"));
  std::string where;
  IS(f.s->roomOf("none", where), UnknownBooking);
}

TEST(Finding, WithNoRoomsAtAllTheAnswerIsTooManyPeople) {
  auto s = rooms::makeFindingScheduler();
  std::string room;
  IS(s->bookAny("a", 0, 10, 1, room), TooManyPeople);
  IS(s->addRoom("Tiny", 2), Ok);
  IS(s->bookAny("a", 0, 10, 3, room), TooManyPeople);
  IS(s->bookAny("a", 0, 10, 2, room), Ok);
  IS(s->bookAny("b", 0, 10, 2, room), NoRoomFree);
}

TEST(Finding, RandomRequestsAgreeWithAnIndependentSearch) {
  unsigned long long seed = 777ULL;
  auto next = [&seed](int bound) {
    seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<int>((seed >> 33) % static_cast<unsigned long long>(bound));
  };
  auto s = rooms::makeFindingScheduler();
  struct R {
    std::string name;
    int cap;
    std::vector<std::pair<int, int>> spans;
  };
  std::vector<R> model = {{"r0", 6, {}}, {"r1", 3, {}}, {"r2", 10, {}}, {"r3", 3, {}}, {"r4", 6, {}}};
  for (const auto& r : model) s->addRoom(r.name, r.cap);
  for (int step = 0; step < 1500; ++step) {
    const int start = next(100);
    const int end = start + 1 + next(15);
    const int people = 1 + next(11);
    int best = -1;
    bool anyFit = false;
    for (int i = 0; i < static_cast<int>(model.size()); ++i) {
      if (model[i].cap < people) continue;
      anyFit = true;
      bool free = true;
      for (const auto& sp : model[i].spans) free = free && !(sp.first < end && start < sp.second);
      if (free && (best < 0 || model[i].cap < model[best].cap)) best = i;
    }
    std::string room;
    const Status st = s->bookAny("id" + std::to_string(step), start, end, people, room);
    if (!anyFit) {
      EXPECT_TRUE(st == Status::TooManyPeople);
    } else if (best < 0) {
      EXPECT_TRUE(st == Status::NoRoomFree);
    } else {
      EXPECT_TRUE(st == Status::Ok);
      EXPECT_EQ(room, model[best].name);
      model[best].spans.push_back({start, end});
    }
  }
}
