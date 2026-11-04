import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "composite-fs",
  title: "Composite: files and folders behind one interface",
  concepts: ["composite", "recursive delegation", "uniform interface", "ownership of children", "path resolution"],
  hints: [
    "Both `File` and `Directory` are a `Node`. The directory's answers to `size`, `fileCount` and `render` are built from its children's answers, so it never needs to ask whether a child is a file or a folder.",
    "`Directory::size` must add up `child->size()`, which for a nested folder is itself a sum. For `find`, split the path at the first `/`, pick the child by name and hand the *rest* of the path to that child.",
    "`add` has three refusal cases: null, an existing child name, and `child.get() == this`. A `File::find` answers `this` only for an empty path.",
  ],
  wrong: [
    { dir: "size_shallow", failingTests: ["Directory.SizeAndCountAreRecursive", "Directory.RenderIndentsNestedLevels"], reason: "Directory::size adds only direct files and skips nested folders, so totals are wrong the moment the tree is two levels deep: the recursion that defines a Composite is missing." },
    { dir: "find_shallow", failingTests: ["Directory.FindResolvesNestedPaths"], reason: "find looks only among direct children for the whole path, so a nested path such as src/util/a.h is never found." },
    { dir: "allows_duplicates", failingTests: ["Directory.RejectsDuplicatesNullAndItself"], reason: "add never checks existing names, so two children named a exist and find becomes ambiguous (first match wins silently)." },
    { dir: "file_find_any", failingTests: ["File.HasNothingBelowIt"], reason: "File::find returns itself for any path, so README/deeper resolves to README: a leaf pretends to be a container." },
  ],
};
