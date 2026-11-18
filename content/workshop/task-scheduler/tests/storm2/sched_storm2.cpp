#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using sched::CatchUp;
using sched::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<sched::CatchUpScheduler> s = sched::makeCatchUpScheduler();
  std::vector<std::string> ran;

  sched::Job job(const std::string& tag) {
    return [this, tag] { ran.push_back(tag + "@" + std::to_string(s->now())); };
  }
  Status every(const std::string& id, long long first, long long period, CatchUp policy, int priority = 0) {
    return s->scheduleEveryWith(id, first, period, priority, policy, job(id));
  }
  std::string order() const {
    std::string out;
    for (const auto& r : ran) out += (out.empty() ? "" : " ") + r;
    return out;
  }
  void clear() { ran.clear(); }
};
}  // namespace

TEST(CatchUp, AllRunsEveryMissedOccurrenceOldestFirst) {
  Fixture f;
  IS(f.every("r", 10, 10, CatchUp::All), Ok);
  EXPECT_EQ(f.s->advanceTo(35), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("r@10 r@20 r@30"));
}

TEST(CatchUp, LatestRunsOnlyTheLatestDueOccurrenceAtItsOwnTime) {
  Fixture f;
  f.every("r", 10, 10, CatchUp::Latest);
  EXPECT_EQ(f.s->advanceTo(35), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("r@30"));
  EXPECT_EQ(f.s->now(), 35LL);
  long long at = 0;
  IS(f.s->nextRun("r", at), Ok);
  EXPECT_EQ(at, 40LL);
  f.clear();
  EXPECT_EQ(f.s->advanceTo(40), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("r@40"));
}

TEST(CatchUp, LatestWhenTheTargetIsExactlyAnOccurrenceSkipsTheOnesBefore) {
  Fixture f;
  f.every("r", 10, 10, CatchUp::Latest);
  EXPECT_EQ(f.s->advanceTo(20), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("r@20"));
}

TEST(CatchUp, LatestWithASingleDueOccurrenceRunsIt) {
  Fixture f;
  f.every("r", 10, 10, CatchUp::Latest);
  EXPECT_EQ(f.s->advanceTo(10), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(19), std::size_t(0));
  EXPECT_EQ(f.s->advanceTo(25), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("r@10 r@20"));
}

TEST(CatchUp, OnTimeOnlyRunsAnOccurrenceExactlyAtTheTargetAndSkipsTheMissedOnes) {
  Fixture f;
  f.every("r", 10, 10, CatchUp::OnTimeOnly);
  EXPECT_EQ(f.s->advanceTo(35), std::size_t(0));
  long long at = 0;
  IS(f.s->nextRun("r", at), Ok);
  EXPECT_EQ(at, 40LL);
  EXPECT_EQ(f.s->advanceTo(40), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(100), std::size_t(1));
  EXPECT_EQ(f.s->advanceTo(101), std::size_t(0));
  EXPECT_EQ(f.order(), std::string("r@40 r@100"));
}

TEST(CatchUp, EachSeriesKeepsItsOwnPolicyWhateverWasScheduledBeforeOrAfter) {
  Fixture f;
  f.every("all", 0, 10, CatchUp::All, 3);
  f.every("latest", 0, 10, CatchUp::Latest, 2);
  f.every("exact", 0, 10, CatchUp::OnTimeOnly, 1);
  f.s->scheduleEvery("plain", 0, 10, 0, f.job("plain"));
  EXPECT_EQ(f.s->advanceTo(25), std::size_t(7));
  EXPECT_EQ(f.order(), std::string("all@0 plain@0 all@10 plain@10 all@20 latest@20 plain@20"));
  f.clear();
  EXPECT_EQ(f.s->advanceTo(30), std::size_t(4));
  EXPECT_EQ(f.order(), std::string("all@30 latest@30 exact@30 plain@30"));
}

