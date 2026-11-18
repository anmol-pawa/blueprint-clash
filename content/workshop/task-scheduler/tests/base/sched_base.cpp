#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using sched::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

// Records the tag of every job that runs, in order.
struct Fixture {
  std::unique_ptr<sched::Scheduler> s = sched::makeScheduler();
  std::vector<std::string> ran;

  sched::Job job(const std::string& tag) {
    return [this, tag] { ran.push_back(tag); };
  }
  Status add(const std::string& id, long long at, int priority = 0) { return s->schedule(id, at, priority, job(id)); }
  std::string order() const {
    std::string out;
    for (const auto& r : ran) out += (out.empty() ? "" : " ") + r;
    return out;
  }
  void clear() { ran.clear(); }
};
}  // namespace

TEST(Order, EarlierTimeFirstThenHigherPriorityThenFirstScheduled) {
  Fixture f;
  f.add("late", 30);
  f.add("early-low", 10, 1);
  f.add("early-high", 10, 5);
  f.add("early-high-2", 10, 5);
  f.add("mid", 20, 100);
  EXPECT_EQ(f.s->advanceTo(100), std::size_t(5));
  EXPECT_EQ(f.order(), std::string("early-high early-high-2 early-low mid late"));
}

TEST(Order, TimeBeatsPriorityAndNegativePrioritiesAreJustSmaller) {
  Fixture f;
  f.add("urgent-but-later", 11, 1000000);
  f.add("sooner", 10, -5);
  f.add("neg-less", 12, -9);
  f.add("neg-more", 12, -2);
  f.add("zero", 12, 0);
  f.s->advanceTo(12);
  EXPECT_EQ(f.order(), std::string("sooner urgent-but-later zero neg-more neg-less"));
}

TEST(Order, JobsOfEqualTimeAndPriorityRunInTheOrderTheyWereScheduledNotByName) {
  Fixture f;
  const std::vector<std::string> ids = {"zulu", "mike", "alpha", "yankee", "bravo", "xray", "charlie"};
  for (const auto& id : ids) f.add(id, 5, 3);
  f.s->advanceTo(5);
  EXPECT_EQ(f.order(), std::string("zulu mike alpha yankee bravo xray charlie"));
}

TEST(Time, AJobIsDueWhenItsTimeIsAtMostTheTargetAndNowMovesToTheTarget) {
  Fixture f;
  f.add("a", 10);
  f.add("b", 20);
  EXPECT_EQ(f.s->advanceTo(9), std::size_t(0));
  EXPECT_EQ(f.s->now(), 9LL);
  EXPECT_EQ(f.s->advanceTo(10), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("a"));
  EXPECT_EQ(f.s->advanceTo(19), std::size_t(0));
  EXPECT_EQ(f.s->advanceTo(25), std::size_t(1));
  EXPECT_EQ(f.s->now(), 25LL);
  EXPECT_EQ(f.order(), std::string("a b"));
}

TEST(Time, InsideAJobNowIsTheTimeThatJobWasScheduledFor) {
  auto s = sched::makeScheduler();
  std::vector<long long> seen;
  for (long long t : {30LL, 10LL, 20LL}) s->schedule("j" + std::to_string(t), t, 0, [&s, &seen] { seen.push_back(s->now()); });
  s->advanceTo(100);
  EXPECT_EQ(seen.size(), std::size_t(3));
  EXPECT_EQ(seen[0], 10LL);
  EXPECT_EQ(seen[1], 20LL);
  EXPECT_EQ(seen[2], 30LL);
  EXPECT_EQ(s->now(), 100LL);
}

TEST(Time, TimeNeverGoesBackwards) {
  Fixture f;
  f.s->advanceTo(50);
  EXPECT_EQ(f.s->advanceTo(20), std::size_t(0));
  EXPECT_EQ(f.s->now(), 50LL);
  f.add("a", 50);
  EXPECT_EQ(f.s->advanceTo(10), std::size_t(0));
  EXPECT_EQ(f.s->now(), 50LL);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(50), std::size_t(1));
}

TEST(Schedule, ARefusedCallChangesNothingAndTheChecksComeInTheDocumentedOrder) {
  Fixture f;
  f.s->advanceTo(100);
  IS(f.add("keep", 150), Ok);
  const std::string tooLong(33, 'x');
  const std::string longest(32, 'y');
  IS(f.s->schedule("", 200, 0, f.job("x")), InvalidId);
  IS(f.s->schedule(tooLong, 200, 0, f.job("x")), InvalidId);
  IS(f.s->schedule(longest, 200, 0, f.job("x")), Ok);
  IS(f.s->schedule("nojob", 200, 0, sched::Job()), InvalidJob);
  IS(f.s->schedule("far", sched::kMaxTime + 1, 0, f.job("x")), InvalidTime);
  IS(f.s->schedule("edge", sched::kMaxTime, 0, f.job("x")), Ok);
  IS(f.s->schedule("old", 99, 0, f.job("x")), InThePast);
  IS(f.s->schedule("keep", 300, 0, f.job("x")), DuplicateId);
  // Order: id, job, time (too far, then past), duplicate.
  IS(f.s->schedule("", 99, 0, sched::Job()), InvalidId);
  IS(f.s->schedule("keep", 99, 0, sched::Job()), InvalidJob);
  IS(f.s->schedule("keep", sched::kMaxTime + 1, 0, f.job("x")), InvalidTime);
  IS(f.s->schedule("keep", 99, 0, f.job("x")), InThePast);
  EXPECT_EQ(f.s->pending(), std::size_t(3));
  long long at = 0;
  IS(f.s->nextRun("keep", at), Ok);
  EXPECT_EQ(at, 150LL);
  IS(f.s->nextRun("old", at), NotFound);
  EXPECT_EQ(at, 150LL);  // untouched on failure
}

