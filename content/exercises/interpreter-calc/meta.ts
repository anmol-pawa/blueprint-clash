import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "interpreter-calc",
  title: "Interpreter: a calculator as a tree of rules",
  concepts: ["interpreter", "expression tree", "composite", "error as a value", "context object"],
  hints: [
    "One class per rule, all deriving from `Expr`. `Num` and `Var` are leaves; the four operators are nodes owning two `ExprPtr` children. A shared `BinaryExpr` base can hold the children and the evaluate-both-sides logic so each operator only supplies how to combine two numbers.",
    "Evaluate both children first. If either is `nullopt`, return `nullopt`; do not use `value_or(0)`, because that turns a missing variable into a wrong answer. `Var::eval` is just `context.lookup(name_)`, and it must not cache, because the same tree is evaluated under several contexts.",
    "`divide` returns `nullopt` when the right value is 0 and `l / r` otherwise. `show()` is `\"(\" + left->show() + \" \" + symbol + \" \" + right->show() + \")\"`. The factory functions `num`, `var`, `add`, `sub`, `mul`, `divide` just `make_unique` the right node.",
  ],
  wrong: [
    { dir: "unknown_is_zero", failingTests: ["Calc.UnknownVariableHasNoValue"], reason: "An unbound variable evaluates to 0, so a typo in a formula silently yields a plausible number." },
    { dir: "divide_by_zero_crashes", failingTests: ["Calc.DivisionByZeroHasNoValue"], reason: "Divides without checking, so a zero divisor crashes the whole process instead of producing no value." },
    { dir: "sub_swapped", failingTests: ["Calc.SubtractionKeepsOperandOrder"], reason: "Subtracts right minus left." },
    { dir: "errors_read_as_zero", failingTests: ["Calc.ErrorsPropagateThroughEveryParent", "Calc.UnknownVariableHasNoValue"], reason: "A parent treats a failed child as 0, so 5 + (1 / 0) becomes 5: errors are swallowed on the way up." },
    { dir: "show_without_parens", failingTests: ["Calc.ShowParenthesisesEveryBinaryNode"], reason: "Prints without parentheses, so two different trees (2 + 3) * 4 and 2 + 3 * 4 print identically and the output cannot be trusted." },
    { dir: "caches_first_context", failingTests: ["Calc.SameTreeReevaluatesUnderANewContext"], reason: "A variable caches its first lookup, so the tree is only correct for the first context it ever sees." },
  ],
};
