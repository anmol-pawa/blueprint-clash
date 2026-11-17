#pragma once
// Change Storm 2 merges typing into word-sized undo steps. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace edit {

// Like makeGroupingEditor, but consecutive single-character inserts are typing and share one undo step:
//  - A single-character insert joins the previous step when that step is a typing run (made of single-character
//    inserts) that is still open. Otherwise it starts a new step, which is itself a typing run.
//  - A run ends after a ' ' or '\n' has been added to it: the next character starts a new step.
//  - Any call other than a single-character insert ends the open run, whether or not it changed anything: a delete,
//    moveTo (even to where the cursor already is), undo, redo, beginGroup, an insert of more than one character, or
//    insert(""). Queries (text, cursor, undoSteps, redoSteps, openGroups) do not.
//  - A multi-character insert is never part of a run.
//  - Inside an open group typing does not merge with anything: the group is the step.
// So "hello world" typed one key at a time is two steps ("hello " and "world"), and one undo removes "world".
std::unique_ptr<GroupingEditor> makeTypingEditor();

}  // namespace edit
