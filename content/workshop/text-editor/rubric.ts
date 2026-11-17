import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, turns each key press into a recorded change and sequences the collaborators", phase: "base", owners: ["EditorImpl", "EditorState", "TextEditor", "EditorFacade", "Editor", "EditorService"] },
  { id: "res-buffer", text: "Owns the text and the cursor and offers only primitive changes, knowing nothing about history", phase: "base", owners: ["TextBuffer", "Document", "Buffer", "TextDocument", "TextModel"] },
  { id: "res-command", text: "Represents one change as an object that can apply itself and take itself back, including where the cursor goes each way", phase: "base", owners: ["Command", "EditCommand", "Edit", "UndoableCommand", "Action"] },
  { id: "res-history", text: "Keeps the undo and redo stacks, enforces the step limit and clears redo on a new edit, knowing nothing about text", phase: "base", owners: ["History", "UndoStack", "UndoManager", "CommandHistory", "HistoryStack"] },
  { id: "res-group", text: "Collects the edits made between begin and end into one composite step, with nesting", phase: "storm1", owners: ["MacroCommand", "GroupRecorder", "CompositeCommand", "CommandGroup", "Macro"] },
  { id: "res-merge", text: "Decides when a new edit joins the previous step, behind an interface so the base editor never merges", phase: "storm2", owners: ["MergePolicy", "Coalescer", "MergeStrategy", "TypingPolicy", "Merger"] },
];
