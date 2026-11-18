#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using jobq::DeadReason;
using jobq::Outcome;
using jobq::RetryPolicy;
using jobq::State;
using jobq::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<jobq::DrainingQueue> q = jobq::makeDrainingQueue();
  std::vector<std::string> log;

  std::string stamp(const std::string& id, int attempt) const {
    return id + "#" + std::to_string(attempt) + "@" + std::to_string(q->now());
  }
  // Answers script[attempt - 1]; past the end of the script it answers `rest`.
  jobq::OutcomeHandler script(const std::string& id, std::vector<Outcome> answers, Outcome rest = Outcome::Retry) {
    return [this, id, answers, rest](int attempt) {
      log.push_back(stamp(id, attempt));
      return attempt <= static_cast<int>(answers.size()) ? answers[static_cast<std::size_t>(attempt - 1)] : rest;
    };
  }
  Status add(const std::string& id, std::vector<Outcome> answers, Outcome rest = Outcome::Retry, RetryPolicy p = RetryPolicy{}) {
    return q->enqueueOutcome(id, p, script(id, std::move(answers), rest));
  }
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
  DeadReason reasonOf(const std::string& id) const {
    DeadReason r = DeadReason::Exhausted;
    q->deadReason(id, r);
    return r;
  }
};
}  // namespace

TEST(Outcome, FatalKillsTheJobAtOnceWhateverAttemptsAreLeft) {
  Fixture f;
  f.add("bad", {Outcome::Retry, Outcome::Retry, Outcome::Fatal});
  EXPECT_EQ(f.q->advanceTo(10000), std::size_t(3));
  EXPECT_EQ(f.order(), std::string("bad#1@0 bad#2@10 bad#3@30"));
  EXPECT_TRUE(f.stateOf("bad") == State::Dead);
  EXPECT_EQ(f.attemptsOf("bad"), 3);
  EXPECT_TRUE(f.reasonOf("bad") == DeadReason::Fatal);
  EXPECT_EQ(f.q->deadLetters().size(), std::size_t(1));
  EXPECT_EQ(f.q->waiting(), std::size_t(0));
  f.add("first", {Outcome::Fatal});
  f.q->advanceTo(10000);
  EXPECT_EQ(f.attemptsOf("first"), 1);
}

TEST(Outcome, RunningOutOfAttemptsIsExhaustedAndAFatalOnTheLastAttemptStaysFatal) {
  Fixture f;
  RetryPolicy two;
  two.maxAttempts = 2;
  f.add("tired", {}, Outcome::Retry, two);
  f.add("fatal-last", {Outcome::Retry, Outcome::Fatal}, Outcome::Retry, two);
  f.q->advanceTo(10000);
  EXPECT_TRUE(f.reasonOf("tired") == DeadReason::Exhausted);
  EXPECT_TRUE(f.reasonOf("fatal-last") == DeadReason::Fatal);
  EXPECT_EQ(f.q->deadLetters().size(), std::size_t(2));
}

TEST(Outcome, DoneEndsTheJobAndPlainBoolHandlersStillMapToDoneAndRetry) {
  Fixture f;
  f.add("ok", {Outcome::Retry, Outcome::Done});
  IS(f.q->enqueue("plain-ok", [&](int attempt) { f.log.push_back(f.stamp("plain-ok", attempt)); return true; }), Ok);
  IS(f.q->enqueue("plain-bad", [&](int attempt) { f.log.push_back(f.stamp("plain-bad", attempt)); return false; }), Ok);
  f.q->advanceTo(10000);
  EXPECT_TRUE(f.stateOf("ok") == State::Succeeded);
  EXPECT_TRUE(f.stateOf("plain-ok") == State::Succeeded);
  EXPECT_EQ(f.attemptsOf("ok"), 2);
  EXPECT_EQ(f.attemptsOf("plain-bad"), 5);
  EXPECT_TRUE(f.reasonOf("plain-bad") == DeadReason::Exhausted);
}

TEST(Outcome, DeadReasonAndTheValidationOfEnqueueOutcomeFollowTheDocumentedStatuses) {
  Fixture f;
  DeadReason r = DeadReason::Fatal;
  IS(f.q->deadReason("nobody", r), NotFound);
  f.add("ok", {Outcome::Done});
  f.add("waiting", {});
  f.q->advanceTo(0);
  IS(f.q->deadReason("ok", r), NotDead);
  IS(f.q->deadReason("waiting", r), NotDead);
  EXPECT_TRUE(r == DeadReason::Fatal);
  IS(f.q->enqueueOutcome("", RetryPolicy{}, nullptr), InvalidId);
  IS(f.q->enqueueOutcome("x", RetryPolicy{}, nullptr), InvalidHandler);
  RetryPolicy bad;
  bad.maxAttempts = 0;
  IS(f.q->enqueueOutcome("x", bad, f.script("x", {})), InvalidPolicy);
  IS(f.q->enqueueOutcome("ok", bad, f.script("x", {})), InvalidPolicy);
  IS(f.q->enqueueOutcome("ok", RetryPolicy{}, f.script("x", {})), DuplicateId);
}

