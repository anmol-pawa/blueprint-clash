#include <algorithm>
#include <cstddef>
#include <deque>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

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

// Where a run of typed characters started and what it holds so far.
struct TypedText {
  std::size_t position;
  std::string text;
};

// One undoable change. A Command knows how to apply itself and how to take itself back, including the cursor.
class Command {
 public:
  virtual ~Command() = default;
  virtual void apply(TextBuffer& buffer) const = 0;
  virtual void revert(TextBuffer& buffer) const = 0;

  // Typing support: a command that is a run of single-character inserts shows what it holds, and can take the next
  // keystroke into itself. The defaults say "not typing".
  virtual const TypedText* typedText() const { return nullptr; }
  virtual bool absorb(const Command& /*next*/) { return false; }
};

class InsertCommand : public Command {
 public:
  InsertCommand(std::size_t position, std::string added)
      : typed_{position, std::move(added)}, isRun_(typed_.text.size() == 1) {}

  void apply(TextBuffer& buffer) const override {
    buffer.insertAt(typed_.position, typed_.text);
    buffer.setCursor(typed_.position + typed_.text.size());
  }
  void revert(TextBuffer& buffer) const override {
    buffer.eraseAt(typed_.position, typed_.text.size());
    buffer.setCursor(typed_.position);
  }

  const TypedText* typedText() const override { return isRun_ ? &typed_ : nullptr; }
  bool absorb(const Command& next) override {
    const TypedText* more = next.typedText();
    if (!isRun_ || more == nullptr || more->position != typed_.position + typed_.text.size()) return false;
    typed_.text += more->text;
    return true;
  }

 private:
  TypedText typed_;
  bool isRun_;
};

// Removes text. `cursorBefore` and `cursorAfter` say where the cursor was and where it ends up, because Backspace and
// Delete leave it in different places and undo must put it back exactly.
class EraseCommand : public Command {
 public:
  EraseCommand(std::size_t position, std::string removed, std::size_t cursorBefore, std::size_t cursorAfter)
      : position_(position), removed_(std::move(removed)), cursorBefore_(cursorBefore), cursorAfter_(cursorAfter) {}

  void apply(TextBuffer& buffer) const override {
    buffer.eraseAt(position_, removed_.size());
    buffer.setCursor(cursorAfter_);
  }
  void revert(TextBuffer& buffer) const override {
    buffer.insertAt(position_, removed_);
    buffer.setCursor(cursorBefore_);
  }

 private:
  std::size_t position_;
  std::string removed_;
  std::size_t cursorBefore_;
  std::size_t cursorAfter_;
};

// A Composite: several commands that undo and redo as one.
class MacroCommand : public Command {
 public:
  void add(std::unique_ptr<Command> part) { parts_.push_back(std::move(part)); }
  bool empty() const { return parts_.empty(); }

  void apply(TextBuffer& buffer) const override {
    for (const auto& part : parts_) part->apply(buffer);
  }
  void revert(TextBuffer& buffer) const override {
    for (auto it = parts_.rbegin(); it != parts_.rend(); ++it) (*it)->revert(buffer);
  }

 private:
  std::vector<std::unique_ptr<Command>> parts_;
};

// Decides whether a new edit may join the step before it. A Strategy: the history asks and never looks at characters.
class MergePolicy {
 public:
  virtual ~MergePolicy() = default;
  virtual bool joins(const Command& open, const Command& next) const = 0;
};

class NeverMerge : public MergePolicy {
 public:
  bool joins(const Command& /*open*/, const Command& /*next*/) const override { return false; }
};

// Typing runs: single keystrokes join an open run until a space or a newline ends it (word-sized undo steps).
class TypingRuns : public MergePolicy {
 public:
  bool joins(const Command& open, const Command& next) const override {
    const TypedText* run = open.typedText();
    if (run == nullptr || next.typedText() == nullptr) return false;
    const char last = run->text.back();
    return last != ' ' && last != '\n';
  }
};

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

// Sits between the editor and the history. Outside a group an edit goes straight to the history; inside one it is
// collected into a MacroCommand that becomes a single step when the outermost group ends.
class GroupRecorder {
 public:
  explicit GroupRecorder(History& history) : history_(history) {}

  void begin() {
    history_.seal();
    ++depth_;
    if (pending_ == nullptr) pending_ = std::make_unique<MacroCommand>();
  }

  bool end() {
    if (depth_ == 0) return false;
    --depth_;
    if (depth_ == 0 && pending_ != nullptr) history_.record(std::move(pending_));
    return true;
  }

  std::size_t depth() const { return depth_; }

  void submit(std::unique_ptr<Command> done) {
    if (depth_ == 0) {
      history_.record(std::move(done));
      return;
    }
    if (pending_ == nullptr) {
      pending_ = std::make_unique<MacroCommand>();
      history_.discardRedo();
    }
    pending_->add(std::move(done));
  }

 private:
  History& history_;
  std::size_t depth_ = 0;
  std::unique_ptr<MacroCommand> pending_;
};

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

std::unique_ptr<edit::Editor> edit::makeEditor() { return std::make_unique<EditorImpl>(std::make_unique<NeverMerge>()); }

std::unique_ptr<edit::GroupingEditor> edit::makeGroupingEditor() {
  return std::make_unique<EditorImpl>(std::make_unique<NeverMerge>());
}

std::unique_ptr<edit::GroupingEditor> edit::makeTypingEditor() {
  return std::make_unique<EditorImpl>(std::make_unique<TypingRuns>());
}
