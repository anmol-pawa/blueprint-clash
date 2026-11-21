#include <algorithm>
#include <iterator>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using qa::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

constexpr int kNoCap = 1000000;

struct Fixture {
  explicit Fixture(int cap = kNoCap) : s(qa::makeModeratedSite(cap)) {
    for (const char* name : {"alice", "bob", "cara", "dan"}) s->addUser(name);
  }
  void upvotes(const std::string& post, int n, const std::string& tag) {
    for (int i = 0; i < n; ++i) {
      const std::string v = "v-" + tag + std::to_string(i);
      s->addUser(v);
      s->vote(v, post, true);
    }
  }
  std::string order(const std::string& q) const {
    std::string out;
    for (const auto& a : s->answers(q)) out += (out.empty() ? "" : " ") + a.id + (a.accepted ? "*" : "") + ":" + std::to_string(a.score);
    return out;
  }
  std::unique_ptr<qa::ModeratedSite> s;
};
}  // namespace

TEST(Remove, ChecksTheDocumentedOrderAndOnlyTheAuthorMayRemove) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  IS(f.s->remove("ghost", "nope"), UnknownUser);
  IS(f.s->remove("ghost", "q"), UnknownUser);
  IS(f.s->remove("alice", "nope"), UnknownPost);
  IS(f.s->remove("bob", "q"), NotAuthor);
  IS(f.s->remove("alice", "a"), NotAuthor);  // the asker may not delete someone else's answer
  IS(f.s->remove("cara", "a"), NotAuthor);
  EXPECT_EQ(f.order("q"), std::string("a:0"));
  IS(f.s->remove("bob", "a"), Ok);
  IS(f.s->remove("bob", "a"), UnknownPost);
  EXPECT_EQ(f.order("q"), std::string(""));
  IS(f.s->remove("alice", "q"), Ok);
  IS(f.s->answer("b", "q", "bob"), UnknownPost);
}

TEST(Remove, AnAnswerTakesItsVotesAndItsAcceptanceWithIt) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.upvotes("a", 2, "x");
  f.upvotes("q", 1, "y");
  f.s->ask("rq", "dan");
  f.s->answer("ra", "rq", "cara");
  f.upvotes("ra", 2, "z");
  IS(f.s->vote("cara", "a", false), Ok);  // bob -2, cara -1
  IS(f.s->accept("alice", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1 + 20 - 2 + 15);
  EXPECT_EQ(f.s->reputation("alice"), 1 + 5 + 2);
  EXPECT_EQ(f.s->reputation("cara"), 1 + 20 - 1);
  IS(f.s->remove("bob", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1);
  EXPECT_EQ(f.s->reputation("alice"), 1 + 5);
  EXPECT_EQ(f.s->reputation("cara"), 21);  // the cost for downvoting it is refunded
  EXPECT_EQ(f.s->score("a"), 0);
  IS(f.s->answer("a", "q", "dan"), Ok);   // the id is free again and starts clean
  EXPECT_EQ(f.order("q"), std::string("a:0"));
  EXPECT_EQ(f.s->reputation("dan"), 1);
  IS(f.s->vote("cara", "a", false), Ok);
  IS(f.s->vote("v-x0", "a", true), Ok);
  IS(f.s->unvote("v-x1", "a"), NoVote);
}

TEST(Remove, AQuestionTakesAllItsAnswersAndEverythingTheyEarned) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a1", "q", "bob");
  f.s->answer("a2", "q", "cara");
  f.s->answer("a3", "q", "bob");
  f.upvotes("a1", 1, "p");
  f.upvotes("a2", 2, "r");
  f.upvotes("q", 3, "s");
  IS(f.s->accept("alice", "a2"), Ok);
  EXPECT_EQ(f.s->reputation("cara"), 1 + 20 + 15);
  EXPECT_EQ(f.s->reputation("alice"), 1 + 15 + 2);
  f.s->ask("keep", "dan");
  f.s->answer("ka", "keep", "bob");
  f.upvotes("ka", 1, "k");
  IS(f.s->remove("alice", "q"), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 1);
  EXPECT_EQ(f.s->reputation("cara"), 1);
  EXPECT_EQ(f.s->reputation("bob"), 11);
  EXPECT_TRUE(f.s->answers("q").empty());
  EXPECT_EQ(f.s->score("a2"), 0);
  IS(f.s->remove("cara", "a2"), UnknownPost);
  IS(f.s->ask("q", "dan"), Ok);
  EXPECT_TRUE(f.s->answers("q").empty());
  IS(f.s->answer("a2", "q", "cara"), Ok);
  EXPECT_EQ(f.order("q"), std::string("a2:0"));  // not accepted: the old acceptance went with the old question
  IS(f.s->accept("dan", "a2"), Ok);
  EXPECT_EQ(f.s->reputation("cara"), 16);
}

