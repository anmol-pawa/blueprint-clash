#pragma once
// Change Storm 2: authors may delete their posts.
#include "api_storm1.h"

namespace qa {

// makeModeratedSite(dailyCap) is a capped site (the cap of storm 1; pass a very large cap such as 1000000 for none)
// that also lets authors delete posts.
//
// remove(user, post): CHECK ORDER UnknownUser, UnknownPost, NotAuthor (only the author of the post). Deleting a QUESTION
// deletes all of its answers too. A deleted post is gone as if it had never existed: the votes cast on it, the
// acceptance of an answer (when the answer or its question goes) and every point those paid or charged (including the
// voter's cost for downvoting an answer) disappear from everyone's reputation. Votes the author CAST on other posts are
// not touched. The ids of the deleted posts are free again, and a new post under a reused id starts with no votes.
class ModeratedSite : public CappedSite {
 public:
  virtual Status remove(const std::string& user, const std::string& post) = 0;
};

std::unique_ptr<ModeratedSite> makeModeratedSite(int dailyCap);

}  // namespace qa
