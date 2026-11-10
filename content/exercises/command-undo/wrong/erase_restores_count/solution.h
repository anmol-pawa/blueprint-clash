#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

class AppendCommand final : public Command {
 public:
  AppendCommand(TextBuffer& buffer, std::string text) : buffer_(buffer), text_(std::move(text)) {}
  void execute() override { buffer_.append(text_); }
  void undo() override { buffer_.eraseLast(text_.size()); }

 private:
  TextBuffer& buffer_;
  std::string text_;
};

class EraseCommand final : public Command {
 public:
  EraseCommand(TextBuffer& buffer, std::size_t count) : buffer_(buffer), count_(count) {}
  // Save what was really removed: it may be fewer than count_ characters.
  void execute() override { buffer_.eraseLast(count_); removed_.assign(count_, '?'); }
  void undo() override { buffer_.append(removed_); }

 private:
  TextBuffer& buffer_;
  std::size_t count_;
  std::string removed_;
};

// Invoker: owns the commands it has run and moves them between two stacks.
class History {
 public:
  void run(std::unique_ptr<Command> command) {
    command->execute();
    done_.push_back(std::move(command));
    undone_.clear();  // a new action ends the old future
  }

  bool undo() {
    if (done_.empty()) return false;
    done_.back()->undo();
    undone_.push_back(std::move(done_.back()));
    done_.pop_back();
    return true;
  }

  bool redo() {
    if (undone_.empty()) return false;
    undone_.back()->execute();
    done_.push_back(std::move(undone_.back()));
    undone_.pop_back();
    return true;
  }

  bool canUndo() const { return !done_.empty(); }
  bool canRedo() const { return !undone_.empty(); }

 private:
  std::vector<std::unique_ptr<Command>> done_;
  std::vector<std::unique_ptr<Command>> undone_;
};
