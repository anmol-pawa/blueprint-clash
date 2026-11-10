#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// TODO: append text; undo removes exactly that text.
class AppendCommand final : public Command {
 public:
  AppendCommand(TextBuffer& buffer, std::string text) : buffer_(buffer), text_(std::move(text)) {}
  void execute() override {}
  void undo() override {}

 private:
  TextBuffer& buffer_;
  std::string text_;
};

// TODO: erase up to count characters, remember exactly what was removed, restore it on undo.
class EraseCommand final : public Command {
 public:
  EraseCommand(TextBuffer& buffer, std::size_t count) : buffer_(buffer), count_(count) {}
  void execute() override {}
  void undo() override {}

 private:
  TextBuffer& buffer_;
  std::size_t count_;
};

// TODO: run/undo/redo with two stacks; a new run() clears the redo stack.
class History {
 public:
  void run(std::unique_ptr<Command>) {}
  bool undo() { return false; }
  bool redo() { return false; }
  bool canUndo() const { return false; }
  bool canRedo() const { return false; }
};