TEST(Schedule, ATimeEqualToNowIsAllowedAndRunsOnTheNextAdvanceEvenToTheSameTime) {
  Fixture f;
  f.s->advanceTo(40);
  IS(f.add("now", 40), Ok);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(40), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("now"));
  EXPECT_EQ(f.s->pending(), std::size_t(0));
}

TEST(Cancel, RemovesAPendingJobAndFreesItsId) {
  Fixture f;
  f.add("a", 10);
  f.add("b", 10);
  f.add("c", 10);
  IS(f.s->cancel("b"), Ok);
  EXPECT_EQ(f.s->pending(), std::size_t(2));
  long long at = 0;
  IS(f.s->nextRun("b", at), NotFound);
  IS(f.add("b", 20), Ok);
  EXPECT_EQ(f.s->advanceTo(30), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("a c b"));
}

TEST(Cancel, UnknownAlreadyCancelledAndAlreadyRunJobsAreNotFound) {
  Fixture f;
  IS(f.s->cancel("ghost"), NotFound);
  IS(f.s->cancel(""), NotFound);
  f.add("a", 5);
  f.add("b", 6);
  IS(f.s->cancel("a"), Ok);
  IS(f.s->cancel("a"), NotFound);
  f.s->advanceTo(10);
  IS(f.s->cancel("b"), NotFound);
  EXPECT_EQ(f.order(), std::string("b"));
}

TEST(Ids, AnIdCanBeUsedAgainOnceItsJobHasRun) {
  Fixture f;
  f.add("daily", 10);
  IS(f.add("daily", 11), DuplicateId);
  f.s->advanceTo(10);
  IS(f.add("daily", 20), Ok);
  f.s->advanceTo(20);
  IS(f.add("daily", 30), Ok);
  f.s->advanceTo(30);
  EXPECT_EQ(f.order(), std::string("daily daily daily"));
}

TEST(Query, PendingAndNextRunFollowTheJobsThroughSchedulingCancelAndRunning) {
  Fixture f;
  EXPECT_EQ(f.s->pending(), std::size_t(0));
  f.add("a", 10);
  f.add("b", 30);
  f.add("c", 20);
  EXPECT_EQ(f.s->pending(), std::size_t(3));
  long long at = 0;
  IS(f.s->nextRun("c", at), Ok);
  EXPECT_EQ(at, 20LL);
  f.s->advanceTo(20);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
  IS(f.s->nextRun("a", at), NotFound);
  IS(f.s->nextRun("b", at), Ok);
  EXPECT_EQ(at, 30LL);
}

TEST(Reentrancy, AJobMayScheduleMoreWorkThatIsDueInTheSameAdvanceAndItRunsInOrder) {
  auto s = sched::makeScheduler();
  std::vector<std::string> ran;
  auto note = [&ran](const std::string& tag) { return [&ran, tag] { ran.push_back(tag); }; };
  s->schedule("first", 10, 0, [&] {
    ran.push_back("first");
    s->schedule("child-same-time", 10, 0, note("child-same-time"));
    s->schedule("child-later", 25, 0, note("child-later"));
    s->schedule("child-beyond", 90, 0, note("child-beyond"));
  });
  s->schedule("second", 10, 0, note("second"));
  s->schedule("middle", 20, 0, note("middle"));
  EXPECT_EQ(s->advanceTo(30), std::size_t(5));
  std::string out;
  for (const auto& r : ran) out += (out.empty() ? "" : " ") + r;
  EXPECT_EQ(out, std::string("first second child-same-time middle child-later"));
  EXPECT_EQ(s->pending(), std::size_t(1));
}

TEST(Reentrancy, ANewJobAtTheSameTimeWithHigherPriorityRunsBeforeTheOnesAlreadyWaiting) {
  auto s = sched::makeScheduler();
  std::vector<std::string> ran;
  auto note = [&ran](const std::string& tag) { return [&ran, tag] { ran.push_back(tag); }; };
  s->schedule("a", 10, 5, [&] {
    ran.push_back("a");
    s->schedule("urgent", 10, 9, note("urgent"));
    s->schedule("lazy", 10, 1, note("lazy"));
  });
  s->schedule("b", 10, 5, note("b"));
  s->schedule("c", 10, 2, note("c"));
  s->advanceTo(10);
  std::string out;
  for (const auto& r : ran) out += (out.empty() ? "" : " ") + r;
  EXPECT_EQ(out, std::string("a urgent b c lazy"));
}

