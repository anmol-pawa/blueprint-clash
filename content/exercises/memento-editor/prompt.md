An editor wants undo. The lazy way is to make `text_` and `cursor_` public so a history class can copy them out and write them back, but then anyone can read or forge the editor's internals. The **Memento** pattern keeps the encapsulation: the editor (the *originator*) packs its state into a sealed `Snapshot` only it can create or open, and a *caretaker* (`History`) stores snapshots without ever looking inside.

Write in `solution.h`:

- `class Editor` holding a text and a cursor (a position from `0` to `text().size()`, starting at `0`):
  - `void type(const std::string& s)` inserts `s` **at the cursor** and moves the cursor to just after it.
  - `void moveCursor(std::size_t pos)` sets the cursor, clamped to `text().size()`.
  - `const std::string& text() const` and `std::size_t cursor() const`.
  - `Snapshot save() const` captures text **and cursor**; `void restore(const Snapshot&)` puts both back. Restoring must not consume the snapshot: restoring the same one twice works.
- `Editor::Snapshot`, a nested class: **copyable, but not default-constructible and not constructible from outside**. Its constructor is private and `Editor` is its friend. It exposes no getters. A snapshot is a value: it must not change when the editor is edited after `save()`.
- `class History`, the caretaker:
  - `void push(Editor::Snapshot s)`.
  - `bool undo(Editor& editor)` pops the **newest** snapshot and restores it, returning `true`; with nothing stored it returns `false` and leaves the editor untouched.
  - `std::size_t size() const`.

The hidden tests check the construction rules at compile time with type traits, so an "easy" public constructor will be rejected.
