#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using jobq::State;
using jobq::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

// Logs "id#attempt@time" for every attempt that runs, in order.
struct Fixture {
  std::unique_ptr<jobq::Queue> q = jobq::makeQueue();
  std::vector<std::string> log;

  std::string stamp(const std::string& id, int attempt) const {
    return id + "#" + std::to_string(attempt) + "@" + std::to_string(q->now());
  }
  // Succeeds on attempt `succeedOn` (0 = never succeeds).
  jobq::Handler job(const std::string& id, int succeedOn = 0) {
    return [this, id, succeedOn](int attempt) {
      log.push_back(stamp(id, attempt));
      return succeedOn != 0 && attempt >= succeedOn;
    };
  }
  Status add(const std::string& id, int succeedOn = 0) { return q->enqueue(id, job(id, succeedOn)); }
  std::string order() const {
    std::string out;
    for (const auto& r : log) out += (out.empty() ? "" : " ") + r;
    return out;
  }
  State stateOf(const std::string& id) const {
    State s = State::Waiting;
    q->state(id, s);
    return s;
  }
  int attemptsOf(const std::string& id) const {
    int n = -1;
    q->attempts(id, n);
    return n;
  }
};
}  // namespace

TEST(Enqueue, ValidationAndTheDocumentedCheckOrder) {
  Fixture f;
  IS(f.q->enqueue("", f.job("x")), InvalidId);
  IS(f.q->enqueue(std::string(33, 'a'), f.job("x")), InvalidId);
  IS(f.q->enqueue("ok", nullptr), InvalidHandler);
  IS(f.q->enqueue("", nullptr), InvalidId);
  IS(f.q->enqueue(std::string(32, 'a'), f.job("x")), Ok);
  IS(f.q->enqueue("dup", f.job("dup")), Ok);
  IS(f.q->enqueue("dup", f.job("dup")), DuplicateId);
  IS(f.q->enqueue("dup", nullptr), InvalidHandler);
  EXPECT_EQ(f.q->waiting(), std::size_t(2));
  EXPECT_EQ(f.q->advanceTo(0), std::size_t(2));
}

TEST(Enqueue, AnIdIsNeverReusedEvenAfterSuccessDeathOrCancel) {
  Fixture f;
  f.add("done", 1);
  f.add("dies");
  f.add("gone");
  IS(f.q->cancel("gone"), Ok);
  f.q->advanceTo(1000);
  EXPECT_TRUE(f.stateOf("done") == State::Succeeded);
  EXPECT_TRUE(f.stateOf("dies") == State::Dead);
  EXPECT_TRUE(f.stateOf("gone") == State::Cancelled);
  IS(f.add("done"), DuplicateId);
  IS(f.add("dies"), DuplicateId);
  IS(f.add("gone"), DuplicateId);
  EXPECT_EQ(f.q->waiting(), std::size_t(0));
}

TEST(Order, EqualTimeJobsRunInTheOrderTheyWereEnqueuedNotByName) {
  Fixture f;
  for (const char* id : {"zulu", "mike", "alpha", "yankee", "bravo"}) f.add(id, 1);
  EXPECT_EQ(f.q->advanceTo(0), std::size_t(5));
  EXPECT_EQ(f.order(), std::string("zulu#1@0 mike#1@0 alpha#1@0 yankee#1@0 bravo#1@0"));
}

TEST(Order, TimeBeatsEnqueueOrderSoARetryDueLaterRunsAfterAJobDueEarlier) {
  Fixture f;
  f.add("old");  // fails at 0, retries at 10
  f.q->advanceTo(0);
  f.q->advanceTo(9);
  f.add("new", 1);  // due at 9, enqueued after "old"
  f.q->advanceTo(10);
  EXPECT_EQ(f.order(), std::string("old#1@0 new#1@9 old#2@10"));
}

TEST(Time, NowInsideAnAttemptIsTheAttemptsOwnTimeAndAfterwardsTheTarget) {
  Fixture f;
  f.add("x");
  EXPECT_EQ(f.q->advanceTo(100), std::size_t(4));
  EXPECT_EQ(f.order(), std::string("x#1@0 x#2@10 x#3@30 x#4@70"));
  EXPECT_EQ(f.q->now(), 100LL);
}