TEST(Reentrancy, AJobThatCancelsAnotherPendingJobPreventsItsRunInTheSameAdvance) {
  auto s = sched::makeScheduler();
  std::vector<std::string> ran;
  auto note = [&ran](const std::string& tag) { return [&ran, tag] { ran.push_back(tag); }; };
  s->schedule("killer", 10, 9, [&] {
    ran.push_back("killer");
    EXPECT_TRUE(s->cancel("victim") == Status::Ok);
    EXPECT_TRUE(s->cancel("victim") == Status::NotFound);
  });
  s->schedule("victim", 10, 1, note("victim"));
  s->schedule("bystander", 12, 1, note("bystander"));
  EXPECT_EQ(s->advanceTo(20), std::size_t(2));
  std::string out;
  for (const auto& r : ran) out += (out.empty() ? "" : " ") + r;
  EXPECT_EQ(out, std::string("killer bystander"));
}

TEST(Reentrancy, AJobMayScheduleItselfAgainBecauseItsIdIsAlreadyFree) {
  auto s = sched::makeScheduler();
  int runs = 0;
  std::function<void()> tick = [&] {
    ++runs;
    if (runs < 4) EXPECT_TRUE(s->schedule("tick", s->now() + 10, 0, tick) == Status::Ok);
  };
  s->schedule("tick", 0, 0, tick);
  EXPECT_EQ(s->advanceTo(25), std::size_t(3));  // at 0, 10, 20
  EXPECT_EQ(s->pending(), std::size_t(1));
  long long at = 0;
  EXPECT_TRUE(s->nextRun("tick", at) == Status::Ok);
  EXPECT_EQ(at, 30LL);
  EXPECT_EQ(s->advanceTo(1000), std::size_t(1));
  EXPECT_EQ(runs, 4);
}

TEST(Reentrancy, InsideAJobThePastIsRelativeToThatJobsTimeAndItsOwnIdCannotBeCancelled) {
  auto s = sched::makeScheduler();
  std::vector<Status> got;
  s->schedule("probe", 20, 0, [&] {
    got.push_back(s->schedule("older", 19, 0, [] {}));
    got.push_back(s->schedule("same", 20, 0, [] {}));
    got.push_back(s->cancel("probe"));
  });
  s->advanceTo(50);
  EXPECT_EQ(got.size(), std::size_t(3));
  EXPECT_TRUE(got[0] == Status::InThePast);
  EXPECT_TRUE(got[1] == Status::Ok);
  EXPECT_TRUE(got[2] == Status::NotFound);
}

TEST(Model, RandomOperationsAgreeWithASimpleModel) {
  struct ModelJob {
    std::string id;
    long long at;
    int priority;
    int seq;
  };
  std::uint32_t rng = 12345;
  auto next = [&rng](std::uint32_t n) {
    rng = rng * 1664525u + 1013904223u;
    return (rng >> 8) % n;
  };
  Fixture f;
  std::vector<ModelJob> model;
  std::vector<std::string> expected;
  long long now = 0;
  int seq = 0;
  for (int step = 0; step < 4000; ++step) {
    const std::uint32_t op = next(10);
    if (op < 5) {
      const std::string id = "j" + std::to_string(next(12));
      const long long at = now + static_cast<long long>(next(15)) - 2;
      const int priority = static_cast<int>(next(4)) - 1;
      bool dup = false;
      for (const auto& m : model) dup = dup || m.id == id;
      const Status want = at < now ? Status::InThePast : dup ? Status::DuplicateId : Status::Ok;
      EXPECT_TRUE(f.add(id, at, priority) == want);
      if (want == Status::Ok) model.push_back({id, at, priority, seq++});
    } else if (op < 7) {
      const std::string id = "j" + std::to_string(next(12));
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
      const long long target = now + static_cast<long long>(next(12)) - 3;
      f.clear();
      expected.clear();
      for (;;) {
        int best = -1;
        for (std::size_t i = 0; i < model.size(); ++i) {
          if (model[i].at > target) continue;
          if (best < 0) { best = static_cast<int>(i); continue; }
          const ModelJob& a = model[i];
          const ModelJob& b = model[static_cast<std::size_t>(best)];
          if (a.at != b.at ? a.at < b.at : a.priority != b.priority ? a.priority > b.priority : a.seq < b.seq) best = static_cast<int>(i);
        }
        if (best < 0 || target < now) break;
        expected.push_back(model[static_cast<std::size_t>(best)].id);
        model.erase(model.begin() + best);
      }
      if (target >= now) now = target;
      EXPECT_EQ(f.s->advanceTo(target), expected.size());
      EXPECT_EQ(f.ran, expected);
      EXPECT_EQ(f.s->now(), now);
    }
    EXPECT_EQ(f.s->pending(), model.size());
  }
}
