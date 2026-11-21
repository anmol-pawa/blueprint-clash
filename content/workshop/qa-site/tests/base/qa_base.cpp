#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using qa::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

struct Fixture {
  std::unique_ptr<qa::Site> s = qa::makeSite();
  Fixture() {
    for (const char* name : {"alice", "bob", "cara", "dan"}) s->addUser(name);
  }
  // Gives `user` exactly 10 * n more reputation by n upvotes from fresh voters on a fresh answer.
  void earn(const std::string& user, int n) {
    ++round;
    const std::string q = "earn-q" + std::to_string(round);
    const std::string a = "earn-a" + std::to_string(round);
    s->addUser("earn-asker" + std::to_string(round));
    s->ask(q, "earn-asker" + std::to_string(round));
    s->answer(a, q, user);
    for (int i = 0; i < n; ++i) {
      const std::string v = "earn-v" + std::to_string(round) + "-" + std::to_string(i);
      s->addUser(v);
      s->vote(v, a, true);
    }
  }
  std::string order(const std::string& q) const {
    std::string out;
    for (const auto& a : s->answers(q)) out += (out.empty() ? "" : " ") + a.id + (a.accepted ? "*" : "") + ":" + std::to_string(a.score);
    return out;
  }
  int round = 0;
};
}  // namespace

TEST(Users, AddUserChecksItsNameAndStartsAtOne) {
  auto s = qa::makeSite();
  IS(s->addUser(""), InvalidInput);
  IS(s->addUser(std::string(33, 'x')), InvalidInput);
  IS(s->addUser(std::string(32, 'x')), Ok);
  IS(s->addUser("alice"), Ok);
  IS(s->addUser("alice"), DuplicateUser);
  EXPECT_EQ(s->reputation("alice"), 1);
  EXPECT_EQ(s->reputation(std::string(32, 'x')), 1);
  EXPECT_EQ(s->reputation("nobody"), 0);
  EXPECT_EQ(s->score("nothing"), 0);
}

TEST(Posting, AskAndAnswerCheckTheirArgumentsInTheDocumentedOrder) {
  Fixture f;
  IS(f.s->ask("", "alice"), InvalidInput);
  IS(f.s->ask("", "ghost"), InvalidInput);
  IS(f.s->ask(std::string(33, 'q'), "alice"), InvalidInput);
  IS(f.s->ask("q1", "ghost"), UnknownUser);
  IS(f.s->ask("q1", "alice"), Ok);
  IS(f.s->ask("q1", "ghost"), UnknownUser);
  IS(f.s->ask("q1", "bob"), DuplicatePost);
  IS(f.s->answer("", "q1", "bob"), InvalidInput);
  IS(f.s->answer("a1", "q1", "ghost"), UnknownUser);
  IS(f.s->answer("a1", "nope", "ghost"), UnknownUser);
  IS(f.s->answer("a1", "nope", "bob"), UnknownPost);
  IS(f.s->answer("q1", "nope", "bob"), UnknownPost);
  IS(f.s->answer("q1", "q1", "bob"), DuplicatePost);
  IS(f.s->answer("a1", "q1", "bob"), Ok);
  IS(f.s->answer("a2", "a1", "cara"), UnknownPost);
  IS(f.s->answer("a1", "q1", "cara"), DuplicatePost);
  IS(f.s->ask("a1", "dan"), DuplicatePost);
  IS(f.s->answer("a3", "q1", "alice"), Ok);
  EXPECT_EQ(f.order("q1"), std::string("a1:0 a3:0"));
}

TEST(Voting, UpvotesPayTheAuthorByKindAndDownvotesChargeBothSides) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  IS(f.s->vote("cara", "q", true), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 6);
  IS(f.s->vote("cara", "a", true), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 11);
  EXPECT_EQ(f.s->reputation("cara"), 1);
  EXPECT_EQ(f.s->score("q"), 1);
  f.earn("dan", 2);
  EXPECT_EQ(f.s->reputation("dan"), 21);
  IS(f.s->vote("dan", "q", false), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 4);
  EXPECT_EQ(f.s->reputation("dan"), 21);
  IS(f.s->vote("dan", "a", false), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 9);
  EXPECT_EQ(f.s->reputation("dan"), 20);
  EXPECT_EQ(f.s->score("q"), 0);
  EXPECT_EQ(f.s->score("a"), 0);
}

