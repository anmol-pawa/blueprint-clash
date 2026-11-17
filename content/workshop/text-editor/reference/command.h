#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "text_buffer.h"

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
