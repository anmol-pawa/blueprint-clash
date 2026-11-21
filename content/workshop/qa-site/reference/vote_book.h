#pragma once
#include <functional>
#include <map>
#include <string>

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
