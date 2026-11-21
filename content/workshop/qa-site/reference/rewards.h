#pragma once
#include "post.h"

// What the site pays, in one place.
namespace rewards {
constexpr int kStartReputation = 1;
constexpr int kUpvoteOnQuestion = 5;
constexpr int kUpvoteOnAnswer = 10;
constexpr int kDownvotePenalty = -2;
constexpr int kDownvoterCost = -1;  // paid by the voter, for downvoting an answer
constexpr int kAcceptedAnswer = 15;
constexpr int kAcceptingAsker = 2;

inline int upvoteFor(PostKind kind) { return kind == PostKind::Question ? kUpvoteOnQuestion : kUpvoteOnAnswer; }

// The floor applies to the total, never to a single step.
inline int reputationFrom(int points) {
  const int total = kStartReputation + points;
  return total < kStartReputation ? kStartReputation : total;
}
}  // namespace rewards
