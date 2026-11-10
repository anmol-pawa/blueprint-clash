import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "command-undo",
  title: "Command: undo and redo for a text editor",
  concepts: ["command", "undo/redo", "memento-in-command", "two stacks", "ownership", "invariants"],
  hints: [
    "Two `std::vector<std::unique_ptr<Command>>` stacks: `done_` and `undone_`. `run` executes then pushes onto `done_` and clears `undone_`. `undo` moves the top of `done_` to `undone_` after calling its `undo()`; `redo` does the reverse with `execute()`.",
    "A command that destroys information must save it when it executes. `EraseCommand::execute` should store the string returned by `eraseLast(count)` in a member; `undo` appends that member back. Never assume `count` characters were removed.",
    "`undo()` and `redo()` check for an empty stack first and return `false` without touching the buffer. Check `std::unique_ptr` ownership: moving between stacks uses `std::move`, never a copy.",
  ],
  wrong: [
    { dir: "redo_not_cleared", failingTests: ["History.NewActionDiscardsTheRedoStack"], reason: "Keeps the redo stack after a fresh command: redo then replays an action from a future that no longer exists and corrupts the document." },
    { dir: "erase_restores_count", failingTests: ["Erase.UndoRestoresOnlyWhatWasRemoved"], reason: "Remembers the requested count instead of the removed text: erasing more than exists, then undoing, invents characters." },
    { dir: "erase_forgets_text", failingTests: ["Erase.UndoRestoresTheRemovedCharacters", "Erase.UndoRestoresOnlyWhatWasRemoved"], reason: "Undo of an erase appends a placeholder: the command stores that it erased, but not what." },
    { dir: "undo_loses_redo", failingTests: ["History.UndoThenRedoRestoresTheState"], reason: "Undo pops the command and throws it away, so redo has nothing to replay." },
    { dir: "undo_empty_crashes", failingTests: ["History.UndoAndRedoOnEmptyHistoryReturnFalse"], reason: "Pops from an empty stack without checking (undefined behaviour) instead of reporting false." },
    { dir: "append_undo_pops_one", failingTests: ["Append.UndoRemovesExactlyWhatWasAppended"], reason: "Undo removes a single character regardless of how long the appended text was." },
  ],
};
