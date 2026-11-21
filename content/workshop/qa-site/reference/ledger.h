#pragma once
#include <string>
#include <vector>

#include "accept_book.h"
#include "post_board.h"
#include "reputation_event.h"
#include "rewards.h"
#include "vote_book.h"

// Turns the current facts into reputation events for one user. It reads; it never writes.
class Ledger {
 public:
  Ledger(const PostBoard& posts, const VoteBook& votes, const AcceptBook& accepts)
      : posts_(posts), votes_(votes), accepts_(accepts) {}

  std::vector<ReputationEvent> eventsOf(const std::string& user) const {
    std::vector<ReputationEvent> events;
    votes_.forEach([&](const Vote& vote) { addVoteEvents(vote, user, events); });
    accepts_.forEach([&](const std::string& question, const std::string& answer) { addAcceptEvents(question, answer, user, events); });
    return events;
  }

 private:
  void addVoteEvents(const Vote& vote, const std::string& user, std::vector<ReputationEvent>& events) const {
    const Post* post = posts_.find(vote.post);
    if (post == nullptr) return;
    const int points = vote.up ? rewards::upvoteFor(post->kind) : rewards::kDownvotePenalty;
    if (post->author == user) events.push_back({user, points, vote.day, vote.up});
    if (!vote.up && post->kind == PostKind::Answer && vote.voter == user) events.push_back({user, rewards::kDownvoterCost, vote.day, false});
  }

  void addAcceptEvents(const std::string& question, const std::string& answer, const std::string& user,
                       std::vector<ReputationEvent>& events) const {
    const Post* answerPost = posts_.find(answer);
    const Post* questionPost = posts_.find(question);
    if (answerPost == nullptr || questionPost == nullptr || answerPost->author == questionPost->author) return;
    if (answerPost->author == user) events.push_back({user, rewards::kAcceptedAnswer, 0, false});
    if (questionPost->author == user) events.push_back({user, rewards::kAcceptingAsker, 0, false});
  }

  const PostBoard& posts_;
  const VoteBook& votes_;
  const AcceptBook& accepts_;
};
