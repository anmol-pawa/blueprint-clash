#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using sched::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<sched::RecurringScheduler> s = sched::makeRecurringScheduler();
  std::vector<std::string> ran;

  // Logs "tag@time" so both the order and the clock are checked.
  sched::Job job(const std::string& tag) {
    return [this, tag] { ran.push_back(tag + "@" + std::to_string(s->now())); };
  }
  Status every(const std::string& id, long long first, long long period, int priority = 0) {
    return s->scheduleEvery(id, first, period, priority, job(id));
  }
  Status once(const std::string& id, long long at, int priority = 0) { return s->schedule(id, at, priority, job(id)); }
  std::string order() const {
    std::string out;
    for (const auto& r : ran) out += (out.empty() ? "" : " ") + r;
    return out;
  }
  void clear() { ran.clear(); }
};
}  // namespace

TEST(Every, RunsAtFirstAndThenAtAFixedRate) {
  Fixture f;
  IS(f.every("tick", 5, 10), Ok);
  EXPECT_EQ(f.s->advanceTo(4), std::size_t(0));
  EXPECT_EQ(f.s->advanceTo(5), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(14), std::size_t(0));
  EXPECT_EQ(f.s->advanceTo(15), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(40), std::size_t(2));
  EXPECT_EQ(f.order(), std::string("tick@5 tick@15 tick@25 tick@35"));
}

TEST(Every, AFirstTimeEqualToNowIsAllowed) {
  Fixture f;
  f.s->advanceTo(7);
  IS(f.every("now", 7, 3), Ok);
  EXPECT_EQ(f.s->advanceTo(7), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(13), std::size_t(2));
  EXPECT_EQ(f.order(), std::string("now@7 now@10 now@13"));
}

TEST(Every, OneBigAdvanceRunsEveryDueOccurrenceInOrderAgainstOtherJobs) {
  Fixture f;
  f.every("r", 0, 10);
  f.once("single", 35);
  f.once("single-high", 20, 9);
  EXPECT_EQ(f.s->advanceTo(40), std::size_t(7));
  EXPECT_EQ(f.order(), std::string("r@0 r@10 single-high@20 r@20 r@30 single@35 r@40"));
  EXPECT_EQ(f.s->now(), 40LL);
}

TEST(Every, TheNextOccurrenceIsMeasuredFromTheScheduleNotFromTheAdvanceTarget) {
  Fixture f;
  f.every("r", 0, 10);
  EXPECT_EQ(f.s->advanceTo(95), std::size_t(10));  // 0, 10, ..., 90
  long long at = 0;
  IS(f.s->nextRun("r", at), Ok);
  EXPECT_EQ(at, 100LL);
  EXPECT_EQ(f.s->advanceTo(100), std::size_t(1));
}

TEST(Every, OneSeriesIsOnePendingJobWithItsIdTaken) {
  Fixture f;
  IS(f.every("r", 10, 5), Ok);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
  IS(f.every("r", 20, 5), DuplicateId);
  IS(f.once("r", 20), DuplicateId);
  f.s->advanceTo(100);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
  long long at = 0;
  IS(f.s->nextRun("r", at), Ok);
  EXPECT_EQ(at, 105LL);
  IS(f.every("other", 200, 5), Ok);
  EXPECT_EQ(f.s->pending(), std::size_t(2));
}

TEST(Every, CancelEndsTheWholeSeries) {
  Fixture f;
  f.every("r", 0, 10);
  f.s->advanceTo(25);
  IS(f.s->cancel("r"), Ok);
  EXPECT_EQ(f.s->pending(), std::size_t(0));
  EXPECT_EQ(f.s->advanceTo(100), std::size_t(0));
  IS(f.s->cancel("r"), NotFound);
  EXPECT_EQ(f.order(), std::string("r@0 r@10 r@20"));
  IS(f.every("r", 100, 10), Ok);
}

TEST(Every, ASeriesCanCancelItselfFromInsideItsOwnRun) {
  auto s = sched::makeRecurringScheduler();
  int runs = 0;
  std::vector<Status> answers;
  s->scheduleEvery("r", 0, 10, 0, [&] {
    ++runs;
    if (runs == 3) answers.push_back(s->cancel("r"));
  });
  EXPECT_EQ(s->advanceTo(1000), std::size_t(3));
  EXPECT_EQ(runs, 3);
  EXPECT_EQ(answers.size(), std::size_t(1));
  EXPECT_TRUE(answers[0] == Status::Ok);
  EXPECT_EQ(s->pending(), std::size_t(0));
}

TEST(Every, AnotherJobCanCancelASeriesBetweenItsOccurrences) {
  Fixture f;
  f.every("r", 0, 10);
  f.s->schedule("stop", 25, 0, [&] { f.ran.push_back("stop"); f.s->cancel("r"); });
  EXPECT_EQ(f.s->advanceTo(60), std::size_t(4));
  EXPECT_EQ(f.order(), std::string("r@0 r@10 r@20 stop"));
}