TEST(Time, AnAttemptDueExactlyAtTheTargetRunsAndAnEarlierTargetDoesNothing) {
  Fixture f;
  f.add("x");
  EXPECT_EQ(f.q->advanceTo(0), std::size_t(1));
  EXPECT_EQ(f.q->advanceTo(9), std::size_t(0));
  EXPECT_EQ(f.q->advanceTo(10), std::size_t(1));
  EXPECT_EQ(f.q->advanceTo(5), std::size_t(0));
  EXPECT_EQ(f.q->now(), 10LL);
  EXPECT_EQ(f.order(), std::string("x#1@0 x#2@10"));
}

TEST(Retry, WaitsTenTwentyFortyEightyTicksFromEachFailedAttemptsOwnTime) {
  Fixture f;
  f.add("x");
  EXPECT_EQ(f.q->advanceTo(100000), std::size_t(5));
  EXPECT_EQ(f.order(), std::string("x#1@0 x#2@10 x#3@30 x#4@70 x#5@150"));
  EXPECT_TRUE(f.stateOf("x") == State::Dead);
  EXPECT_EQ(f.attemptsOf("x"), 5);
}

TEST(Retry, TheDelayIsMeasuredFromTheFailedAttemptNotFromTheAdvanceTarget) {
  Fixture f;
  f.add("x");
  f.q->advanceTo(7);
  long long at = -1;
  IS(f.q->nextAttempt("x", at), Ok);
  EXPECT_EQ(at, 10LL);
  f.q->advanceTo(25);
  IS(f.q->nextAttempt("x", at), Ok);
  EXPECT_EQ(at, 30LL);
  f.q->advanceTo(1000);
  EXPECT_EQ(f.order(), std::string("x#1@0 x#2@10 x#3@30 x#4@70 x#5@150"));
}

TEST(Retry, ASuccessEndsTheJobAndLaterAttemptsNeverHappen) {
  Fixture f;
  f.add("x", 3);
  EXPECT_EQ(f.q->advanceTo(1000), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("x#1@0 x#2@10 x#3@30"));
  EXPECT_TRUE(f.stateOf("x") == State::Succeeded);
  EXPECT_EQ(f.attemptsOf("x"), 3);
  EXPECT_EQ(f.q->waiting(), std::size_t(0));
  EXPECT_TRUE(f.q->deadLetters().empty());
  long long at = -1;
  IS(f.q->nextAttempt("x", at), NotWaiting);
  EXPECT_EQ(at, -1LL);
}

TEST(DeadLetters, JobsAreListedInTheOrderTheyDiedNotByNameOrEnqueueOrder) {
  Fixture f;
  f.add("m");
  f.q->advanceTo(5);
  f.add("a");  // enqueued later, so it dies later: m dies at 150, a at 155
  f.q->advanceTo(1000);
  const std::vector<std::string> dead = f.q->deadLetters();
  ASSERT_EQ(dead.size(), std::size_t(2));
  EXPECT_EQ(dead[0], std::string("m"));
  EXPECT_EQ(dead[1], std::string("a"));
  f.add("later-but-fast", 1);
  f.q->advanceTo(1000);
  EXPECT_EQ(f.q->deadLetters().size(), std::size_t(2));
}

TEST(Cancel, OnlyAWaitingJobCanBeCancelledAndItNeverRunsAgain) {
  Fixture f;
  IS(f.q->cancel("nobody"), NotFound);
  f.add("fresh");
  f.add("retrying");
  f.add("ok", 1);
  IS(f.q->cancel("fresh"), Ok);
  EXPECT_TRUE(f.stateOf("fresh") == State::Cancelled);
  IS(f.q->cancel("fresh"), NotWaiting);
  f.q->advanceTo(0);  // "retrying" fails once and waits for tick 10
  IS(f.q->cancel("retrying"), Ok);
  IS(f.q->cancel("ok"), NotWaiting);  // already succeeded
  long long at = -1;
  IS(f.q->nextAttempt("fresh", at), NotWaiting);
  IS(f.q->nextAttempt("nobody", at), NotFound);
  f.q->advanceTo(1000);
  EXPECT_EQ(f.order(), std::string("retrying#1@0 ok#1@0"));
  EXPECT_EQ(f.q->waiting(), std::size_t(0));
  EXPECT_EQ(f.attemptsOf("retrying"), 1);
  f.add("dies");
  f.q->advanceTo(5000);
  IS(f.q->cancel("dies"), NotWaiting);
  EXPECT_TRUE(f.stateOf("dies") == State::Dead);
}

