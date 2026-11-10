import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "memento-editor",
  title: "Memento: undo without exposing the editor",
  concepts: ["memento", "encapsulation", "friend", "value semantics", "caretaker"],
  hints: [
    "The Snapshot must hold copies of the text and the cursor, and only `Editor` may build one: make the constructor private and declare `friend class Editor;` inside Snapshot.",
    "`save()` returns `Snapshot(text_, cursor_)` by value; `restore(s)` assigns `text_ = s.text_; cursor_ = s.cursor_;` (legal because Editor is a friend). History is just a `std::vector<Editor::Snapshot>` used as a stack.",
    "`type`: `text_.insert(cursor_, s); cursor_ += s.size();`. `moveCursor`: `cursor_ = std::min(pos, text_.size());`. `undo`: if empty return false; restore `stack_.back()`, `pop_back()`, return true. Do not give Snapshot a default constructor or any public getter.",
  ],
  wrong: [
    { dir: "snapshot_by_reference", failingTests: ["Snapshot.IsAValueNotAViewOfTheEditor"], reason: "The snapshot keeps a reference to the editor's live text instead of a copy, so it changes whenever the editor is edited and restoring it restores nothing." },
    { dir: "forgets_cursor", failingTests: ["Snapshot.RestoreBringsBackTextAndCursor", "History.UndoRestoresTheCursorToo"], reason: "Restores the text but leaves the cursor where it was: the caret jumps after every undo, the classic half-restored memento." },
    { dir: "public_constructor", failingTests: ["Snapshot.OnlyTheEditorCanMakeOne"], reason: "Snapshot's constructor is public, so any caretaker can forge a state the editor never had. The memento is only safe because nobody else can build one." },
    { dir: "undo_oldest_first", failingTests: ["History.UndoGoesBackNewestFirst"], reason: "Pops from the front of the history: undo jumps to the oldest state instead of the previous one." },
    { dir: "empty_undo_resets", failingTests: ["History.UndoOnEmptyHistoryChangesNothing"], reason: "Undo with an empty history wipes the editor back to a blank state while still reporting failure: data loss on a harmless extra keypress." },
    { dir: "types_at_the_end", failingTests: ["Editor.TypingInsertsAtTheCursorAndAdvancesIt"], reason: "type() always appends, ignoring the cursor, so the cursor a snapshot saves has no effect on what the user sees." },
  ],
};
