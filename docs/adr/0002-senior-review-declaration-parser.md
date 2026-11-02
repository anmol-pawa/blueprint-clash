# ADR 0002: Senior Review uses a declaration parser, not the clang JSON AST

Status: accepted. Date: 2026-11-02.

## Context
ARCH §2 planned to run `clang++ -fsyntax-only -Xclang -ast-dump=json` in the compile worker and parse it in TypeScript, with a fallback ("a lightweight in-TS parse of declarations") if the dump was too large or slow.

## Measurement
A 4-line file that includes `<memory>` produces a **226 MB** JSON dump with clang 18 (the dump contains every declaration from the standard headers). `-ast-dump-filter=<Name>` still dumps matching declarations from headers and does not shrink the include closure. In a browser worker, with the toolchain already holding ~100 MB of WASM, producing and parsing hundreds of MB of JSON per Submit is not viable. Review would also have to wait for the compile worker, which is busy judging.

## Decision
`lib/review/` has its own tokenizer and declaration-level parser (classes, bases, member functions with `virtual`/`override`/`const`/pure flags, fields with access and mutability, function extents, `new` expressions). It runs synchronously on the main thread in a few milliseconds, works on code that does not compile yet, and has no toolchain dependency. Rules read the model only, so the parser can be replaced by an AST-backed one later without touching them.

## Consequences
- It is an approximation: no name resolution or overload matching. `missing-override` matches by name, constness and parameter count; base classes are matched by simple name; macros are not expanded.
- Accuracy is guarded two ways: `tests/review.test.ts` cross-checks the model against clang's own JSON AST on a header-free fixture (classes, bases, methods and flags, field access), and every Workshop reference must pass the rules with no blocker or major (`content:verify`).
- Rules that need types (object slicing by value, `switch` on a type tag, `dynamic_cast` chains) are not in v1. They can be added to the parser (token patterns) or via a filtered clang dump of a stripped translation unit if a later spike makes that cheap.
