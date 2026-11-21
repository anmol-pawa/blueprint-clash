#pragma once
// Public API for the Stack Overflow-lite problem. The hidden tests only use what is declared here.
// You implement qa::makeSite() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>
#include <vector>

namespace qa {

enum class Status {
  Ok,
  InvalidInput,     // a name or id that is empty or longer than 32 characters, or a day outside the allowed range
  DuplicateUser,    // a user with this name already exists
  UnknownUser,      // no user with this name
  DuplicatePost,    // a live post (question or answer) already has this id
  UnknownPost,      // no live post with this id (or, for answer(), no live QUESTION with this id)
  SelfVote,         // voting on your own post
  LowReputation,    // a downvote needs reputation kMinDownvoteReputation
  AlreadyVoted,     // the voter already has this very vote on the post
  NoVote,           // unvote with no vote to take back
  WrongKind,        // accept() on a question
  NotAuthor,        // accept(): not the asker; remove(): not the author of the post
  AlreadyAccepted,  // this answer is already the accepted one
};

constexpr int kMinDownvoteReputation = 15;  // reputation needed to downvote
constexpr int kMaxDay = 1000000;            // (storm 1) days are 0..kMaxDay

struct AnswerInfo {
  std::string id;
  std::string author;
  int score = 0;       // upvotes minus downvotes
  bool accepted = false;
};

// A small question-and-answer site. Users ask questions and answer them; other users vote on posts and the asker accepts
// one answer. Everything the site pays out is REPUTATION, and reputation is the heart of this problem.
// Single-threaded and deterministic. A refused call changes nothing.
//
// addUser(name): the name is 1 to 32 characters (InvalidInput), then DuplicateUser. A new user has reputation 1.
// ask(id, author): InvalidInput (id empty or longer than 32 characters), UnknownUser, DuplicatePost.
// answer(id, question, author): InvalidInput, UnknownUser, UnknownPost (no live QUESTION called `question`), DuplicatePost.
//   Questions and answers share one id space. A user may answer their own question.
//
// vote(voter, post, up): CHECK ORDER UnknownUser, UnknownPost, SelfVote (the voter wrote the post), LowReputation (a
// downvote needs the voter's CURRENT reputation >= kMinDownvoteReputation; upvotes need none), AlreadyVoted (the voter
// already has this same vote on the post). A voter has at most one vote per post: voting the opposite way REPLACES the old
// vote, as if it had been taken back first.
// unvote(voter, post): UnknownUser, UnknownPost, NoVote. Takes the vote back, with every effect it had.
//
// Reputation points (the author of the post is the one who is paid):
//   upvote on a question +5, upvote on an answer +10, downvote on any post -2 (and the VOTER pays 1 for downvoting an
//   ANSWER, nothing for a question).
//   accept(user, answer): UnknownUser, UnknownPost, WrongKind (it is a question), NotAuthor (only the asker of that
//   answer's question may accept), AlreadyAccepted. The answer's author gets +15 and the asker +2, but when both are the
//   same person nobody is paid. A question has at most ONE accepted answer: accepting another answer moves the acceptance,
//   and the old answer's +15 and the asker's +2 for it are gone.
//
// reputation(user) is DERIVED from what is currently true: 1 plus the points of every vote and acceptance that currently
// stands, but never below 1 (the floor applies to the total, not to each step). An unknown user has reputation 0.
// score(post) is upvotes minus downvotes (0 for an unknown post).
// answers(question): every live answer, the accepted one first, then higher score first, then the older answer first.
//   Empty for an unknown post or for an answer.
class Site {
 public:
  virtual ~Site() = default;
  virtual Status addUser(const std::string& name) = 0;
  virtual Status ask(const std::string& id, const std::string& author) = 0;
  virtual Status answer(const std::string& id, const std::string& question, const std::string& author) = 0;
  virtual Status vote(const std::string& voter, const std::string& post, bool up) = 0;
  virtual Status unvote(const std::string& voter, const std::string& post) = 0;
  virtual Status accept(const std::string& user, const std::string& answer) = 0;
  virtual int reputation(const std::string& user) const = 0;
  virtual int score(const std::string& post) const = 0;
  virtual std::vector<AnswerInfo> answers(const std::string& question) const = 0;
};

std::unique_ptr<Site> makeSite();

}  // namespace qa