TEST(Voting, ChecksRunInTheDocumentedOrderAndDownvotesNeedFifteen) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  IS(f.s->vote("ghost", "nope", true), UnknownUser);
  IS(f.s->vote("cara", "nope", true), UnknownPost);
  IS(f.s->vote("alice", "q", true), SelfVote);
  IS(f.s->vote("alice", "q", false), SelfVote);
  IS(f.s->vote("bob", "a", false), SelfVote);
  IS(f.s->vote("cara", "q", false), LowReputation);
  f.earn("cara", 1);
  EXPECT_EQ(f.s->reputation("cara"), 11);
  IS(f.s->vote("cara", "q", false), LowReputation);
  f.s->addUser("dora");
  f.earn("dora", 1);
  EXPECT_EQ(f.s->reputation("dora"), 11);
  f.s->ask("qq", "dora");
  f.s->vote("alice", "qq", true);  // dora: 11 + 5 = 16
  EXPECT_EQ(f.s->reputation("dora"), 16);
  IS(f.s->vote("dora", "q", false), Ok);   // 16 >= 15: fine, a question costs the voter nothing
  EXPECT_EQ(f.s->reputation("dora"), 16);
  IS(f.s->vote("dora", "a", false), Ok);   // 16: allowed, and it costs 1 -> 15
  EXPECT_EQ(f.s->reputation("dora"), 15);
  f.s->answer("a2", "q", "cara");
  IS(f.s->vote("dora", "a2", false), Ok);  // exactly 15 is enough -> 14
  EXPECT_EQ(f.s->reputation("dora"), 14);
  f.s->answer("a3", "q", "cara");
  IS(f.s->vote("dora", "a3", false), LowReputation);
  IS(f.s->vote("dora", "a", false), LowReputation);  // the check comes before AlreadyVoted
  IS(f.s->vote("dora", "a3", true), Ok);             // an upvote needs no reputation
  IS(f.s->vote("dora", "a3", true), AlreadyVoted);
}

TEST(Voting, VotingTheOtherWayReplacesTheOldVoteWithAllItsEffects) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.earn("dan", 2);
  IS(f.s->vote("dan", "a", true), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 11);
  EXPECT_EQ(f.s->score("a"), 1);
  IS(f.s->vote("dan", "a", false), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1);
  EXPECT_EQ(f.s->reputation("dan"), 20);
  EXPECT_EQ(f.s->score("a"), -1);
  IS(f.s->vote("dan", "a", true), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 11);
  EXPECT_EQ(f.s->reputation("dan"), 21);
  EXPECT_EQ(f.s->score("a"), 1);
  IS(f.s->vote("dan", "q", true), Ok);
  IS(f.s->vote("dan", "q", false), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 1);
  EXPECT_EQ(f.s->score("q"), -1);
}

TEST(Voting, UnvoteTakesTheVoteBackWithEveryEffect) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.earn("dan", 2);
  IS(f.s->unvote("ghost", "a"), UnknownUser);
  IS(f.s->unvote("dan", "nope"), UnknownPost);
  IS(f.s->unvote("dan", "a"), NoVote);
  IS(f.s->vote("dan", "a", false), Ok);
  EXPECT_EQ(f.s->reputation("dan"), 20);
  IS(f.s->unvote("dan", "a"), Ok);
  EXPECT_EQ(f.s->reputation("dan"), 21);
  EXPECT_EQ(f.s->reputation("bob"), 1);
  EXPECT_EQ(f.s->score("a"), 0);
  IS(f.s->unvote("dan", "a"), NoVote);
  IS(f.s->vote("cara", "a", true), Ok);
  IS(f.s->unvote("cara", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1);
  IS(f.s->vote("cara", "a", true), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 11);
}