TEST(CatchUp, SkippedOccurrencesAreNotCountedAndDoNotDisturbTheOrderOfOtherJobs) {
  Fixture f;
  f.every("r", 0, 10, CatchUp::Latest, 5);
  f.s->schedule("once-a", 5, 0, f.job("once-a"));
  f.s->schedule("once-b", 20, 0, f.job("once-b"));
  EXPECT_EQ(f.s->advanceTo(20), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("once-a@5 r@20 once-b@20"));
}

TEST(CatchUp, OneShotJobsAlwaysRunHoweverLate) {
  Fixture f;
  f.s->schedule("late", 3, 0, f.job("late"));
  f.every("r", 0, 10, CatchUp::OnTimeOnly);
  EXPECT_EQ(f.s->advanceTo(500), std::size_t(2));
  EXPECT_EQ(f.order(), std::string("late@3 r@500"));
}

TEST(CatchUp, ASkippedSeriesIsStillOnePendingJobThatCanBeCancelled) {
  Fixture f;
  f.every("r", 0, 10, CatchUp::OnTimeOnly);
  f.s->advanceTo(1000);
  EXPECT_EQ(f.s->pending(), std::size_t(1));
  IS(f.every("r", 2000, 10, CatchUp::All), DuplicateId);
  IS(f.s->cancel("r"), Ok);
  EXPECT_EQ(f.s->pending(), std::size_t(0));
  EXPECT_EQ(f.s->advanceTo(2000), std::size_t(0));
}

TEST(CatchUp, ValidationMatchesScheduleEvery) {
  Fixture f;
  f.s->advanceTo(100);
  IS(f.every("", 200, 5, CatchUp::Latest), InvalidId);
  IS(f.s->scheduleEveryWith("x", 200, 5, 0, CatchUp::Latest, sched::Job()), InvalidJob);
  IS(f.every("x", 200, 0, CatchUp::Latest), InvalidPeriod);
  IS(f.every("x", sched::kMaxTime + 1, 5, CatchUp::Latest), InvalidTime);
  IS(f.every("x", 99, 5, CatchUp::Latest), InThePast);
  IS(f.every("x", 100, 5, CatchUp::Latest), Ok);
  IS(f.every("x", 100, 5, CatchUp::All), DuplicateId);
}

TEST(Model, RandomPoliciesAgreeWithASimpleModel) {
  struct ModelJob {
    std::string id;
    long long at;
    long long period;
    int priority;
    int rank;
    CatchUp policy;
  };
  std::uint32_t rng = 4242;
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
      const std::string id = "j" + std::to_string(next(8));
      const long long at = now + static_cast<long long>(next(10));
      const long long period = next(4) == 0 ? 0 : 1 + static_cast<long long>(next(9));
      const int priority = static_cast<int>(next(3));
      const CatchUp policy = static_cast<CatchUp>(next(3));
      bool dup = false;
      for (const auto& m : model) dup = dup || m.id == id;
      const Status got = period == 0 ? f.s->schedule(id, at, priority, f.job(id)) : f.every(id, at, period, policy, priority);
      EXPECT_TRUE(got == (dup ? Status::DuplicateId : Status::Ok));
      if (!dup) model.push_back({id, at, period, priority, rank++, policy});
    } else if (op < 6) {
      const std::string id = "j" + std::to_string(next(8));
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
      const long long target = now + static_cast<long long>(next(30));
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
        bool run = true;
        if (m.period > 0 && m.policy == CatchUp::Latest) run = m.at + m.period > target;
        if (m.period > 0 && m.policy == CatchUp::OnTimeOnly) run = m.at == target;
        if (run) expected.push_back(m.id + "@" + std::to_string(m.at));
        if (m.period > 0) m.at += m.period; else model.erase(model.begin() + best);
      }
      now = target;
      EXPECT_EQ(f.s->advanceTo(target), expected.size());
      EXPECT_EQ(f.ran, expected);
    }
    EXPECT_EQ(f.s->pending(), model.size());
  }
}
