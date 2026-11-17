#pragma once
#include <algorithm>
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "group_recorder.h"
#include "history.h"
#include "text_buffer.h"

// What an editor is made of, and the read-only questions about it.
class EditorState : public edit::GroupingEditor {
 public:
  explicit EditorState(std::unique_ptr<MergePolicy> policy)
      : history_(edit::kMaxUndoSteps, std::move(policy)), groups_(history_) {}

  std::size_t openGroups() const override { return groups_.depth(); }
  std::string text() const override { return buffer_.text(); }
  std::size_t cursor() const override { return buffer_.cursor(); }
  std::size_t undoSteps() const override { return history_.undoSteps(); }
  std::size_t redoSteps() const override { return history_.redoSteps(); }

 protected:
  TextBuffer buffer_;
  History history_;
  GroupRecorder groups_;
};

// The facade: turns each key press into a command, applies it and hands it to the recorder.
class EditorImpl : public EditorState {
 public:
  using EditorState::EditorState;

  bool insert(const std::string& added) override {
    if (added.size() != 1) history_.seal();
    if (added.empty()) return false;
    perform(std::make_unique<InsertCommand>(buffer_.cursor(), added));
    return true;
  }

  std::size_t backspace(std::size_t count) override {
    history_.seal();
    const std::size_t cursor = buffer_.cursor();
    const std::size_t length = std::min(count, cursor);
    if (length == 0) return 0;
    const std::size_t start = cursor - length;
    perform(std::make_unique<EraseCommand>(start, buffer_.text().substr(start, length), cursor, start));
    return length;
  }

  std::size_t deleteAhead(std::size_t count) override {
    history_.seal();
    const std::size_t cursor = buffer_.cursor();
    const std::size_t length = std::min(count, buffer_.size() - cursor);
    if (length == 0) return 0;
    perform(std::make_unique<EraseCommand>(cursor, buffer_.text().substr(cursor, length), cursor, cursor));
    return length;
  }

  bool moveTo(std::size_t position) override {
    history_.seal();
    if (position > buffer_.size()) return false;
    buffer_.setCursor(position);
    return true;
  }

  bool undo() override {
    history_.seal();
    return groups_.depth() == 0 && history_.undo(buffer_);
  }

  bool redo() override {
    history_.seal();
    return groups_.depth() == 0 && history_.redo(buffer_);
  }

  bool beginGroup() override {
    groups_.begin();
    return true;
  }

  bool endGroup() override { return groups_.end(); }

 private:
  void perform(std::unique_ptr<Command> change) {
    change->apply(buffer_);
    groups_.submit(std::move(change));
  }
};
