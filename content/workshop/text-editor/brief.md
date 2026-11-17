# Text editor with undo and redo

You are writing the core of a small text editor: a document, a cursor, and the keys that change them. Users type, delete, move around and press Ctrl+Z, and they are not forgiving: if undo puts the cursor somewhere strange or loses a character, they notice at once. Typing a long sentence and pressing undo should not feel like a bug either.

What you know so far:

- There is one document, and a cursor that sits between characters.
- You can insert text at the cursor, delete before it (Backspace) and after it (Delete), and move the cursor.
- Undo and redo work on what the user did, not on the whole document at once.

Your task: design and implement it behind the `edit::Editor` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what exactly does undo restore, and what does a new edit do to redo?" is where most first drafts go wrong. Expect grouped edits (one undo for a find-and-replace) and merged typing (one undo per word) to be asked for after you have finished.
