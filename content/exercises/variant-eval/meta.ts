import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "variant-eval",
  title: "Variant shapes: a closed set, visited exhaustively",
  concepts: ["std::variant", "std::visit", "overloaded lambdas", "closed vs open sets", "exhaustiveness"],
  hints: [
    "The set of shapes is closed and known here. Is a class hierarchy the only way to dispatch on the kind?",
    "`std::visit` with a visitor that handles every alternative fails to compile if you forget one. That compile-time check is the point.",
    "`std::visit(Overloaded{[](const Circle& c){...}, [](const Rect& r){...}, [](const Tri& t){...}}, shape)`. Triangle area is `base * height / 2`.",
  ],
  wrong: [
    { dir: "missing_alternative", failingTests: ["Area.Triangle", "Label.Triangle"], reason: "Uses a chain of get_if and falls through to 0 / \"unknown\" for the alternative it forgot: nothing warns about the missing case, unlike an exhaustive visit." },
    { dir: "triangle_no_half", failingTests: ["Area.Triangle", "Total.SumsAllShapes"], reason: "Forgets the factor of one half in the triangle area." },
    { dir: "total_skips_last", failingTests: ["Total.SumsAllShapes", "Total.SingleShape"], reason: "Off-by-one in the loop: the last shape is never added." },
  ],
};
