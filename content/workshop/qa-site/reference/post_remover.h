#pragma once
#include <string>

#include "accept_book.h"
#include "post_board.h"
#include "vote_book.h"

// Takes a post out of the site together with everything that hangs on it: its votes, its acceptance and, for a question,
// all of its answers. Votes that the author CAST on other posts stay.
class PostRemover {
 public:
  PostRemover(PostBoard& posts, VoteBook& votes, AcceptBook& accepts) : posts_(posts), votes_(votes), accepts_(accepts) {}

  void remove(Post target) {
    if (target.kind == PostKind::Question) {
      for (const Post* answered : posts_.answersOf(target.id)) drop(answered->id);
      accepts_.clear(target.id);
    } else if (accepts_.acceptedFor(target.parent) == target.id) {
      accepts_.clear(target.parent);
    }
    drop(target.id);
  }

 private:
  void drop(const std::string& id) {
    votes_.eraseAllOn(id);
    posts_.erase(id);
  }

  PostBoard& posts_;
  VoteBook& votes_;
  AcceptBook& accepts_;
};
