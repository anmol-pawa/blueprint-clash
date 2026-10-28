# ADR 0001: In-browser C++ toolchain and judge constraints

Status: accepted, 2026-10-28 (A2b spike). Algo Clash had no judge to reuse, so this is measured from scratch.

## Decision
- Compile and link in a Web Worker with **`@yowasp/clang`** (clang/lld for wasm, libc++ for `wasm32-wasip1`), then run the resulting `.wasm` through a WASI shim, **one instantiation per test** (`a.wasm --only Suite.name`, enumerated with `--list`). Per-test instantiation gives isolation, a per-test timeout and crash attribution for free.
- Compile flags: `--target=wasm32-wasip1 -std=c++17 -O1 -fno-exceptions`.
- **The browser judge has no C++ exceptions.** Hidden problems and reference solutions must not depend on `throw`/`catch`; designs use `std::optional`, `std::variant`/result types or status enums for failures. `content:verify` compiles with `-fno-exceptions` too so native and browser behaviour match. `EXPECT_THROWS` is a compile error in that mode.
- Senior Review runs `-fsyntax-only -Xclang -ast-dump=json` with **`-ast-dump-filter=<UserClass>` per class**, never unfiltered.

## Measurements (Node 22, cloud container, cold = first call incl. loading ~105 MB of wasm)
| Step | Result |
|---|---|
| Compile + link 2 TUs + `bp_test.h` (libc++ `<memory>`, `<functional>`, `<sstream>`) | ~6.0 s cold, ~3.7 s warm, 574 KiB output |
| Run test binary (2 tests) | ~5 ms total; ~0.1 ms per instantiated single test |
| `-ast-dump=json` filtered to one class | ~2.4 s, 30 KB JSON |
| `-ast-dump=json` unfiltered (pulls in libc++ headers) | did not finish in 4 min, >2 GB RSS: unusable |

## Why no exceptions
`libc++abi.a` shipped in the package is built without exceptions: linking a program that throws fails with undefined `__cxa_allocate_exception` / `__cxa_throw`. With `-fwasm-exceptions` the link additionally needs `_Unwind_CallPersonality`, `__cpp_exception` and `__wasm_lpad_context`, i.e. a libunwind that is not shipped. Building our own libc++abi + libunwind for wasm EH is possible but is a large, owner-level maintenance cost (a custom wasi-sdk build), so it is deferred.

Consequences for content: LLD interview solutions in C++ often use exceptions, but many shops (Google style) forbid them, and returning errors explicitly is a legitimate design talking point. Briefs state "no exceptions: report failure through the API's return types". If this proves too limiting, revisit with a custom EH-enabled sysroot (new ADR).

## `bp_test.h` consequences
`ASSERT_*`/`FAIL` cannot unwind without exceptions: they emit the test's result line and `exit(3)`; the judge re-runs the remaining tests individually. Crashes (trap) and infinite loops (worker timeout) are attributed by the `begin` line as before.

## Alternatives considered
- Native judge service: rejected (static PWA on GitHub Pages, offline play, no server cost).
- Emscripten: no maintained npm distribution of the toolchain itself in-browser.

## Reproduce
`node scripts/spike/clang-wasm.mjs` and `node scripts/spike/ast-dump.mjs`.
