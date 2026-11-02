import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "widgets",
  title: "Panel: copying a polymorphic collection",
  concepts: ["virtual clone", "deep copy of owned polymorphic objects", "copy assignment", "slicing avoidance"],
  hints: [
    "A `vector<unique_ptr<Widget>>` cannot be copied by the compiler. What does a copy of a Panel have to do for each widget?",
    "You cannot write `new Widget(*w)` because Widget is abstract and the dynamic type is unknown. The widget itself knows how to copy: call `clone()`.",
    "Copy constructor: `for (const auto& w : o.items_) items_.push_back(w->clone());`. Copy assignment: build a temporary copy and swap it in, so assignment replaces the contents and is safe for `p = p`.",
  ],
  wrong: [
    { dir: "shallow_shared", failingTests: ["Copy.CopyIsIndependent", "Copy.AssignmentIsIndependent"], reason: "Stores shared_ptr and copies the pointers: editing a widget in the copy edits the original too." },
    { dir: "defaulted_copy", rejects: "compile", failingTests: [], reason: "`= default` copy of a vector<unique_ptr<Widget>> is deleted; the compiler rejects any program that copies a Panel." },
    { dir: "assign_appends", failingTests: ["Copy.AssignmentReplacesContents", "Copy.SelfAssignmentIsHarmless"], reason: "Copy assignment appends clones instead of replacing, and self-assignment doubles the panel." },
  ],
};
