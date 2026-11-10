#pragma once
#include <cstddef>
#include <string>
#include <utility>
#include <vector>

// TODO: Snapshot must hold text AND cursor, be creatable only by Editor (private constructor + friend),
// and expose no getters. History is the caretaker: a stack of snapshots, newest restored first.
class Editor {
 public:
  class Snapshot {
   private:
    friend class Editor;
    Snapshot() = default;
  };

  void type(const std::string&) {}
  void moveCursor(std::size_t) {}
  const std::string& text() const { return text_; }
  std::size_t cursor() const { return cursor_; }

  Snapshot save() const { return Snapshot(); }
  void restore(const Snapshot&) {}

 private:
  std::string text_;
  std::size_t cursor_ = 0;
};

class History {
 public:
  void push(Editor::Snapshot) {}
  bool undo(Editor&) { return false; }
  std::size_t size() const { return 0; }
};
