#pragma once
#include <cstddef>
#include <deque>
#include <memory>
#include <utility>
#include <vector>

#include "command.h"
#include "merge_policy.h"

// The undo and redo stacks. It owns the commands and the step limit and knows nothing about text.
class History {
 public:
  History(std::size_t maxSteps, std::unique_ptr<MergePolicy> policy) : maxSteps_(maxSteps), policy_(std::move(policy)) {}

  // Records a change that has already been applied. A new edit discards what could have been redone.
  void record(std::unique_ptr<Command> done) {
    redo_.clear();
    if (open_ && !undo_.empty() && policy_->joins(*undo_.back(), *done) && undo_.back()->absorb(*done)) return;
    undo_.push_back(std::move(done));
    if (undo_.size() > maxSteps_) undo_.pop_front();
    open_ = true;
  }

  void discardRedo() { redo_.clear(); }

  // Ends the open run: the next edit starts a new step even if the policy would have joined it.
  void seal() { open_ = false; }

  bool undo(TextBuffer& buffer) {
    if (undo_.empty()) return false;
    undo_.back()->revert(buffer);
    redo_.push_back(std::move(undo_.back()));
    undo_.pop_back();
    return true;
  }

  bool redo(TextBuffer& buffer) {
    if (redo_.empty()) return false;
    redo_.back()->apply(buffer);
    undo_.push_back(std::move(redo_.back()));
    redo_.pop_back();
    return true;
  }

  std::size_t undoSteps() const { return undo_.size(); }
  std::size_t redoSteps() const { return redo_.size(); }

 private:
  std::size_t maxSteps_;
  std::unique_ptr<MergePolicy> policy_;
  std::deque<std::unique_ptr<Command>> undo_;
  std::vector<std::unique_ptr<Command>> redo_;
  bool open_ = false;
};
