#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using rooms::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<rooms::SeriesScheduler> s = rooms::makeSeriesScheduler();
  Fixture() {
    s->addRoom("Atlas", 6);
    s->addRoom("Borealis", 12);
  }
  std::string spans(const std::string& room) const {
    std::string out;
    for (const auto& b : s->bookings(room)) {
      out += (out.empty() ? "" : " ") + b.id + "@" + std::to_string(b.start) + "-" + std::to_string(b.end);
    }
    return out;
  }
};
}  // namespace

TEST(Series, OccurrencesRepeatAtAFixedStepAndAreListedInStartOrder) {
  Fixture f;
  IS(f.s->book("single", "Atlas", 300, 330, 2), Ok);
  IS(f.s->bookRepeating("standup", "Atlas", 100, 115, 5, 1440, 3), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("standup@100-115 single@300-330 standup@1540-1555 standup@2980-2995"));
  const auto list = f.s->bookings("Atlas");
  EXPECT_EQ(list[0].attendees, 5);
  EXPECT_EQ(list[3].attendees, 5);
  std::string room;
  IS(f.s->roomOf("standup", room), Ok);
  EXPECT_EQ(room, std::string("Atlas"));
  EXPECT_FALSE(f.s->isFree("Atlas", 1540, 1541));
  EXPECT_TRUE(f.s->isFree("Atlas", 1555, 2980));
}

TEST(Series, BackToBackOccurrencesAreAllowedWhenEveryEqualsTheLength) {
  Fixture f;
  IS(f.s->bookRepeating("block", "Atlas", 0, 60, 1, 60, 4), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("block@0-60 block@60-120 block@120-180 block@180-240"));
  IS(f.s->book("x", "Atlas", 240, 250, 1), Ok);
  IS(f.s->bookRepeating("tight", "Borealis", 0, 60, 1, 59, 2), InvalidInput);
  EXPECT_TRUE(f.s->bookings("Borealis").empty());
}

TEST(Series, OneClashingOccurrenceRefusesTheWholeSeriesAndLeavesNothingBehind) {
  Fixture f;
  IS(f.s->book("blocker", "Atlas", 3000, 3050, 1), Ok);
  IS(f.s->bookRepeating("weekly", "Atlas", 100, 160, 2, 1440, 3), Conflict);
  EXPECT_EQ(f.spans("Atlas"), std::string("blocker@3000-3050"));
  std::string room;
  IS(f.s->roomOf("weekly", room), UnknownBooking);
  IS(f.s->bookRepeating("weekly", "Atlas", 100, 160, 2, 1440, 2), Ok);
  IS(f.s->bookRepeating("early", "Atlas", 0, 10, 2, 20, 8), Conflict);
  IS(f.s->bookRepeating("early", "Atlas", 0, 10, 2, 20, 3), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("early@0-10 early@20-30 early@40-50 weekly@100-160 weekly@1540-1600 blocker@3000-3050"));
}

