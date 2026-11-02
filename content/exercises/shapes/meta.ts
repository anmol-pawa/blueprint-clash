import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "shapes",
  title: "Shapes: an interface that is safe to delete",
  concepts: ["abstract base class", "virtual destructor", "override", "deleting through a base pointer"],
  hints: [
    "What happens when a `unique_ptr<Shape>` holding a `Circle` is destroyed? Which destructor must run?",
    "An interface needs pure virtual functions for its behaviour and a *virtual* destructor, otherwise deleting through the base is undefined behaviour.",
    "`class Shape { public: virtual ~Shape() = default; virtual double area() const = 0; virtual std::string name() const = 0; };` then mark every override with `override`.",
  ],
  wrong: [
    { dir: "non_virtual_dtor", failingTests: ["Interface.DestructorIsVirtual", "Lifetime.DerivedDestructorRunsThroughBase"], reason: "The base destructor is not virtual: deleting a derived object through Shape* skips the derived destructor (undefined behaviour in the standard)." },
    { dir: "not_abstract", failingTests: ["Interface.ShapeIsAbstract"], reason: "Shape gives area() a default body, so it can be instantiated and a forgotten override silently returns 0." },
    { dir: "circle_integer_pi", failingTests: ["Area.Circle"], reason: "Uses an integer approximation of pi, so Circle::area is wrong for every radius." },
  ],
};
