import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "template-report",
  title: "Template Method: a report skeleton with hooks",
  concepts: ["template method", "non-virtual interface", "hook", "private virtual", "inversion of control"],
  hints: [
    "The base class owns the algorithm: `generate()` is public, non-virtual and const, and calls the steps in a fixed order. Subclasses supply steps; they never supply the order.",
    "Make the steps private virtuals. A derived class may override a private virtual, and callers cannot bypass `generate()`. Give `footer()` a default body (that is the hook) and leave `title()` and `rows()` pure.",
    "Call `rows()` once into a local `const std::vector<std::string> lines`, then use it both for the emptiness check and the loop. Build the string as heading, rows (or the placeholder), then `out += footer();`.",
  ],
  wrong: [
    { dir: "rows_called_twice", failingTests: ["Report.StepsRunInOrderAndRowsOnlyOnce"], reason: "Calls the expensive rows() step once to test for emptiness and again to print: correct output, double the cost, and a subclass with side effects breaks." },
    { dir: "footer_before_rows", failingTests: ["Report.StepsRunInOrderAndRowsOnlyOnce", "Report.FooterHookIsAppendedAfterTheRows"], reason: "Emits the footer before the rows: the template's whole value is a fixed step order, and here it is wrong." },
    { dir: "footer_never_called", failingTests: ["Report.FooterHookIsAppendedAfterTheRows", "Report.StepsRunInOrderAndRowsOnlyOnce"], reason: "Forgets the hook, so subclass footers are silently ignored (the copy-paste bug the pattern exists to prevent)." },
    { dir: "no_placeholder", failingTests: ["Report.NoRowsPrintsAPlaceholder"], reason: "An empty report prints only the heading; the empty case was never written into the skeleton." },
    { dir: "footer_pure", failingTests: [], rejects: "compile", reason: "Makes the footer a pure virtual, so every subclass must override it: the hook stops being optional and the plain reports no longer compile." },
    { dir: "generate_not_const", failingTests: [], rejects: "compile", reason: "generate() is not const, so a report held through a const pointer or reference cannot be generated." },
  ],
};
