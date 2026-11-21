#include <algorithm>
#include <functional>
#include <map>
#include <memory>
#include <set>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

enum class PostKind { Question, Answer };

// One live question or answer: plain data. `parent` is the question an answer belongs to, empty for a question.
struct Post {
  std::string id;
  PostKind kind = PostKind::Question;
  std::string author;
  std::string parent;
  int sequence = 0;  // creation order, never reused
};



// The live posts, keyed by id. It knows nothing about votes or reputation.
class PostBoard {
 public:
  bool contains(const std::string& id) const { return posts_.count(id) != 0; }

  const Post* find(const std::string& id) const {
    const auto it = posts_.find(id);
    return it == posts_.end() ? nullptr : &it->second;
  }

  void addQuestion(const std::string& id, const std::string& author) {
    posts_[id] = Post{id, PostKind::Question, author, "", nextSequence_++};
  }

  void addAnswer(const std::string& id, const std::string& question, const std::string& author) {
    posts_[id] = Post{id, PostKind::Answer, author, question, nextSequence_++};
  }

  void erase(const std::string& id) { posts_.erase(id); }

  // The live answers of a question, oldest first.
  std::vector<const Post*> answersOf(const std::string& question) const {
    std::vector<const Post*> found;
    for (const auto& entry : posts_) {
      if (entry.second.kind == PostKind::Answer && entry.second.parent == question) found.push_back(&entry.second);
    }
    sortOldestFirst(found);
    return found;
  }

 private:
  static void sortOldestFirst(std::vector<const Post*>& posts) {
    for (std::size_t i = 1; i < posts.size(); ++i) {
      for (std::size_t j = i; j > 0 && posts[j]->sequence < posts[j - 1]->sequence; --j) std::swap(posts[j], posts[j - 1]);
    }
  }

  std::map<std::string, Post> posts_;
  int nextSequence_ = 0;
};


constexpr std::size_t kMaxNameLength = 32;

// Names of users and ids of posts share one rule: 1 to 32 characters.
inline bool isValidName(const std::string& name) { return !name.empty() && name.size() <= kMaxNameLength; }

class UserDirectory {
 public:
  bool contains(const std::string& name) const { return names_.count(name) != 0; }
  void add(const std::string& name) { names_.insert(name); }

 private:
  std::set<std::string> names_;
};


// One voter's vote on one post, and the day it was cast.
struct Vote {
  std::string voter;
  std::string post;
  bool up = true;
  int day = 0;
};

// Every vote that currently stands: at most one per voter per post.
class VoteBook {
 public:
  const Vote* find(const std::string& post, const std::string& voter) const {
    const auto byPost = votes_.find(post);
    if (byPost == votes_.end()) return nullptr;
    const auto it = byPost->second.find(voter);
    return it == byPost->second.end() ? nullptr : &it->second;
  }

  void put(const Vote& vote) { votes_[vote.post][vote.voter] = vote; }

  void erase(const std::string& post, const std::string& voter) {
    const auto byPost = votes_.find(post);
    if (byPost != votes_.end()) byPost->second.erase(voter);
  }

  void eraseAllOn(const std::string& post) { votes_.erase(post); }

  int score(const std::string& post) const {
    const auto byPost = votes_.find(post);
    if (byPost == votes_.end()) return 0;
    int total = 0;
    for (const auto& entry : byPost->second) total += entry.second.up ? 1 : -1;
    return total;
  }

  void forEach(const std::function<void(const Vote&)>& visit) const {
    for (const auto& byPost : votes_) {
      for (const auto& entry : byPost.second) visit(entry.second);
    }
  }

 private:
  std::map<std::string, std::map<std::string, Vote>> votes_;
};


// Which answer, if any, is accepted for each question.
class AcceptBook {
 public:
  std::string acceptedFor(const std::string& question) const {
    const auto it = accepted_.find(question);
    return it == accepted_.end() ? std::string() : it->second;
  }

  void accept(const std::string& question, const std::string& answer) { accepted_[question] = answer; }
  void clear(const std::string& question) { accepted_.erase(question); }

  void forEach(const std::function<void(const std::string& question, const std::string& answer)>& visit) const {
    for (const auto& entry : accepted_) visit(entry.first, entry.second);
  }

 private:
  std::map<std::string, std::string> accepted_;
};


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


// One thing that currently pays or charges a user: derived from the votes and acceptances that stand, never stored.
struct ReputationEvent {
  std::string user;
  int points = 0;
  int day = 0;         // the day of the vote behind it (0 for acceptances)
  bool capped = false; // upvote points are the ones a daily cap limits
};



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



// How events add up to points above the starting reputation (the floor is applied by the caller).
class ReputationPolicy {
 public:
  virtual ~ReputationPolicy() = default;
  virtual int pointsFrom(const std::vector<ReputationEvent>& events) const = 0;
};

class PlainPolicy : public ReputationPolicy {
 public:
  int pointsFrom(const std::vector<ReputationEvent>& events) const override {
    int total = 0;
    for (const ReputationEvent& event : events) total += event.points;
    return total;
  }
};

// Per day, the capped (upvote) points count at most `cap` together; everything else counts in full.
class DailyCapPolicy : public ReputationPolicy {
 public:
  explicit DailyCapPolicy(int cap) : cap_(cap) {}

  int pointsFrom(const std::vector<ReputationEvent>& events) const override {
    std::map<int, int> cappedByDay;
    int uncapped = 0;
    for (const ReputationEvent& event : events) {
      if (event.capped) {
        cappedByDay[event.day] += event.points;
      } else {
        uncapped += event.points;
      }
    }
    int total = uncapped;
    for (const auto& day : cappedByDay) total += day.second < cap_ ? day.second : cap_;
    return total;
  }

 private:
  int cap_;
};



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


// The site's current day: it only moves forward.
class DayClock {
 public:
  int today() const { return day_; }

  bool moveTo(int day) {
    if (day < day_ || day > qa::kMaxDay) return false;
    day_ = day;
    return true;
  }

 private:
  int day_ = 0;
};



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
    if (!users_.contains(user)) return 1;
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


std::unique_ptr<qa::Site> qa::makeSite() { return std::make_unique<SiteImpl>(std::make_unique<PlainPolicy>()); }

std::unique_ptr<qa::CappedSite> qa::makeCappedSite(int dailyCap) {
  if (dailyCap < 1) return nullptr;
  return std::make_unique<SiteImpl>(std::make_unique<DailyCapPolicy>(dailyCap));
}

std::unique_ptr<qa::ModeratedSite> qa::makeModeratedSite(int dailyCap) {
  if (dailyCap < 1) return nullptr;
  return std::make_unique<SiteImpl>(std::make_unique<DailyCapPolicy>(dailyCap));
}