TEST(Series, CheckOrderIsTheSameAsBookPlusTheRepeatRules) {
  Fixture f;
  IS(f.s->book("taken", "Atlas", 0, 10, 1), Ok);
  IS(f.s->bookRepeating("a", "Atlas", 0, 10, 1, 10, 0), InvalidInput);
  IS(f.s->bookRepeating("a", "Atlas", 0, 10, 1, 10, rooms::kMaxCount + 1), InvalidInput);
  IS(f.s->bookRepeating("a", "Atlas", 0, 10, 1, rooms::kMaxTime + 1, 2), InvalidInput);
  IS(f.s->bookRepeating("a", "Atlas", 0, 10, 1, 9, 2), InvalidInput);
  IS(f.s->bookRepeating("a", "Atlas", 20, 30, 1, 500000, 3), InvalidInput);
  IS(f.s->bookRepeating("a", "Atlas", 20, 30, 1, 500000, 2), Ok);
  IS(f.s->bookRepeating("far", "Atlas", 0, 10, 1, 20000, rooms::kMaxCount), InvalidInput);
  IS(f.s->bookRepeating("b", "Nowhere", 0, 10, 0, 10, 2), InvalidInput);
  IS(f.s->bookRepeating("b", "Nowhere", 0, 10, 1, 10, 2), UnknownRoom);
  IS(f.s->bookRepeating("taken", "Atlas", 100, 110, 99, 10, 2), DuplicateBooking);
  IS(f.s->bookRepeating("b", "Atlas", 100, 110, 7, 10, 2), TooManyPeople);
  IS(f.s->bookRepeating("b", "Atlas", 5, 15, 6, 10, 2), Conflict);
  IS(f.s->bookRepeating("longest", "Borealis", 0, 10, 3, 20000, 52), InvalidInput);
  IS(f.s->bookRepeating("longest", "Borealis", 0, 10, 3, 19000, 52), Ok);
  EXPECT_EQ(f.s->bookings("Borealis").size(), std::size_t(52));
}

TEST(Series, CancelRemovesEveryRemainingOccurrenceAndFreesTheId) {
  Fixture f;
  IS(f.s->bookRepeating("s", "Atlas", 0, 10, 1, 100, 4), Ok);
  IS(f.s->cancelOccurrence("s", 1), Ok);
  IS(f.s->cancel("s"), Ok);
  EXPECT_TRUE(f.s->bookings("Atlas").empty());
  IS(f.s->cancel("s"), UnknownBooking);
  std::string room;
  IS(f.s->roomOf("s", room), UnknownBooking);
  IS(f.s->bookRepeating("s", "Borealis", 0, 10, 1, 100, 2), Ok);
  EXPECT_EQ(f.spans("Borealis"), std::string("s@0-10 s@100-110"));
}

TEST(Series, CancellingOneOccurrenceFreesJustThatSlotAndIndexesNeverShift) {
  Fixture f;
  IS(f.s->bookRepeating("s", "Atlas", 0, 10, 1, 100, 4), Ok);
  IS(f.s->cancelOccurrence("s", 1), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("s@0-10 s@200-210 s@300-310"));
  EXPECT_TRUE(f.s->isFree("Atlas", 100, 110));
  IS(f.s->cancelOccurrence("s", 1), UnknownBooking);
  IS(f.s->cancelOccurrence("s", 4), UnknownBooking);
  IS(f.s->cancelOccurrence("s", -1), UnknownBooking);
  IS(f.s->cancelOccurrence("nope", 0), UnknownBooking);
  IS(f.s->cancelOccurrence("s", 3), Ok);
  EXPECT_EQ(f.spans("Atlas"), std::string("s@0-10 s@200-210"));
  IS(f.s->book("filler", "Atlas", 100, 110, 1), Ok);
  IS(f.s->book("late", "Atlas", 300, 310, 1), Ok);
}

TEST(Series, RemovingTheLastOccurrenceEndsTheBookingAndAPlainBookingIsASeriesOfOne) {
  Fixture f;
  IS(f.s->bookRepeating("s", "Atlas", 0, 10, 1, 100, 2), Ok);
  IS(f.s->cancelOccurrence("s", 0), Ok);
  std::string room;
  IS(f.s->roomOf("s", room), Ok);
  IS(f.s->book("s", "Atlas", 500, 510, 1), DuplicateBooking);
  IS(f.s->cancelOccurrence("s", 1), Ok);
  IS(f.s->roomOf("s", room), UnknownBooking);
  IS(f.s->book("s", "Atlas", 500, 510, 1), Ok);
  IS(f.s->cancelOccurrence("s", 1), UnknownBooking);
  IS(f.s->cancelOccurrence("s", 0), Ok);
  IS(f.s->cancel("s"), UnknownBooking);
  EXPECT_TRUE(f.s->bookings("Atlas").empty());
}

