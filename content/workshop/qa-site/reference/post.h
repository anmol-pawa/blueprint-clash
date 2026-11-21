#pragma once
#include <string>

enum class PostKind { Question, Answer };

// One live question or answer: plain data. `parent` is the question an answer belongs to, empty for a question.
struct Post {
  std::string id;
  PostKind kind = PostKind::Question;
  std::string author;
  std::string parent;
  int sequence = 0;  // creation order, never reused
};
