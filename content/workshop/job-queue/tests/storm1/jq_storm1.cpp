#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using jobq::Backoff;
using jobq::RetryPolicy;
using jobq::State;
using jobq::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<jobq::PolicyQueue> q = jobq::makePolicyQueue();
  std::vector<std::string> log;

  std::string stamp(const std::string& id, int attempt) const {
    return id + "#" + std::to_string(attempt) + "@" + std::to_string(q->now());
  }
  jobq::Handler job(const std::string& id, int succeedOn = 0) {
    return [this, id, succeedOn](int attempt) {
      log.push_back(stamp(id, attempt));
      return succeedOn != 0 && attempt >= succeedOn;
    };
  }
  Status add(const std::string& id, int maxAttempts, Backoff b, long long base, long long cap = jobq::kMaxDelayCap, int succeedOn = 0) {
    RetryPolicy p;
    p.maxAttempts = maxAttempts;
    p.backoff = b;
    p.base = base;
    p.cap = cap;
    return q->enqueueWith(id, p, job(id, succeedOn));
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
};
}  // namespace

TEST(Policy, ValidationAndTheDocumentedCheckOrder) {
  Fixture f;
  RetryPolicy p;
  p.maxAttempts = 0;
  IS(f.q->enqueueWith("a", p, f.job("a")), InvalidPolicy);
  p.maxAttempts = 21;
  IS(f.q->enqueueWith("a", p, f.job("a")), InvalidPolicy);
  p = RetryPolicy{};
  p.base = 0;
  IS(f.q->enqueueWith("a", p, f.job("a")), InvalidPolicy);
  p.base = jobq::kMaxBaseDelay + 1;
  p.cap = jobq::kMaxDelayCap;
  IS(f.q->enqueueWith("a", p, f.job("a")), InvalidPolicy);
  p.base = 50;
  p.cap = 49;
  IS(f.q->enqueueWith("a", p, f.job("a")), InvalidPolicy);
  p.cap = jobq::kMaxDelayCap + 1;
  IS(f.q->enqueueWith("a", p, f.job("a")), InvalidPolicy);
  EXPECT_EQ(f.q->waiting(), std::size_t(0));
  // The edges are valid.
  IS(f.add("min", 1, Backoff::Fixed, 1, 1), Ok);
  IS(f.add("max", 20, Backoff::Exponential, jobq::kMaxBaseDelay, jobq::kMaxDelayCap), Ok);
  IS(f.add("edge", 20, Backoff::Linear, jobq::kMaxBaseDelay, jobq::kMaxBaseDelay), Ok);
  // Check order: InvalidId, InvalidHandler, InvalidPolicy, DuplicateId.
  p = RetryPolicy{};
  p.maxAttempts = 0;
  IS(f.q->enqueueWith("", p, nullptr), InvalidId);
  IS(f.q->enqueueWith("b", p, nullptr), InvalidHandler);
  IS(f.q->enqueueWith("min", p, f.job("min")), InvalidPolicy);
  IS(f.q->enqueueWith("min", RetryPolicy{}, f.job("min")), DuplicateId);
  EXPECT_EQ(f.q->waiting(), std::size_t(3));
}

TEST(Policy, FixedLinearAndExponentialDelaysAreMeasuredFromTheFailedAttempt) {
  Fixture f;
  f.add("fixed", 4, Backoff::Fixed, 7);
  f.add("linear", 4, Backoff::Linear, 5);
  f.add("expo", 5, Backoff::Exponential, 3);
  f.q->advanceTo(1000);
  EXPECT_EQ(f.order(), std::string("fixed#1@0 linear#1@0 expo#1@0 expo#2@3 linear#2@5 fixed#2@7 expo#3@9 fixed#3@14 linear#3@15 fixed#4@21 expo#4@21 linear#4@30 expo#5@45"));
  EXPECT_TRUE(f.stateOf("fixed") == State::Dead);
  EXPECT_TRUE(f.stateOf("linear") == State::Dead);
  EXPECT_TRUE(f.stateOf("expo") == State::Dead);
}

TEST(Policy, TheCapLimitsEveryDelay) {
  Fixture f;
  f.add("expo", 6, Backoff::Exponential, 10, 25);
  f.q->advanceTo(1000);
  EXPECT_EQ(f.order(), std::string("expo#1@0 expo#2@10 expo#3@30 expo#4@55 expo#5@80 expo#6@105"));
  Fixture g;
  g.add("lin", 5, Backoff::Linear, 10, 25);
  g.q->advanceTo(1000);
  EXPECT_EQ(g.order(), std::string("lin#1@0 lin#2@10 lin#3@30 lin#4@55 lin#5@80"));
}

