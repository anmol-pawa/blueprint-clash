import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "counter",
  title: "Counter: static members and copying",
  concepts: ["static data members", "inline static (C++17)", "copy constructor vs copy assignment", "object identity"],
  hints: [
    "`alive` and the next id are facts about the whole class: declare them `static`. In C++17, `static inline int x = 0;` needs no out-of-class definition.",
    "The compiler-generated copy constructor copies every member, including `id_`, and bypasses your constructor. What does that do to `alive()`?",
    "Write the copy constructor to take a fresh id and bump `alive_`; write copy assignment to copy only the value.",
  ],
  wrong: [
    { dir: "copy_not_counted", failingTests: ["Copy.IsANewObjectWithAFreshIdAndTheSameValue", "Copy.DestroyingACopyBalancesTheCount"], reason: "The default copy constructor copies the id and skips the constructor body, so copies share an id and the destructor decrements a count the copy never incremented." },
    { dir: "forgets_destructor", failingTests: ["Alive.TracksConstructionAndDestruction"], reason: "alive() only goes up: it counts creations, not live objects." },
    { dir: "assign_copies_id", failingTests: ["Assign.CopiesTheValueButKeepsTheId"], reason: "Assignment overwrote the identity. Value semantics copy the state that belongs to the value, not the object's identity." },
  ],
};