TEST(Remove, RemovingTheAcceptedAnswerLeavesTheQuestionWithoutOne) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.s->answer("b", "q", "cara");
  IS(f.s->accept("alice", "a"), Ok);
  IS(f.s->remove("bob", "a"), Ok);
  EXPECT_EQ(f.order("q"), std::string("b:0"));
  EXPECT_EQ(f.s->reputation("alice"), 1);
  IS(f.s->answer("a", "q", "dan"), Ok);
  EXPECT_EQ(f.order("q"), std::string("b:0 a:0"));  // the reused id is not accepted
  IS(f.s->accept("alice", "a"), Ok);
  EXPECT_EQ(f.s->reputation("dan"), 16);
}

TEST(Remove, VotesTheAuthorCastOnOtherPostsStay) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.s->ask("other", "dan");
  f.s->answer("oa", "other", "cara");
  IS(f.s->vote("bob", "oa", true), Ok);
  IS(f.s->vote("bob", "other", true), Ok);
  IS(f.s->remove("bob", "a"), Ok);
  EXPECT_EQ(f.s->reputation("cara"), 11);
  EXPECT_EQ(f.s->reputation("dan"), 6);
  EXPECT_EQ(f.s->score("oa"), 1);
  IS(f.s->vote("bob", "oa", true), AlreadyVoted);
}

TEST(Remove, RemovingAPostLiftsADayBackUnderTheCap) {
  Fixture f(30);
  f.s->ask("q", "alice");
  for (const char* id : {"a1", "a2", "a3", "a4"}) {
    f.s->answer(id, "q", "bob");
    f.upvotes(id, 1, id);
  }
  EXPECT_EQ(f.s->reputation("bob"), 31);
  IS(f.s->remove("bob", "a1"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 31);
  IS(f.s->remove("bob", "a2"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 21);
  f.s->setDay(3);
  f.s->answer("a5", "q", "bob");
  f.upvotes("a5", 4, "late");
  EXPECT_EQ(f.s->reputation("bob"), 51);
  IS(f.s->remove("alice", "q"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1);
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
  Status remove(const std::string& u, const std::string& p) {
    if (!hasUser(u)) return Status::UnknownUser;
    if (!posts.count(p)) return Status::UnknownPost;
    if (posts.at(p).author != u) return Status::NotAuthor;
    std::vector<std::string> gone = {p};
    if (posts.at(p).question) {
      for (const auto& e : posts) {
        if (!e.second.question && e.second.parent == p) gone.push_back(e.first);
      }
    }
    for (const auto& id : gone) {
      for (auto it = votes.begin(); it != votes.end();) {
        it = it->first.first == id ? votes.erase(it) : std::next(it);
      }
      for (auto it = accepted.begin(); it != accepted.end();) {
        it = (it->first == id || it->second == id) ? accepted.erase(it) : std::next(it);
      }
      posts.erase(id);
    }
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


TEST(Remove, RandomOperationsAgreeWithAPlainModelIncludingDeletes) {
  const std::vector<std::string> names = {"u0", "u1", "u2", "u3", "u4", "u5", "ghost"};
  const std::vector<std::string> ids = {"p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"};
  const std::vector<int> caps = {1, 10, 25, kNoCap};
  int mismatches = 0;
  for (std::size_t c = 0; c < caps.size(); ++c) {
    Rng rng{(c + 1) * 15485863ULL};
    auto site = qa::makeModeratedSite(caps[c]);
    Model model;
    model.cap = caps[c];
    for (int i = 0; i < 6; ++i) {
      site->addUser(names[i]);
      model.users.push_back(names[i]);
    }
    for (int step = 0; step < 2000; ++step) {
      const std::string& user = names[rng.next(7)];
      const std::string& post = ids[rng.next(12)];
      const std::string& other = ids[rng.next(12)];
      const bool up = rng.next(4) != 0;
      Status got = Status::Ok, want = Status::Ok;
      switch (rng.next(12)) {
        case 0: got = site->ask(post, user); want = model.ask(post, user); break;
        case 1:
        case 2: got = site->answer(post, other, user); want = model.answer(post, other, user); break;
        case 3:
        case 4: got = site->vote(user, post, up); want = model.vote(user, post, up); break;
        case 5: got = site->unvote(user, post); want = model.unvote(user, post); break;
        case 6:
        case 7: got = site->accept(user, post); want = model.accept(user, post); break;
        case 8:
        case 9: got = site->remove(user, post); want = model.remove(user, post); break;
        default: {
          const int target = model.day + rng.next(3);
          got = site->setDay(target);
          model.day = target;
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
