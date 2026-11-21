#pragma once
#include <algorithm>
#include <string>
#include <vector>

#include "accept_book.h"
#include "api.h"
#include "post_board.h"
#include "vote_book.h"

// Builds the ordered answer list of a question: accepted first, then higher score, then older.
class AnswerLister {
 public:
  AnswerLister(const PostBoard& posts, const VoteBook& votes, const AcceptBook& accepts)
      : posts_(posts), votes_(votes), accepts_(accepts) {}

  std::vector<qa::AnswerInfo> listFor(const std::string& question) const {
    const Post* asked = posts_.find(question);
    std::vector<qa::AnswerInfo> infos;
    if (asked == nullptr || asked->kind != PostKind::Question) return infos;
    const std::string accepted = accepts_.acceptedFor(question);
    for (const Post* post : posts_.answersOf(question)) {
      infos.push_back({post->id, post->author, votes_.score(post->id), post->id == accepted});
    }
    std::stable_sort(infos.begin(), infos.end(), [](const qa::AnswerInfo& a, const qa::AnswerInfo& b) {
      if (a.accepted != b.accepted) return a.accepted;
      return a.score > b.score;
    });
    return infos;
  }

 private:
  const PostBoard& posts_;
  const VoteBook& votes_;
  const AcceptBook& accepts_;
};
