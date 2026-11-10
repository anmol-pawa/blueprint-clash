An editor turns each user action into a **Command** object so that actions can be queued, logged and undone. `api.h` gives you the receiver (`TextBuffer`) and the `Command` interface. Write in `solution.h`:

- `AppendCommand(TextBuffer& buffer, std::string text)`: `execute` appends the text; `undo` removes exactly what it appended.
- `EraseCommand(TextBuffer& buffer, std::size_t count)`: `execute` removes up to `count` characters from the end and **remembers what was actually removed**; `undo` puts exactly those characters back. (Erasing 5 from a 3-character buffer removes 3, and undo restores 3.)
- `History`: owns executed commands.
  - `void run(std::unique_ptr<Command> command)` executes the command and records it. Running a new command **discards the redo stack**: after an undo, a fresh action ends the old future.
  - `bool undo()` / `bool redo()` return `false` (and do nothing) when there is nothing to undo / redo, otherwise move one command between the stacks and return `true`.
  - `bool canUndo() const` / `bool canRedo() const`.

A command is executed exactly once per `run`; `redo` re-executes the same object, so commands must be repeatable after an `undo`.
