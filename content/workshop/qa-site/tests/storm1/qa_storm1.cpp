#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using qa::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  explicit Fixture(int cap) : s(qa::makeCappedSite(cap)) {
    for (const char* name : {"alice", "bob", "cara", "dan"}) s->addUser(name);
  }
  // `n` fresh voters each upvote post `post` (+10 on an answer).
  void upvotes(const std::string& post, int n, const std::string& tag) {
    for (int i = 0; i < n; ++i) {
      const std::string v = "v-" + tag + std::to_string(i);
      s->addUser(v);
      s->vote(v, post, true);
    }
  }
  std::unique_ptr<qa::CappedSite> s;
};
}  // namespace

TEST(Cap, TheDayClockOnlyMovesForwardAndTheCapIsChecked) {
  EXPECT_TRUE(qa::makeCappedSite(0) == nullptr);
  EXPECT_TRUE(qa::makeCappedSite(-3) == nullptr);
  Fixture f(30);
  IS(f.s->setDay(0), Ok);
  IS(f.s->setDay(5), Ok);
  IS(f.s->setDay(5), Ok);
  IS(f.s->setDay(4), InvalidInput);
  IS(f.s->setDay(-1), InvalidInput);
  IS(f.s->setDay(qa::kMaxDay + 1), InvalidInput);
  IS(f.s->setDay(qa::kMaxDay), Ok);
  IS(f.s->setDay(qa::kMaxDay), Ok);
}

TEST(Cap, UpvotePointsOfOneDayCountOnlyUpToTheCapAndEachDayHasItsOwn) {
  Fixture f(30);
  f.s->ask("q", "alice");
  for (const char* id : {"a1", "a2", "a3", "a4", "a5"}) f.s->answer(id, "q", "bob");
  f.upvotes("a1", 2, "x");
  EXPECT_EQ(f.s->reputation("bob"), 21);
  f.upvotes("a2", 1, "y");
  EXPECT_EQ(f.s->reputation("bob"), 31);
  f.upvotes("a3", 1, "z");
  EXPECT_EQ(f.s->reputation("bob"), 31);
  f.s->setDay(1);
  f.upvotes("a4", 1, "w");
  EXPECT_EQ(f.s->reputation("bob"), 41);
  f.upvotes("a5", 5, "u");
  EXPECT_EQ(f.s->reputation("bob"), 61);
  EXPECT_EQ(f.s->score("a5"), 5);
}

TEST(Cap, TheCapBelongsToEachUserSeparately) {
  Fixture f(10);
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.s->answer("b", "q", "cara");
  f.upvotes("a", 3, "p");
  f.upvotes("b", 2, "r");
  EXPECT_EQ(f.s->reputation("bob"), 11);
  EXPECT_EQ(f.s->reputation("cara"), 11);
  f.upvotes("q", 4, "s");
  EXPECT_EQ(f.s->reputation("alice"), 11);
}

