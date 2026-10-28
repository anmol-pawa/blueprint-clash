# ADR 0001: Browser C++ toolchain (`@yowasp/clang`)

Status: accepted with one open risk (exceptions). Date: 2026-10-28.

## Context
Players write multi-file C++ (headers + sources) that is compiled, linked and run against hidden behaviour tests in the browser. Algo Clash has no judge yet to copy, so this is a fresh spike of `@yowasp/clang` 22.0.0-git20542-10 (LLVM/Clang/LLD built for wasm, target `wasm32-wasip1`, ships libc++).

## Measurements (Node 22, 4 vCPU cloud VM; `scripts/toolchain-spike.mjs`)
Project: `shape.h`, `shape.cpp`, `tests.cpp` (`<memory> <vector> <map> <string> <iostream>`, `-std=c++20`).

| Case | Compile + link | Output | Run (200M-iteration loop) |
|---|---|---|---|
| Cold (first call, loads 73 MB core wasm) | about 7.9 s | 580 KB | about 0.7 s |
| Warm `-O0` / `-O1` / `-O2` | 5.2 / 5.8 / 5.1 s | 674 / 580 / 585 KB | about 0.7 s |

- Optimisation level barely changes compile time (front end and link dominate). Use `-O1` for tests so perf-flavoured tests behave sanely.
- Every `clang++` call re-instantiates the toolchain, so a project compile costs about 5 s here. Expect 1.5 to 2.5 times that in a mobile browser. The UI must show a progress state, and the worker must be kept alive between runs to reuse the compiled module.
- Download size: `llvm.core.wasm` 73 MB plus a 29 MB resource tar (libc++ headers and archives). Cache both in the service worker on first use; do not precache at install. GitHub Pages file limit is 100 MB, so the 73 MB file is under it but close.
- The bundle has a browser path (`fetch(new URL(..., import.meta.url))`) and only imports `node:fs/promises` for Node. Running the produced binary in a browser needs a WASI preview1 shim (Node's `node:wasi` is not available); that is A2c.

## Finding: C++ exceptions do not work
The shipped sysroot's libc++abi has no `__cxa_throw`, `__cxa_allocate_exception`, personality routine or libunwind. Verified:
- default flags: `throw` compiles but fails to link (`undefined symbol: __cxa_throw`);
- `-fwasm-exceptions -mexception-handling`: still unresolved (`__cxa_allocate_exception`, `__cpp_exception`, `__wasm_lpad_context`);
- `-fno-exceptions`: compiles only code with no `try`/`throw`.

This matters: error handling with exceptions is normal in LLD rounds, and `bp_test.h` uses `try`/`catch` (`EXPECT_THROWS`, per-test isolation).

## Decision
1. Use `@yowasp/clang` in a dedicated Web Worker as the browser compiler. No server compile.
2. Treat exceptions as the top toolchain risk and fix it in A2b2 before any content depends on it. Preferred route: ship a small in-repo wasm-EH runtime (`__cxa_allocate_exception`, `__cxa_throw`, `__cxa_begin_catch`, `__cxa_end_catch`, `__cpp_exception` tag, `__wasm_lpad_context`, `_Unwind_*` helpers, personality) compiled at build time with the same clang and linked in with `-fwasm-exceptions`. Fallback: restrict browser tests to a non-throwing subset (`-fno-exceptions`, status-code style) and run exception-based hidden tests only in `content:verify`; the editor then warns when user code uses `throw`.
3. Native g++ stays the source of truth for `content:verify`; the browser build must agree with it on every shipped test.

## Consequences
- Content that needs exceptions is blocked until A2b2 lands. Early lessons (classes, RAII, ownership) can proceed, but must avoid `throw`.
- First-run download is about 100 MB, so lessons that need no compile must work without it (offline-first for cards).
