import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "prototype-clone",
  title: "Prototype: copy a widget tree without knowing its types",
  concepts: ["prototype", "virtual clone", "deep copy", "unique_ptr ownership", "slicing"],
  hints: [
    "A copy constructor on the base class cannot know the derived type. Put the copy behind a virtual `clone()`; each concrete class creates its own type with `std::make_unique<Self>(*this)`.",
    "`Badge` inherits from `Label`, so it inherits `Label::clone()` too, and that would return a `Label`. Override `clone()` in `Badge`.",
    "A `Panel` owns `unique_ptr` children, so the compiler cannot copy it for you. Its `clone()` makes a new `Panel` and adds `child->clone()` for each child. `Palette::add` must store `prototype.clone()`, not the address you were handed.",
  ],
  wrong: [
    { dir: "shared_children", failingTests: ["Clone.PanelCopiesAreDeep", "Clone.NestedPanelsAreDeep"], reason: "Panel::clone copies the child pointers (children held by shared_ptr), so editing a clone's child changes the original: a shallow prototype." },
    { dir: "sliced_badge", failingTests: ["Clone.KeepsTheDynamicType", "Clone.ThroughTheBaseInterface"], reason: "Badge inherits Label::clone(), so a cloned Badge comes back as a plain Label: the classic forgotten override, silent because it compiles." },
    { dir: "stores_reference", failingTests: ["Palette.KeepsItsOwnSnapshot"], reason: "Palette keeps a pointer to the caller's object instead of its own copy, so later edits leak into every spawned widget (and the pointer dangles once the source dies)." },
  ],
};