TEST(Redrive, SendsADeadJobBackWithAFreshAttemptCountAtNow) {
  Fixture f;
  f.add("x", {}, Outcome::Retry);
  f.q->advanceTo(200);  // dies at 150
  EXPECT_TRUE(f.stateOf("x") == State::Dead);
  IS(f.q->redrive("x"), Ok);
  EXPECT_TRUE(f.stateOf("x") == State::Waiting);
  EXPECT_EQ(f.attemptsOf("x"), 0);
  EXPECT_TRUE(f.q->deadLetters().empty());
  EXPECT_EQ(f.q->waiting(), std::size_t(1));
  long long at = -1;
  IS(f.q->nextAttempt("x", at), Ok);
  EXPECT_EQ(at, 200LL);
  f.log.clear();
  f.q->advanceTo(200);
  EXPECT_EQ(f.order(), std::string("x#1@200"));
  f.q->advanceTo(100000);
  EXPECT_EQ(f.attemptsOf("x"), 5);
  EXPECT_TRUE(f.stateOf("x") == State::Dead);
  IS(f.q->redrive("x"), Ok);  // a fresh budget every time
  EXPECT_EQ(f.attemptsOf("x"), 0);
}

TEST(Redrive, AnswersNotFoundForUnknownAndNotDeadForEveryOtherState) {
  Fixture f;
  IS(f.q->redrive("nobody"), NotFound);
  f.add("ok", {Outcome::Done});
  f.add("cancelled", {});
  f.add("waiting", {});
  IS(f.q->cancel("cancelled"), Ok);
  f.q->advanceTo(0);
  IS(f.q->redrive("ok"), NotDead);
  IS(f.q->redrive("cancelled"), NotDead);
  IS(f.q->redrive("waiting"), NotDead);
  f.add("dies", {Outcome::Fatal});
  f.q->advanceTo(0);
  IS(f.q->redrive("dies"), Ok);
  IS(f.q->redrive("dies"), NotDead);
}

TEST(Redrive, TheRedrivenJobQueuesBehindEverythingAlreadyEnqueued) {
  Fixture f;
  f.add("old", {Outcome::Fatal});
  f.q->advanceTo(10);
  f.add("newer", {Outcome::Done});  // due at 10, enqueued after "old" was first enqueued
  IS(f.q->redrive("old"), Ok);       // due at 10 too, but it joins the line now
  f.log.clear();
  f.q->advanceTo(10);
  EXPECT_EQ(f.order(), std::string("newer#1@10 old#1@10"));
}

TEST(Redrive, TheDeadLetterQueueKeepsTheOrderOfDeathAfterOthersLeaveIt) {
  Fixture f;
  f.add("a", {Outcome::Fatal});
  f.add("b", {Outcome::Fatal});
  f.add("c", {Outcome::Fatal});
  f.q->advanceTo(0);
  IS(f.q->redrive("b"), Ok);
  std::vector<std::string> dead = f.q->deadLetters();
  ASSERT_EQ(dead.size(), std::size_t(2));
  EXPECT_EQ(dead[0], std::string("a"));
  EXPECT_EQ(dead[1], std::string("c"));
  f.q->advanceTo(0);  // "b" runs again and answers Fatal again: it dies last
  dead = f.q->deadLetters();
  ASSERT_EQ(dead.size(), std::size_t(3));
  EXPECT_EQ(dead[0], std::string("a"));
  EXPECT_EQ(dead[1], std::string("c"));
  EXPECT_EQ(dead[2], std::string("b"));
}

TEST(Redrive, TheJobKeepsItsOwnHandlerAndPolicy) {
  Fixture f;
  RetryPolicy p;
  p.maxAttempts = 2;
  p.backoff = jobq::Backoff::Fixed;
  p.base = 5;
  f.add("x", {}, Outcome::Retry, p);
  f.q->advanceTo(100);  // attempts at 0 and 5, dead
  IS(f.q->redrive("x"), Ok);
  f.log.clear();
  f.q->advanceTo(1000);
  EXPECT_EQ(f.order(), std::string("x#1@100 x#2@105"));
  EXPECT_TRUE(f.stateOf("x") == State::Dead);
  EXPECT_TRUE(f.reasonOf("x") == DeadReason::Exhausted);
}

TEST(Redrive, AHandlerMayRedriveAnotherDeadJobAndItRunsInTheSameAdvance) {
  Fixture f;
  f.add("dead", {Outcome::Fatal});
  f.q->advanceTo(0);
  IS(f.q->enqueueOutcome("healer", RetryPolicy{}, [&](int) {
    f.log.push_back("healer");
    IS(f.q->redrive("dead"), Ok);
    return Outcome::Done;
  }), Ok);
  f.log.clear();
  EXPECT_EQ(f.q->advanceTo(0), std::size_t(2));
  EXPECT_EQ(f.order(), std::string("healer dead#1@0"));
}
