#pragma once
#include <cstddef>
#include <string>

// The document: the text and the cursor. It offers primitive changes only and knows nothing about undo.
class TextBuffer {
 public:
  const std::string& text() const { return text_; }
  std::size_t cursor() const { return cursor_; }
  std::size_t size() const { return text_.size(); }

  void insertAt(std::size_t position, const std::string& added) { text_.insert(position, added); }
  void eraseAt(std::size_t position, std::size_t length) { text_.erase(position, length); }
  void setCursor(std::size_t position) { cursor_ = position; }

 private:
  std::string text_;
  std::size_t cursor_ = 0;
};
