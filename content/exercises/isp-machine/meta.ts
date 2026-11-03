import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "isp-machine",
  title: "Office machines: no client forced to depend on what it does not use",
  concepts: ["interface segregation", "multiple inheritance of interfaces", "depend on the narrowest role"],
  hints: [
    "Who is forced to carry a `scan` they cannot do? Let each class implement exactly the roles it really has.",
    "`BasicPrinter : Printer`; `AllInOne : Printer, Scanner`. Share the page maths in one small helper instead of copying it. `copyDocument` takes the two roles, not a machine.",
    "Pages: `static_cast<int>((text.size() + 9) / 10)`. `copyDocument(Scanner& from, Printer& to) { return to.print(from.scan()); }`.",
  ],
  wrong: [
    { dir: "fat_interface", failingTests: ["Roles.BasicPrinterIsNotAScanner"], reason: "BasicPrinter inherits Scanner too and returns an empty string from scan, so it advertises a capability it does not have (the fat-interface stub the principle warns about)." },
    { dir: "copy_needs_allinone", rejects: "compile", failingTests: [], reason: "copyDocument takes an AllInOne&, so a separate scanner and printer cannot be used: the client depends on a wider type than it needs." },
    { dir: "page_floor", failingTests: ["Print.RoundsPagesUp"], reason: "Rounds the page count down, so 11 characters take one page and the last characters are dropped." },
  ],
};
