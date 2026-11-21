#pragma once
#include <map>
#include <string>
#include <vector>

#include "post.h"

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