TEST(Policy, MaxAttemptsBelongsToTheJobAndOneAttemptMeansNoRetries) {
  Fixture f;
  f.add("once", 1, Backoff::Fixed, 5);
  f.add("thrice", 3, Backoff::Fixed, 5);
  f.add("default", 5, Backoff::Exponential, 10);
  f.q->advanceTo(10000);
  EXPECT_EQ(f.order(), std::string("once#1@0 thrice#1@0 default#1@0 thrice#2@5 thrice#3@10 default#2@10 default#3@30 default#4@70 default#5@150"));
  const std::vector<std::string> dead = f.q->deadLetters();
  ASSERT_EQ(dead.size(), std::size_t(3));
  EXPECT_EQ(dead[0], std::string("once"));
  EXPECT_EQ(dead[1], std::string("thrice"));
  EXPECT_EQ(dead[2], std::string("default"));
}

TEST(Policy, ThePlainEnqueueKeepsTheDefaultPolicyWhateverOtherJobsUse) {
  Fixture f;
  f.add("slow", 2, Backoff::Fixed, 1000);
  IS(f.q->enqueue("plain", f.job("plain")), Ok);
  f.q->advanceTo(100000);
  EXPECT_EQ(f.order(), std::string("slow#1@0 plain#1@0 plain#2@10 plain#3@30 plain#4@70 plain#5@150 slow#2@1000"));
}

TEST(Policy, TheLargestDelaysDoNotOverflowAndStayUnderTheCap) {
  Fixture f;
  f.add("big", 20, Backoff::Exponential, jobq::kMaxBaseDelay, jobq::kMaxDelayCap);
  f.q->advanceTo(1000000000000000LL);
  std::string expected;
  long long t = 0;
  for (int n = 1; n <= 20; ++n) {
    expected += (expected.empty() ? "" : " ") + std::string("big#") + std::to_string(n) + "@" + std::to_string(t);
    long long d = jobq::kMaxBaseDelay;
    for (int i = 1; i < n; ++i) d = std::min<long long>(d * 2, jobq::kMaxDelayCap);
    t += std::min<long long>(d, jobq::kMaxDelayCap);
  }
  EXPECT_EQ(f.order(), expected);
}

TEST(Policy, ARetryKeepsItsJobsPlaceInLineAmongEqualTimes) {
  Fixture f;
  f.add("first", 4, Backoff::Fixed, 10);   // attempts at 0, 10, 20, 30
  f.add("second", 2, Backoff::Fixed, 30);  // attempts at 0, 30
  f.q->advanceTo(30);
  EXPECT_EQ(f.order(), std::string("first#1@0 second#1@0 first#2@10 first#3@20 first#4@30 second#2@30"));
}

TEST(Random, PerJobPoliciesMatchAPlainModel) {
  std::uint64_t seed = 99;
  const auto next = [&seed](std::uint64_t mod) {
    seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
    return (seed >> 33) % mod;
  };
  for (int round = 0; round < 30; ++round) {
    Fixture f;
    struct M { int id; int succeedOn; int maxAttempts; int kind; long long base; long long cap; int attempts; long long due; int rank; bool live; };
    std::vector<M> model;
    std::vector<std::string> expected;
    long long now = 0;
    int ids = 0;
    for (int step = 0; step < 40; ++step) {
      if (next(3) != 0) {
        M m{ids, static_cast<int>(next(5)), 1 + static_cast<int>(next(5)), static_cast<int>(next(3)), 1 + static_cast<long long>(next(9)), 0, 0, now, ids, true};
        m.cap = m.base + static_cast<long long>(next(40));
        f.add("j" + std::to_string(ids), m.maxAttempts, static_cast<Backoff>(m.kind), m.base, m.cap, m.succeedOn);
        model.push_back(m);
        ++ids;
      } else {
        const long long target = now + static_cast<long long>(next(50));
        for (;;) {
          M* best = nullptr;
          for (auto& m : model)
            if (m.live && m.due <= target && (!best || m.due < best->due || (m.due == best->due && m.rank < best->rank))) best = &m;
          if (!best) break;
          ++best->attempts;
          expected.push_back("j" + std::to_string(best->id) + "#" + std::to_string(best->attempts) + "@" + std::to_string(best->due));
          if (best->succeedOn != 0 && best->attempts >= best->succeedOn) {
            best->live = false;
          } else if (best->attempts >= best->maxAttempts) {
            best->live = false;
          } else {
            long long d = best->kind == 0 ? best->base : best->kind == 1 ? best->base * best->attempts : best->base << (best->attempts - 1);
            best->due += std::min(d, best->cap);
          }
        }
        now = target;
        f.q->advanceTo(target);
      }
    }
    EXPECT_EQ(f.log, expected);
  }
}
