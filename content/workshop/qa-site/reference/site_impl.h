#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "accept_book.h"
#include "answer_lister.h"
#include "api_storm2.h"
#include "day_clock.h"
#include "ledger.h"
#include "post_board.h"
#include "post_remover.h"
#include "reputation_policy.h"
#include "rewards.h"
#include "user_directory.h"
#include "vote_book.h"

class SiteImpl : public qa::ModeratedSite {
 public:
  explicit SiteImpl(std::unique_ptr<ReputationPolicy> policy)
      : policy_(std::move(policy)), ledger_(posts_, votes_, accepts_), lister_(posts_, votes_, accepts_), remover_(posts_, votes_, accepts_) {}

  qa::Status addUser(const std::string& name) override {
    if (!isValidName(name)) return qa::Status::InvalidInput;
    if (users_.contains(name)) return qa::Status::DuplicateUser;
    users_.add(name);
    return qa::Status::Ok;
  }

  qa::Status ask(const std::string& id, const std::string& author) override {
    if (!isValidName(id)) return qa::Status::InvalidInput;
    if (!users_.contains(author)) return qa::Status::UnknownUser;
    if (posts_.contains(id)) return qa::Status::DuplicatePost;
    posts_.addQuestion(id, author);
    return qa::Status::Ok;
  }

  qa::Status answer(const std::string& id, const std::string& question, const std::string& author) override {
    if (!isValidName(id)) return qa::Status::InvalidInput;
    if (!users_.contains(author)) return qa::Status::UnknownUser;
    const Post* asked = posts_.find(question);
    if (asked == nullptr || asked->kind != PostKind::Question) return qa::Status::UnknownPost;
    if (posts_.contains(id)) return qa::Status::DuplicatePost;
    posts_.addAnswer(id, question, author);
    return qa::Status::Ok;
  }

  qa::Status vote(const std::string& voter, const std::string& post, bool up) override {
    if (!users_.contains(voter)) return qa::Status::UnknownUser;
    const Post* target = posts_.find(post);
    if (target == nullptr) return qa::Status::UnknownPost;
    if (target->author == voter) return qa::Status::SelfVote;
    if (!up && reputation(voter) < qa::kMinDownvoteReputation) return qa::Status::LowReputation;
    const Vote* existing = votes_.find(post, voter);
    if (existing != nullptr && existing->up == up) return qa::Status::AlreadyVoted;
    votes_.put({voter, post, up, clock_.today()});
    return qa::Status::Ok;
  }

  qa::Status unvote(const std::string& voter, const std::string& post) override {
    if (!users_.contains(voter)) return qa::Status::UnknownUser;
    if (!posts_.contains(post)) return qa::Status::UnknownPost;
    if (votes_.find(post, voter) == nullptr) return qa::Status::NoVote;
    votes_.erase(post, voter);
    return qa::Status::Ok;
  }

  qa::Status accept(const std::string& user, const std::string& answer) override {
    if (!users_.contains(user)) return qa::Status::UnknownUser;
    const Post* chosen = posts_.find(answer);
    if (chosen == nullptr) return qa::Status::UnknownPost;
    if (chosen->kind != PostKind::Answer) return qa::Status::WrongKind;
    if (posts_.find(chosen->parent)->author != user) return qa::Status::NotAuthor;
    if (accepts_.acceptedFor(chosen->parent) == answer) return qa::Status::AlreadyAccepted;
    accepts_.accept(chosen->parent, answer);
    return qa::Status::Ok;
  }

  int reputation(const std::string& user) const override {
    if (!users_.contains(user)) return 0;
    return rewards::reputationFrom(policy_->pointsFrom(ledger_.eventsOf(user)));
  }

  int score(const std::string& post) const override { return votes_.score(post); }

  std::vector<qa::AnswerInfo> answers(const std::string& question) const override { return lister_.listFor(question); }

  qa::Status setDay(int day) override { return clock_.moveTo(day) ? qa::Status::Ok : qa::Status::InvalidInput; }

  qa::Status remove(const std::string& user, const std::string& post) override {
    if (!users_.contains(user)) return qa::Status::UnknownUser;
    const Post* target = posts_.find(post);
    if (target == nullptr) return qa::Status::UnknownPost;
    if (target->author != user) return qa::Status::NotAuthor;
    remover_.remove(*target);
    return qa::Status::Ok;
  }

 private:
  UserDirectory users_;
  PostBoard posts_;
  VoteBook votes_;
  AcceptBook accepts_;
  DayClock clock_;
  std::unique_ptr<ReputationPolicy> policy_;
  Ledger ledger_;
  AnswerLister lister_;
  PostRemover remover_;
};
