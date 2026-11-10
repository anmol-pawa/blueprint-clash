#pragma once
#include <algorithm>
#include <cstddef>
#include <string>
#include <utility>
#include <vector>

// The originator. Only it can create or open a Snapshot.
class Editor {
 public:
  // A sealed value: no getters, private constructor, so a caretaker can store it but never read or forge it.
  class Snapshot {
   private:
    friend class Editor;
    Snapshot(std::string text, std::size_t cursor) : text_(std::move(text)), cursor_(cursor) {}

    std::string text_;
    std::size_t cursor_;
  };

  void type(const std::string& s) {
    text_.insert(cursor_, s);
    cursor_ += s.size();
  }

  void moveCursor(std::size_t pos) { cursor_ = std::min(pos, text_.size()); }

  const std::string& text() const { return text_; }
  std::size_t cursor() const { return cursor_; }

  Snapshot save() const { return Snapshot(text_, cursor_); }

  void restore(const Snapshot& snapshot) {
    text_ = snapshot.text_;
    cursor_ = snapshot.cursor_;
  }

 private:
  std::string text_;
  std::size_t cursor_ = 0;
};

// The caretaker: stores snapshots, newest last, and never opens them.
class History {
 public:
  void push(Editor::Snapshot s) { stack_.push_back(std::move(s)); }

  bool undo(Editor& editor) {
    if (stack_.empty()) {
      return false;
    }
    editor.restore(stack_.back());
    stack_.pop_back();
    return true;
  }

  std::size_t size() const { return stack_.size(); }

 private:
  std::vector<Editor::Snapshot> stack_;
};