TEST(Every, TheSeriesKeepsItsPlaceInTheFifoOrderInEveryRound) {
  Fixture f;
  f.once("before", 10);
  f.once("before2", 20);
  f.every("r", 0, 10);
  f.once("after", 10);
  f.once("after2", 20);
  f.s->advanceTo(20);
  EXPECT_EQ(f.order(), std::string("r@0 before@10 r@10 after@10 before2@20 r@20 after2@20"));
}

TEST(Every, TheSameCallableRunsEveryTimeSoItsOwnStateSurvives) {
  auto s = sched::makeRecurringScheduler();
  std::vector<int> seen;
  int calls = 0;
  s->scheduleEvery("counter", 0, 1, 0, [&seen, &calls, n = 0]() mutable {
    ++n;
    ++calls;
    seen.push_back(n);
  });
  s->advanceTo(4);
  EXPECT_EQ(calls, 5);
  EXPECT_EQ(seen, (std::vector<int>{1, 2, 3, 4, 5}));
}

TEST(Every, ValidationAndTheDocumentedCheckOrder) {
  Fixture f;
  f.s->advanceTo(100);
  IS(f.every("", 200, 5), InvalidId);
  IS(f.every(std::string(33, 'z'), 200, 5), InvalidId);
  IS(f.s->scheduleEvery("x", 200, 5, 0, sched::Job()), InvalidJob);
  IS(f.every("x", 200, 0), InvalidPeriod);
  IS(f.every("x", 200, -3), InvalidPeriod);
  IS(f.every("x", 200, sched::kMaxPeriod + 1), InvalidPeriod);
  IS(f.every("big", 200, sched::kMaxPeriod), Ok);
  IS(f.every("x", sched::kMaxTime + 1, 5), InvalidTime);
  IS(f.every("x", 99, 5), InThePast);
  IS(f.every("big", 300, 5), DuplicateId);
  // Order: id, job, period, time, duplicate.
  IS(f.s->scheduleEvery("", 99, 0, 0, sched::Job()), InvalidId);
  IS(f.s->scheduleEvery("big", 99, 0, 0, sched::Job()), InvalidJob);
  IS(f.every("big", 99, 0), InvalidPeriod);
  IS(f.every("big", sched::kMaxTime + 1, 5), InvalidTime);
  IS(f.every("big", 99, 5), InThePast);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
}

TEST(Every, TheBaseCallsStillBehaveThroughTheNewInterface) {
  Fixture f;
  f.once("a", 10, 1);
  f.once("b", 10, 2);
  f.every("r", 10, 10);
  EXPECT_EQ(f.s->advanceTo(10), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("b@10 a@10 r@10"));
}

TEST(Model, RandomSeriesAndOneShotsAgreeWithASimpleModel) {
  struct ModelJob {
    std::string id;
    long long at;
    long long period;  // 0 for one-shot
    int priority;
    int rank;
  };
  std::uint32_t rng = 777;
  auto next = [&rng](std::uint32_t n) {
    rng = rng * 1664525u + 1013904223u;
    return (rng >> 8) % n;
  };
  Fixture f;
  std::vector<ModelJob> model;
  long long now = 0;
  int rank = 0;
  for (int step = 0; step < 3000; ++step) {
    const std::uint32_t op = next(10);
    if (op < 5) {
      const std::string id = "j" + std::to_string(next(10));
      const long long at = now + static_cast<long long>(next(12));
      const long long period = next(2) == 0 ? 0 : 1 + static_cast<long long>(next(7));
      const int priority = static_cast<int>(next(3));
      bool dup = false;
      for (const auto& m : model) dup = dup || m.id == id;
      const Status got = period == 0 ? f.once(id, at, priority) : f.every(id, at, period, priority);
      EXPECT_TRUE(got == (dup ? Status::DuplicateId : Status::Ok));
      if (!dup) model.push_back({id, at, period, priority, rank++});
    } else if (op < 7) {
      const std::string id = "j" + std::to_string(next(10));
      bool found = false;
      for (std::size_t i = 0; i < model.size(); ++i) {
        if (model[i].id == id) {
          model.erase(model.begin() + static_cast<long>(i));
          found = true;
          break;
        }
      }
      EXPECT_TRUE(f.s->cancel(id) == (found ? Status::Ok : Status::NotFound));
    } else {
      const long long target = now + static_cast<long long>(next(25));
      f.clear();
      std::vector<std::string> expected;
      for (;;) {
        int best = -1;
        for (std::size_t i = 0; i < model.size(); ++i) {
          if (model[i].at > target) continue;
          if (best < 0) { best = static_cast<int>(i); continue; }
          const ModelJob& a = model[i];
          const ModelJob& b = model[static_cast<std::size_t>(best)];
          if (a.at != b.at ? a.at < b.at : a.priority != b.priority ? a.priority > b.priority : a.rank < b.rank) best = static_cast<int>(i);
        }
        if (best < 0) break;
        ModelJob& m = model[static_cast<std::size_t>(best)];
        expected.push_back(m.id + "@" + std::to_string(m.at));
        if (m.period > 0) m.at += m.period; else model.erase(model.begin() + best);
      }
      now = target;
      EXPECT_EQ(f.s->advanceTo(target), expected.size());
      EXPECT_EQ(f.ran, expected);
    }
    EXPECT_EQ(f.s->pending(), model.size());
  }
}
