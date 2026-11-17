#pragma once
// Change Storm 1 adds undo groups ("macros"). Everything from api.h still holds.
#include "api.h"

namespace edit {

// An editor whose edits can be grouped so that one undo takes back all of them (a find-and-replace-all, a paste with
// reformatting, a refactoring).
class GroupingEditor : public Editor {
 public:
  // Starts a group. Groups nest: only the outermost group is a step; inner ones just join it. Always true.
  virtual bool beginGroup() = 0;

  // Ends the innermost open group. Returns false when no group is open. When the outermost group ends, the edits made
  // since it began become ONE step (applied in order by redo, taken back in reverse order by undo). A group in which
  // nothing changed the text records no step at all.
  virtual bool endGroup() = 0;

  // How many groups are open right now (0 when none).
  virtual std::size_t openGroups() const = 0;
};

// While any group is open: undo() and redo() return false and change nothing, undoSteps() counts only finished steps,
// and the first edit inside the group discards the redo history just like any other edit. Undoing a group puts the
// cursor where it was before the group's first edit; redoing it puts the cursor where the group's last edit left it.
// A finished group counts as one step against kMaxUndoSteps.
std::unique_ptr<GroupingEditor> makeGroupingEditor();

}  // namespace edit