TEST(Reputation, TheFloorAppliesToTheTotalNotToEachStep) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.earn("dan", 2);
  IS(f.s->vote("dan", "a", false), Ok);   // bob: 1 - 2 is below the floor, shows as 1
  EXPECT_EQ(f.s->reputation("bob"), 1);
  IS(f.s->vote("cara", "a", true), Ok);   // 1 - 2 + 10 = 9, not 1 + 10
  EXPECT_EQ(f.s->reputation("bob"), 1 + 10 - 2);
  IS(f.s->unvote("dan", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 11);
  IS(f.s->vote("dan", "a", false), Ok);
  IS(f.s->unvote("cara", "a"), Ok);       // back under the floor: shows 1, and no points were lost for good
  EXPECT_EQ(f.s->reputation("bob"), 1);
  IS(f.s->unvote("dan", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1);
}

TEST(Accept, PaysTheAnswerAuthorAndTheAskerAndOnlyTheAskerMayAccept) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  IS(f.s->accept("ghost", "a"), UnknownUser);
  IS(f.s->accept("alice", "nope"), UnknownPost);
  IS(f.s->accept("bob", "q"), WrongKind);
  IS(f.s->accept("alice", "q"), WrongKind);
  IS(f.s->accept("bob", "a"), NotAuthor);
  IS(f.s->accept("cara", "a"), NotAuthor);
  EXPECT_EQ(f.s->reputation("bob"), 1);
  IS(f.s->accept("alice", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 16);
  EXPECT_EQ(f.s->reputation("alice"), 3);
  IS(f.s->accept("alice", "a"), AlreadyAccepted);
  IS(f.s->accept("bob", "a"), NotAuthor);
  EXPECT_EQ(f.order("q"), std::string("a*:0"));
}

TEST(Accept, AcceptingAnotherAnswerMovesTheAcceptanceAndItsPoints) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("a", "q", "bob");
  f.s->answer("b", "q", "cara");
  IS(f.s->accept("alice", "a"), Ok);
  IS(f.s->accept("alice", "b"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 1);
  EXPECT_EQ(f.s->reputation("cara"), 16);
  EXPECT_EQ(f.s->reputation("alice"), 3);
  EXPECT_EQ(f.order("q"), std::string("b*:0 a:0"));
  IS(f.s->accept("alice", "b"), AlreadyAccepted);
  IS(f.s->accept("alice", "a"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 16);
  EXPECT_EQ(f.s->reputation("cara"), 1);
  EXPECT_EQ(f.s->reputation("alice"), 3);
  f.s->ask("q2", "dan");
  f.s->answer("a2", "q2", "bob");
  IS(f.s->accept("dan", "a2"), Ok);
  EXPECT_EQ(f.s->reputation("bob"), 31);
}

TEST(Accept, AcceptingYourOwnAnswerPaysNobody) {
  Fixture f;
  f.s->ask("q", "alice");
  f.s->answer("mine", "q", "alice");
  f.s->answer("b", "q", "bob");
  IS(f.s->accept("alice", "mine"), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 1);
  EXPECT_EQ(f.order("q"), std::string("mine*:0 b:0"));
  IS(f.s->accept("alice", "b"), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 3);
  EXPECT_EQ(f.s->reputation("bob"), 16);
  IS(f.s->accept("alice", "mine"), Ok);
  EXPECT_EQ(f.s->reputation("alice"), 1);
  EXPECT_EQ(f.s->reputation("bob"), 1);
}

TEST(Answers, AreListedAcceptedFirstThenByScoreThenOlderFirst) {
  Fixture f;
  f.s->ask("q", "alice");
  for (const char* id : {"a1", "a2", "a3", "a4", "a5"}) f.s->answer(id, "q", "bob");
  f.s->addUser("v1");
  f.s->addUser("v2");
  f.s->vote("cara", "a3", true);
  f.s->vote("dan", "a3", true);
  f.s->vote("v1", "a3", true);
  f.s->vote("cara", "a4", true);
  f.s->vote("dan", "a4", true);
  f.earn("v2", 2);
  f.s->vote("v2", "a5", false);
  EXPECT_EQ(f.order("q"), std::string("a3:3 a4:2 a1:0 a2:0 a5:-1"));
  f.s->accept("alice", "a5");
  EXPECT_EQ(f.order("q"), std::string("a5*:-1 a3:3 a4:2 a1:0 a2:0"));
  f.s->accept("alice", "a2");
  EXPECT_EQ(f.order("q"), std::string("a2*:0 a3:3 a4:2 a1:0 a5:-1"));
  EXPECT_TRUE(f.s->answers("a1").empty());
  EXPECT_TRUE(f.s->answers("nope").empty());
  const auto list = f.s->answers("q");
  EXPECT_EQ(list.front().author, std::string("bob"));
  f.s->ask("q2", "alice");
  EXPECT_TRUE(f.s->answers("q2").empty());
}

// ---- A plain model of the same rules, recomputed from scratch every time. ----
namespace {
struct Model {
  struct Post {
    bool question;
    std::string author, parent;
    int seq;
  };
  std::vector<std::string> users;
  std::map<std::string, Post> posts;
  std::map<std::pair<std::string, std::string>, bool> votes;  // (post, voter) -> up
  std::map<std::string, std::string> accepted;                // question -> answer
  int seq = 0;

  bool hasUser(const std::string& u) const { return std::find(users.begin(), users.end(), u) != users.end(); }

  int reputation(const std::string& user) const {
    if (!hasUser(user)) return 0;
    int total = 1;
    for (const auto& v : votes) {
      const Post& p = posts.at(v.first.first);
      if (v.second) {
        if (p.author == user) total += p.question ? 5 : 10;
      } else {
        if (p.author == user) total -= 2;
        if (!p.question && v.first.second == user) total -= 1;
      }
    }
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
      if (v.first.first == post) total += v.second ? 1 : -1;
    }
    return total;
  }
  std::string order(const std::string& q) const {
    auto it = posts.find(q);
    if (it == posts.end() || !it->second.question) return "";
    std::vector<std::string> ids;
    for (const auto& p : posts) {
      if (!p.second.question && p.second.parent == q) ids.push_back(p.first);
    }
    const std::string acc = accepted.count(q) ? accepted.at(q) : "";
    std::sort(ids.begin(), ids.end(), [&](const std::string& a, const std::string& b) {
      if ((a == acc) != (b == acc)) return a == acc;
      if (score(a) != score(b)) return score(a) > score(b);
      return posts.at(a).seq < posts.at(b).seq;
    });
    std::string out;
    for (const auto& id : ids) out += (out.empty() ? "" : " ") + id + (id == acc ? "*" : "") + ":" + std::to_string(score(id));
    return out;
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
    if (it != votes.end() && it->second == up) return Status::AlreadyVoted;
    votes[{p, v}] = up;
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

TEST(Model, RandomOperationsAgreeWithAPlainModelOfTheRules) {
  const std::vector<std::string> names = {"u0", "u1", "u2", "u3", "u4", "u5", "ghost"};
  const std::vector<std::string> ids = {"p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"};
  int mismatches = 0;
  for (unsigned long long seed = 1; seed <= 6; ++seed) {
    Rng rng{seed * 7919};
    auto site = qa::makeSite();
    Model model;
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
      switch (rng.next(8)) {
        case 0: got = site->ask(post, user); want = model.ask(post, user); break;
        case 1:
        case 2: got = site->answer(post, other, user); want = model.answer(post, other, user); break;
        case 3:
        case 4: got = site->vote(user, post, up); want = model.vote(user, post, up); break;
        case 5: got = site->unvote(user, post); want = model.unvote(user, post); break;
        case 6:
        case 7: got = site->accept(user, post); want = model.accept(user, post); break;
      }
      if (got != want) ++mismatches;
      if (step % 10 == 0) {
        for (const auto& n : names) {
          if (site->reputation(n) != model.reputation(n)) ++mismatches;
        }
        for (const auto& id : ids) {
          if (site->score(id) != model.score(id)) ++mismatches;
          std::string order;
          for (const auto& a : site->answers(id)) order += (order.empty() ? "" : " ") + a.id + (a.accepted ? "*" : "") + ":" + std::to_string(a.score);
          if (order != model.order(id)) ++mismatches;
        }
      }
    }
  }
  EXPECT_EQ(mismatches, 0);
}