TEST(Series, SeriesTakePartInRoomChoiceAndSingleBookingsClashWithEveryOccurrence) {
  Fixture f;
  IS(f.s->bookRepeating("s", "Atlas", 0, 60, 4, 1000, 3), Ok);
  IS(f.s->book("x", "Atlas", 1030, 1040, 1), Conflict);
  IS(f.s->book("y", "Atlas", 2059, 2100, 1), Conflict);
  IS(f.s->book("z", "Atlas", 2060, 2100, 1), Ok);
  std::string room;
  IS(f.s->bookAny("a", 1000, 1010, 3, room), Ok);
  EXPECT_EQ(room, std::string("Borealis"));
  IS(f.s->bookAny("b", 1060, 1070, 3, room), Ok);
  EXPECT_EQ(room, std::string("Atlas"));
  IS(f.s->cancelOccurrence("s", 1), Ok);
  IS(f.s->bookAny("c", 1000, 1010, 3, room), Ok);
  EXPECT_EQ(room, std::string("Atlas"));
}

TEST(Series, RandomSeriesAgreeWithAPerMinuteModel) {
  unsigned long long seed = 424242ULL;
  auto next = [&seed](int bound) {
    seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<int>((seed >> 33) % static_cast<unsigned long long>(bound));
  };
  auto s = rooms::makeSeriesScheduler();
  s->addRoom("R", 20);
  const int horizon = 600;
  std::vector<std::string> owner(horizon, "");
  std::vector<std::vector<std::pair<int, int>>> parts(80);  // per id: occurrence spans still live
  std::vector<bool> live(80, false);
  for (int step = 0; step < 3000; ++step) {
    const int id = next(80);
    const std::string name = "s" + std::to_string(id);
    const int op = next(6);
    if (op < 3) {
      const int start = next(300);
      const int len = 1 + next(12);
      const int every = len + next(40);
      const int count = 1 + next(6);
      const int lastEnd = start + len + (count - 1) * every;
      Status expected = Status::Ok;
      if (lastEnd > horizon) {
        // The model's horizon is smaller than kMaxTime, so skip requests that would leave it.
        continue;
      }
      if (live[id]) expected = Status::DuplicateBooking;
      else {
        for (int k = 0; k < count && expected == Status::Ok; ++k) {
          for (int t = start + k * every; t < start + k * every + len; ++t) {
            if (!owner[t].empty()) expected = Status::Conflict;
          }
        }
      }
      EXPECT_TRUE(s->bookRepeating(name, "R", start, start + len, 1, every, count) == expected);
      if (expected == Status::Ok) {
        live[id] = true;
        parts[id].clear();
        for (int k = 0; k < count; ++k) {
          parts[id].push_back({start + k * every, start + k * every + len});
          for (int t = start + k * every; t < start + k * every + len; ++t) owner[t] = name;
        }
      }
    } else if (op == 3) {
      EXPECT_TRUE(s->cancel(name) == (live[id] ? Status::Ok : Status::UnknownBooking));
      if (live[id]) {
        for (auto& o : owner) {
          if (o == name) o.clear();
        }
        live[id] = false;
      }
    } else {
      const int k = next(7);
      const bool ok = live[id] && k < static_cast<int>(parts[id].size()) && parts[id][k].first >= 0;
      EXPECT_TRUE(s->cancelOccurrence(name, k) == (ok ? Status::Ok : Status::UnknownBooking));
      if (ok) {
        for (int t = parts[id][k].first; t < parts[id][k].second; ++t) owner[t].clear();
        parts[id][k] = {-1, -1};
        bool any = false;
        for (const auto& p : parts[id]) any = any || p.first >= 0;
        if (!any) live[id] = false;
      }
    }
  }
  for (int t = 0; t < horizon; ++t) EXPECT_EQ(s->isFree("R", t, t + 1), owner[t].empty());
}
