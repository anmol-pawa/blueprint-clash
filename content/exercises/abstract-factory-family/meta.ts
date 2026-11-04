import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "abstract-factory-family",
  title: "Widget families: products that must match",
  concepts: ["abstract factory", "product families", "program to the interface", "open for new families"],
  hints: [
    "Which two decisions must always agree? The button and the checkbox come from the same family. Put that choice in one object, so call sites cannot disagree.",
    "`LightFactory` and `DarkFactory` each return their own button and checkbox. `renderLogin` takes a `const WidgetFactory&` and calls `createCheckbox()` and `createButton()` on it, nothing else.",
    "Do not look at the concrete factory type inside `renderLogin` (no `dynamic_cast`, no family name compare). The test hands in a family you have never seen.",
  ],
  wrong: [
    { dir: "mixed_family", failingTests: ["Family.DarkRendersDarkWidgets", "Family.ProductsOfOneFactoryShareItsFamily"], reason: "DarkFactory builds its checkbox with the light class (a copy-paste slip), so a dark screen shows a light checkbox: the exact bug an abstract factory exists to make impossible to write in a screen." },
    { dir: "screen_switches", failingTests: ["Screen.WorksWithAFamilyItHasNeverSeen"], reason: "renderLogin type-switches on the concrete factory instead of using the interface, so it ignores any new family and every new family edits the screen (Open/Closed)." },
    { dir: "unknown_fallback", failingTests: ["Family.UnknownFamilyIsNull"], reason: "Silently returns the light family for a typo such as \"sepia\", hiding a configuration error instead of letting the caller handle a null." },
  ],
};
