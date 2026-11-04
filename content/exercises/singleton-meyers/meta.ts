import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "singleton-meyers",
  title: "Meyers singleton, injected where it is used",
  concepts: ["singleton", "meyers singleton", "deleted copy and move", "dependency injection", "testability"],
  hints: [
    "Two jobs: make exactly one `IdGenerator` possible, and keep `OrderService` from depending on that fact. The second job is just a constructor parameter of type `IdSource&`.",
    "`static IdGenerator& instance() { static IdGenerator g; return g; }` with a private default constructor and `= delete` for copy and move. Return a reference, never a value.",
    "`OrderService` stores `IdSource& ids_` and builds `\"ORD-\" + std::to_string(ids_.next()) + \":\" + item`. Only the code that wires the app calls `IdGenerator::instance()`.",
  ],
  wrong: [
    { dir: "copyable", failingTests: ["Singleton.CannotBeCopiedOrCreated"], reason: "Leaves copy construction available, so `auto g = IdGenerator::instance();` silently makes a second counter that restarts at 1." },
    { dir: "leaky_new", failingTests: ["Singleton.SameObjectEveryTime"], reason: "Returns `*new IdGenerator` on each call: a different object (and a leak) every time, so there is no singleton at all." },
    { dir: "service_uses_global", failingTests: ["OrderService.UsesTheInjectedSource"], reason: "Ignores the injected source and calls `IdGenerator::instance()` inside `place`: a hidden dependency, so the service cannot be tested with known numbers." },
  ],
};