TEST(Cancel, AHandlerCanCancelAnotherWaitingJobButNotItself) {
  Fixture f;
  Status self = Status::Ok;
  State seen = State::Waiting;
  IS(f.q->enqueue("killer", [&](int) {
    f.log.push_back("killer");
    IS(f.q->cancel("victim"), Ok);
    self = f.q->cancel("killer");
    f.q->state("killer", seen);
    return true;
  }), Ok);
  f.add("victim", 1);
  EXPECT_EQ(f.q->advanceTo(0), std::size_t(1));
  EXPECT_EQ(f.order(), std::string("killer"));
  EXPECT_TRUE(self == Status::NotWaiting);
  EXPECT_TRUE(seen == State::Running);
  EXPECT_TRUE(f.stateOf("victim") == State::Cancelled);
}

TEST(Reentrancy, AHandlerMayEnqueueAJobThatRunsInTheSameAdvanceAfterWhatIsAlreadyDue) {
  Fixture f;
  IS(f.q->enqueue("parent", [&](int) {
    f.log.push_back(f.stamp("parent", 1));
    IS(f.q->enqueue("child", f.job("child", 1)), Ok);
    return true;
  }), Ok);
  f.add("sibling", 1);
  EXPECT_EQ(f.q->advanceTo(0), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("parent#1@0 sibling#1@0 child#1@0"));
  f.add("x");
  f.q->advanceTo(10);
  f.q->advanceTo(12);
  IS(f.q->enqueue("late", [&](int) { return true; }), Ok);  // due at now() = 12
  long long at = -1;
  IS(f.q->nextAttempt("late", at), Ok);
  EXPECT_EQ(at, 12LL);
}

TEST(Queries, StateAttemptsAndNextAttemptDescribeTheLiveJob) {
  Fixture f;
  State s = State::Dead;
  int n = -5;
  long long at = -5;
  IS(f.q->state("x", s), NotFound);
  IS(f.q->attempts("x", n), NotFound);
  EXPECT_TRUE(s == State::Dead);
  EXPECT_EQ(n, -5);
  f.add("x");
  IS(f.q->state("x", s), Ok);
  EXPECT_TRUE(s == State::Waiting);
  EXPECT_EQ(f.attemptsOf("x"), 0);
  IS(f.q->nextAttempt("x", at), Ok);
  EXPECT_EQ(at, 0LL);
  f.q->advanceTo(10);
  EXPECT_EQ(f.attemptsOf("x"), 2);
  IS(f.q->nextAttempt("x", at), Ok);
  EXPECT_EQ(at, 30LL);
  EXPECT_EQ(f.q->waiting(), std::size_t(1));
}

// A plain model: every job is (id, rank, due, attempts); run the smallest (due, rank) until none is due.
TEST(Random, TheQueueMatchesAPlainModelOverManyJobsAndAdvances) {
  std::uint64_t seed = 12345;
  const auto next = [&seed](std::uint64_t mod) {
    seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
    return (seed >> 33) % mod;
  };
  for (int round = 0; round < 30; ++round) {
    Fixture f;
    struct M { int id; int succeedOn; int attempts; long long due; int rank; bool live; bool dead; };
    std::vector<M> model;
    std::vector<std::string> expected;
    long long now = 0;
    int ids = 0;
    for (int step = 0; step < 40; ++step) {
      if (next(3) != 0) {
        const int succeedOn = static_cast<int>(next(6));  // 0 means never
        const std::string id = "j" + std::to_string(ids);
        f.add(id, succeedOn);
        model.push_back({ids, succeedOn, 0, now, ids, true, false});
        ++ids;
      } else {
        const long long target = now + static_cast<long long>(next(60));
        for (;;) {
          M* best = nullptr;
          for (auto& m : model)
            if (m.live && m.due <= target && (!best || m.due < best->due || (m.due == best->due && m.rank < best->rank))) best = &m;
          if (!best) break;
          ++best->attempts;
          expected.push_back("j" + std::to_string(best->id) + "#" + std::to_string(best->attempts) + "@" + std::to_string(best->due));
          if (best->succeedOn != 0 && best->attempts >= best->succeedOn) best->live = false;
          else if (best->attempts >= 5) { best->live = false; best->dead = true; }
          else best->due += 10LL << (best->attempts - 1);
        }
        now = target;
        f.q->advanceTo(target);
      }
    }
    EXPECT_EQ(f.log, expected);
    std::size_t live = 0, dead = 0;
    for (const auto& m : model) { live += m.live ? 1 : 0; dead += m.dead ? 1 : 0; }
    EXPECT_EQ(f.q->waiting(), live);
    EXPECT_EQ(f.q->deadLetters().size(), dead);
  }
}
