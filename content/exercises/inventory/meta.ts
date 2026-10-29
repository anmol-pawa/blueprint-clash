import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "inventory",
  title: "Inventory: who owns the items?",
  concepts: ["unique_ptr", "ownership transfer", "non-owning views", "containers of owners"],
  hints: [
    "Decide the owner first. If the Inventory owns the items, what type should its map hold?",
    "A `unique_ptr` parameter by value means \"I take ownership\". `find` returns a plain pointer because it only lets the caller look.",
    "`take` must move the `unique_ptr` out of the map before erasing the entry; `try_emplace` lets `add` check for a duplicate without touching the item.",
  ],
  wrong: [
    { dir: "raw_pointers", failingTests: ["Ownership.RefusedItemIsFreedNotLeaked", "Ownership.DestroyingTheInventoryDestroysItsItems"], reason: "Releases the unique_ptr into a raw pointer map with no owner: every stored item leaks when the inventory dies." },
    { dir: "take_keeps_item", failingTests: ["Take.TransfersOwnershipToTheCaller"], reason: "take() hands out a copy and keeps the original: two objects for one logical item, and the inventory still lists it." },
    { dir: "duplicate_overwrites", failingTests: ["Add.RefusesNullAndDuplicates"], reason: "A duplicate silently replaces the stored item and reports success, destroying an object the caller thought was safe." },
  ],
};
