# Editorial: Text editor with undo and redo

## Requirements
Functional: one document with a cursor; insert at the cursor, Backspace, Delete, move the cursor; undo and redo that restore the text and the cursor; a limit on how much history is kept; grouped edits; merged typing.

Hidden in the brief and revealed by good questions: the cursor sits between characters and ends after inserted text; Backspace clamps at the start and leaves the cursor at the start of the deleted text, Delete clamps at the end and does not move the cursor; a call that changes nothing records nothing; undo restores the text and the exact cursor from before the step, redo the cursor from after it; any new edit discards redo, but moving the cursor does not; at most 100 steps are kept, counted as steps and not characters.

**Change Storm 1, undo groups:** `beginGroup` and `endGroup`, nested, give one step for many edits. Undo and redo are refused while a group is open, the first edit inside discards redo, an empty group records nothing, and a group is one step for the limit.

**Change Storm 2, typing runs:** `makeTypingEditor()` merges consecutive single-character inserts into one step until a space or newline has been added. Any other call ends the run, including calls that changed nothing; a paste is never part of a run; inside a group nothing merges.

## Reference design
- `EditorImpl` is the facade. It turns each call into a command, applies it to the buffer and hands it to the recorder. It decides which calls end a typing run and nothing else about history.
- `TextBuffer` owns the text and the cursor and offers only primitive changes (`insertAt`, `eraseAt`, `setCursor`). It has no idea what undo is.
- `Command` is the Command pattern: `apply` and `revert`, each leaving the cursor where that direction should. `InsertCommand` and `EraseCommand` hold exactly what they need to undo themselves (the position, the removed text, the cursor before and after).
- `MacroCommand` is a Composite of commands: applied in order, reverted in reverse.
- `History` owns the undo and redo stacks, the 100-step limit and the rule that a recorded edit discards redo. It never sees text.
- `GroupRecorder` stands between the editor and the history: outside a group edits go straight through, inside one they are collected into a `MacroCommand` that becomes a step when the outermost group ends.
- `MergePolicy` is a Strategy for "may this edit join the open step?": `NeverMerge` for the base editor and `TypingRuns` for storm 2. The command does the joining (`absorb`) and offers itself as typing only when it was made of single keystrokes.

**Storm 1 in the reference:** `MacroCommand` and `GroupRecorder` are new, plus three methods on the facade. The history and the buffer are untouched, because a step could always have been any `Command`.

**Storm 2 in the reference:** `TypingRuns` and `Command::absorb` are new. The history gained one flag (is the top step still open) that every other call clears; without it, undo and redo would merge the next keystroke into the step underneath.

## Alternatives
- **Snapshot (Memento) per step.** Store the whole text and cursor before each change. Easiest to get right and makes cursor restoration free. Costs the document per step: fine for a text field, 100 MB for a 1 MB file with a full history. The hidden random test uses exactly this design as its model.
- **Command with an inverse, as here.** Costs one small object per step and an inverse per kind of edit. Undo cost follows the size of the edit, not the document. The standard answer for an editor.
- **Diff-based history.** Store a patch of the text between states. Compact and generic but needs a diff, and it cannot say which edits were one keystroke; good for coarse autosave history, poor for word-level undo.
- **A single stack with a pointer (undo and redo as moves of an index).** Elegant and equal in behaviour. Discarding redo becomes truncating the list at the pointer. A `std::vector` with an index works; the cap then needs a rotating start.
- **A `switch` on an edit type inside the editor.** Every new edit (grouping, merging, replace-all) edits the switch. The Command object is what lets the two storms be additions.
- **Command per keystroke with a time window for merging.** What many editors do ("merge if within 500 ms"). It needs a clock and makes behaviour untestable without one; the rule here is purely structural.
- **Undo as one stack and redo recomputed.** Redo cannot be recomputed after undo without storing the step, so it is stored.

## Trade-offs
Recording the cursor in every command makes undo exact and puts a little knowledge in each command; keeping it only in the history would be tidier and wrong, because Backspace and Delete disagree about where the cursor ends.

Merging typing makes undo feel like a person (word at a time) and costs a rule that must be written down precisely, because a user can see every detail of it: what ends a run, whether a failed move does, whether a paste can join. Time-based merging is easier to write and impossible to test deterministically.

Dropping the oldest step at 100 bounds memory and loses the ability to undo that far back; the honest alternative is a byte budget per history, which handles a single huge step better than a step count.

Positions here are bytes of a string; production editors use a rope or a piece table so that inserting in the middle of a 50 MB file is not a memmove, and positions are in characters or grapheme clusters.

## What breaks at 10x
A 10 MB document with an array-backed string makes every insert a memmove: use a gap buffer (insert near the cursor is O(1) amortised) or a piece table (edits append to a buffer and splice a list of pieces; undo is restoring piece lists). Commands then hold piece references instead of copied text. A paste of 5,000 lines is one step holding the pasted text: bound memory by bytes, not by steps. Typing speed is not the issue; a find-and-replace-all of 100,000 matches as one group is: collecting 100,000 small commands should become one command holding a compact edit list. With several users editing, a global stack is wrong: each author needs their own history whose inverses are transformed against concurrent operations, which is the operational-transformation or CRDT problem.

## Level signals
- **SDE2:** applies and reverts edits correctly, restores the cursor, clears redo on a new edit, clamps deletes, records nothing for no-ops, enforces the limit.
- **Senior:** models a step as a Command (or justifies snapshots and says what they cost); keeps history ignorant of text and the buffer ignorant of history; adds groups as a Composite without touching the history; states the merge rule exactly (what ends a run) and puts it behind an interface; compares against a snapshot model in a test.
- **Staff:** talks about gap buffers and piece tables, memory budgets per step, autosave and crash recovery from the history, and per-author undo with transformed inverses in a collaborative editor; says what they would measure (memory per step, undo latency on a large document) and what they would not build yet.
