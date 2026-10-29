import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "stack",
  title: "Stack<T>: templates, copies and moves",
  concepts: ["class templates", "move semantics", "std::optional", "move-only types"],
  hints: [
    "Let a `std::vector<T>` hold the elements; the stack is just a discipline about which end you use.",
    "Two `push` overloads exist so an rvalue can be moved in while an lvalue is copied. The `T&&` overload must call `std::move`.",
    "`pop` should move the back element into a `std::optional<T>` *before* `pop_back` destroys it. A move-only `T` cannot be copied at all, which is how you can tell you got it right.",
  ],
  wrong: [
    { dir: "fifo", failingTests: ["Basics.IsLastInFirstOut", "Basics.PeekDoesNotRemove"], reason: "Takes from the front: a queue. LIFO is the whole contract of a stack." },
    { dir: "default_on_empty", failingTests: ["Basics.PopOnEmptyIsNullopt"], reason: "Returns a default-constructed T for an empty stack, so a caller cannot tell a real 0 from \"nothing there\"." },
    { dir: "copies_everything", failingTests: [], rejects: "compile", reason: "push(T) by value and pop copying out cannot compile for std::unique_ptr: the compiler proves the copies the design makes. (For copyable types it compiles but copies every element twice.)" },
  ],
};
