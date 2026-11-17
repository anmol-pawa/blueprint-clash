#pragma once
// Public API for the Text editor problem. The hidden tests only use what is declared here.
// You implement edit::makeEditor() (in any of your .cpp files); everything behind it is your design.
#include <cstddef>
#include <memory>
#include <string>

namespace edit {

constexpr std::size_t kMaxUndoSteps = 100;  // the undo history keeps at most this many steps; the oldest is dropped

// A one-document text editor with a cursor. The document starts empty with the cursor at 0. Positions count bytes
// from the start of the text; the cursor sits between characters, so it is always in 0..text().size().
class Editor {
 public:
  virtual ~Editor() = default;

  // Inserts `text` at the cursor and leaves the cursor just after it. Returns false and records nothing for "".
  virtual bool insert(const std::string& text) = 0;

  // Deletes up to `count` characters before the cursor (the Backspace key) and returns how many were deleted:
  // min(count, cursor). The cursor ends where the deleted text started. Returns 0 and records nothing when nothing
  // was deleted.
  virtual std::size_t backspace(std::size_t count) = 0;

  // Deletes up to `count` characters after the cursor (the Delete key) and returns how many were deleted:
  // min(count, size - cursor). The cursor does not move. Returns 0 and records nothing when nothing was deleted.
  virtual std::size_t deleteAhead(std::size_t count) = 0;

  // Moves the cursor. Returns false (and does not move it) when position > text().size(). Moving is not an edit: it
  // is never undone and never clears the redo history.
  virtual bool moveTo(std::size_t position) = 0;

  // Takes back the most recent step that has not been taken back: the text and the cursor return to exactly what they
  // were before that step. Returns false when there is nothing to undo.
  virtual bool undo() = 0;

  // Applies again the step most recently taken back: the text and cursor are what they were right after that step.
  // Returns false when there is nothing to redo. Any new edit (an insert or delete that changed the text) discards
  // everything that could have been redone.
  virtual bool redo() = 0;

  virtual std::string text() const = 0;
  virtual std::size_t cursor() const = 0;
  virtual std::size_t undoSteps() const = 0;  // how many undo() calls would succeed in a row
  virtual std::size_t redoSteps() const = 0;  // how many redo() calls would succeed in a row
};

// Each insert, backspace or delete that changed the text is one undo step. Once more than kMaxUndoSteps steps have
// been recorded the oldest ones are forgotten (they can no longer be undone).
std::unique_ptr<Editor> makeEditor();

}  // namespace edit