TEST(Cap, TakingAVoteBackLiftsTheDayBackUnderTheCap) {
  Fixture f(30);
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  for (int i = 0; i < 5; ++i) {
    f.s->addUser("w" + std::to_string(i));
    f.s->vote("w" + std::to_string(i), "a", true);
  }
  EXPECT_EQ(f.s->reputation("bob"), 31);
  IS(f.s->unvote("w0", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 31);
  IS(f.s->unvote("w1", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 31);
  IS(f.s->unvote("w2", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 21);
  IS(f.s->vote("w2", "a", true), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 31);
}

TEST(Cap, OnlyUpvotesAreCappedPenaltiesAndAcceptancesAreNot) {
  Fixture f(30);
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.s->answer("b", "q", "bob");
  f.upvotes("a", 4, "u");       // 40 of upvotes today: counts 30
  f.s->addUser("rich");
  f.s->ask("rq", "dan");
  f.s->answer("ra", "rq", "rich");
  f.upvotes("ra", 2, "t");
  IS(f.s->vote("rich", "b", false), Ok);   // -2 for bob, -1 for rich
  EXPECT_EQ(f.s->reputation("bob"), 1 + 30 - 2);
  EXPECT_EQ(f.s->reputation("rich"), 1 + 20 - 1);
  IS(f.s->accept("alice", "a"), Ok);      // +15 and +2, no cap
  EXPECT_EQ(f.s->reputation("bob"), 1 + 30 - 2 + 15);
  EXPECT_EQ(f.s->reputation("alice"), 3);
}

TEST(Cap, ADayBelongsToTheVoteThatStandsNotToTheOneItReplaced) {
  Fixture f(10);
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.s->addUser("v1");
  f.s->addUser("v2");
  f.s->ask("dq", "dan");  // an accepted answer pays 15 without the cap, enough to downvote
  f.s->answer("da", "dq", "v2");
  f.s->accept("dan", "da");
  EXPECT_EQ(f.s->reputation("v2"), 16);
  f.s->vote("v1", "a", true);
  f.s->vote("v2", "a", true);
  EXPECT_EQ(f.s->reputation("bob"), 11);
  f.s->setDay(1);
  IS(f.s->vote("v2", "a", false), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1 + 10 - 2);
  f.s->setDay(2);
  IS(f.s->vote("v2", "a", true), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1 + 10 + 10);
}

// ---- A plain model: events recomputed per day from the facts. ----
namespace {
struct Model {
  struct Post {
    bool question;
    std::string author, parent;
    int seq;
  };
  struct Vote {
    bool up;
    int day;
  };
  int cap = 1;
  int day = 0;
  std::vector<std::string> users;
  std::map<std::string, Post> posts;
  std::map<std::pair<std::string, std::string>, Vote> votes;
  std::map<std::string, std::string> accepted;
  int seq = 0;

  bool hasUser(const std::string& u) const { return std::find(users.begin(), users.end(), u) != users.end(); }

  int reputation(const std::string& user) const {
    if (!hasUser(user)) return 0;
    std::map<int, int> upByDay;
    int other = 0;
    for (const auto& v : votes) {
      const Post& p = posts.at(v.first.first);
      if (v.second.up) {
        if (p.author == user) upByDay[v.second.day] += p.question ? 5 : 10;
      } else {
        if (p.author == user) other -= 2;
        if (!p.question && v.first.second == user) other -= 1;
      }
    }
    int total = 1 + other;
    for (const auto& d : upByDay) total += std::min(cap, d.second);
    for (const auto& a : accepted) {
      const std::string& asker = posts.at(a.first).author;
      const std::string& writer = posts.at(a.second).author;
      if (asker == writer) continue;
      if (writer == user) total += 15;
      if (asker == user) total += 2;
    }
    return total < 1 ? 1 : total;
  }
  int score(const std::string& post) const {
    int total = 0;
    for (const auto& v : votes) {
      if (v.first.first == post) total += v.second.up ? 1 : -1;
    }
    return total;
  }
  Status ask(const std::string& id, const std::string& a) {
    if (id.empty() || id.size() > 32) return Status::InvalidInput;
    if (!hasUser(a)) return Status::UnknownUser;
    if (posts.count(id)) return Status::DuplicatePost;
    posts[id] = {true, a, "", seq++};
    return Status::Ok;
  }
  Status answer(const std::string& id, const std::string& q, const std::string& a) {
    if (id.empty() || id.size() > 32) return Status::InvalidInput;
    if (!hasUser(a)) return Status::UnknownUser;
    if (!posts.count(q) || !posts.at(q).question) return Status::UnknownPost;
    if (posts.count(id)) return Status::DuplicatePost;
    posts[id] = {false, a, q, seq++};
    return Status::Ok;
  }
  Status vote(const std::string& v, const std::string& p, bool up) {
    if (!hasUser(v)) return Status::UnknownUser;
    if (!posts.count(p)) return Status::UnknownPost;
    if (posts.at(p).author == v) return Status::SelfVote;
    if (!up && reputation(v) < 15) return Status::LowReputation;
    auto it = votes.find({p, v});
    if (it != votes.end() && it->second.up == up) return Status::AlreadyVoted;
    votes[{p, v}] = {up, day};
    return Status::Ok;
  }
  Status unvote(const std::string& v, const std::string& p) {
    if (!hasUser(v)) return Status::UnknownUser;
    if (!posts.count(p)) return Status::UnknownPost;
    if (!votes.count({p, v})) return Status::NoVote;
    votes.erase({p, v});
    return Status::Ok;
  }
  Status accept(const std::string& u, const std::string& a) {
    if (!hasUser(u)) return Status::UnknownUser;
    if (!posts.count(a)) return Status::UnknownPost;
    if (posts.at(a).question) return Status::WrongKind;
    const std::string q = posts.at(a).parent;
    if (posts.at(q).author != u) return Status::NotAuthor;
    if (accepted.count(q) && accepted.at(q) == a) return Status::AlreadyAccepted;
    accepted[q] = a;
    return Status::Ok;
  }
};

struct Rng {
  unsigned long long state;
  int next(int n) {
    state = state * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<int>((state >> 33) % static_cast<unsigned long long>(n));
  }
};
}  // namespace

TEST(Cap, RandomOperationsAgreeWithAPlainModelForSeveralCaps) {
  const std::vector<std::string> names = {"u0", "u1", "u2", "u3", "u4", "u5", "ghost"};
  const std::vector<std::string> ids = {"p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"};
  const std::vector<int> caps = {1, 7, 10, 25, 1000};
  int mismatches = 0;
  for (std::size_t c = 0; c < caps.size(); ++c) {
    Rng rng{(c + 1) * 104729ULL};
    auto site = qa::makeCappedSite(caps[c]);
    Model model;
    model.cap = caps[c];
    for (int i = 0; i < 6; ++i) {
      site->addUser(names[i]);
      model.users.push_back(names[i]);
    }
    for (int step = 0; step < 1500; ++step) {
      const std::string& user = names[rng.next(7)];
      const std::string& post = ids[rng.next(12)];
      const std::string& other = ids[rng.next(12)];
      const bool up = rng.next(4) != 0;
      Status got = Status::Ok, want = Status::Ok;
      switch (rng.next(10)) {
        case 0: got = site->ask(post, user); want = model.ask(post, user); break;
        case 1:
        case 2: got = site->answer(post, other, user); want = model.answer(post, other, user); break;
        case 3:
        case 4: got = site->vote(user, post, up); want = model.vote(user, post, up); break;
        case 5: got = site->unvote(user, post); want = model.unvote(user, post); break;
        case 6:
        case 7: got = site->accept(user, post); want = model.accept(user, post); break;
        default: {
          const int target = model.day + rng.next(3) - (rng.next(6) == 0 ? 1 : 0);
          want = target < model.day ? Status::InvalidInput : Status::Ok;
          got = site->setDay(target);
          if (want == Status::Ok) model.day = target;
          break;
        }
      }
      if (got != want) ++mismatches;
      if (step % 10 == 0) {
        for (const auto& n : names) {
          if (site->reputation(n) != model.reputation(n)) ++mismatches;
        }
        for (const auto& id : ids) {
          if (site->score(id) != model.score(id)) ++mismatches;
        }
      }
    }
  }
  EXPECT_EQ(mismatches, 0);
}
