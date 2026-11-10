#pragma once
#include <cstddef>
#include <string>

// The receiver: a plain text buffer that knows nothing about undo.
class TextBuffer {
 public:
  const std::string& text() const { return text_; }
  void append(const std::string& s) { text_ += s; }
  // Removes up to n characters from the end and returns the characters removed (possibly fewer than n).
  std::string eraseLast(std::size_t n) {
    const std::size_t count = n < text_.size() ? n : text_.size();
    std::string removed = text_.substr(text_.size() - count);
    text_.erase(text_.size() - count);
    return removed;
  }

 private:
  std::string text_;
};

// A request turned into an object so it can be stored, undone and redone.
class Command {
 public:
  virtual ~Command() = default;
  virtual void execute() = 0;
  virtual void undo() = 0;
};
