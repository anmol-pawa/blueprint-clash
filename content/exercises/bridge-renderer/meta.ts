import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "bridge-renderer",
  title: "Bridge: shapes and renderers vary independently",
  concepts: ["bridge", "composition over inheritance", "two axes of change", "runtime backend switch", "interface-only dependency"],
  hints: [
    "Two things vary: shape kind and backend. Do not make a class per combination. Give every shape a `Renderer` it calls, and implement each backend once.",
    "Put the shared piece in a small base class that stores a pointer to the `Renderer` (a pointer, not a reference, so `setRenderer` can switch it). Shapes call only `line` and `circle`.",
    "`Drawing::useRenderer` must walk every shape and call `setRenderer`. A `Rectangle` is four `line` calls in the documented order; `move` has to shift the stored coordinates so later draws use them.",
  ],
  wrong: [
    { dir: "set_renderer_ignored", failingTests: ["Bridge.SwitchRendererAtRuntime", "Drawing.UseRendererRetargetsEveryShape"], reason: "setRenderer does nothing, so the backend is fixed at construction: the shape and backend are coupled again and the Bridge's runtime flexibility is lost." },
    { dir: "rectangle_open_outline", failingTests: ["Shapes.RectangleDrawsFourEdgesInOrder", "Bridge.SwitchRendererAtRuntime"], reason: "Rectangle draws only three edges, so the outline is open: a geometry bug that every backend inherits at once." },
    { dir: "move_ignored", failingTests: ["Shapes.MoveShiftsEveryCoordinate"], reason: "Circle::move forgets to update the stored position, so moved shapes draw where they used to be." },
    { dir: "retarget_first_only", failingTests: ["Drawing.UseRendererRetargetsEveryShape"], reason: "Drawing::useRenderer retargets only the first shape, leaving a diagram split across two backends." },
  ],
};
