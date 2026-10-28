# ADR 0001: In-browser C++ toolchain is `@yowasp/clang`, built with `-fno-exceptions`

Status: accepted (2026-10-28). Spike code: `scripts/spike-clang.mjs`; production code: `lib/judge/toolchain.ts` (tested in `tests/toolchain.test.ts`).

## Context
LLD solutions are multi-file C++ projects judged by hidden behaviour tests. They must compile, link and run in the player's browser, offline, in a worker.
`algo-clash` has no judge yet, so there was nothing to copy.

## Decision
Use `@yowasp/clang` (LLVM/Clang/LLD 22.1 built to wasm, bundled with a wasm32-wasip1 libc++ sysroot). Compile each `.cpp` to an object, link with `wasm-ld` through the clang driver, run the module under WASI.
The clang command is injected into `buildProject`, so the same code runs in a worker, in Node tests and in `content:verify`.

## Measurements (Node 22, this cloud container, single thread; treat as relative, browser numbers come in A2c)
| Step | Time |
| --- | --- |
| Package size | 105 MB unpacked (`llvm.core.wasm` 75.5 MB, `llvm-resources.tar` 29.7 MB sysroot) |
| First compile in a process (loads and compiles the wasm) | about 5.8 s |
| Warm compile of one TU that includes `<map>`, `<vector>`, `<memory>` and `bp_test.h` | 3.9 s at -O1, 3.9 s at -O0, 3.4 s `-fsyntax-only` |
| Typical 3-TU project, compile all | about 11 s |
| Link (3 objects, libc++ and libc) | 0.25-0.35 s |
| Produced `a.wasm` | about 0.57-0.59 MB |
| Run the tests under WASI | 10-35 ms |

Header parsing dominates the compile, not codegen (-O0 is no faster). A precompiled header would help but the toolchain exposes no PCH-friendly path yet.

## Findings that constrain the design
1. **No C++ exceptions.** The sysroot's `libc++abi.a` has no `__cxa_throw`/`__cxa_allocate_exception`. Linking code compiled with exceptions fails with `undefined symbol: __cxa_throw`. The browser build uses `-fno-exceptions`, so `throw` is a compile error ("cannot use 'throw' with exceptions disabled").
   - Consequence for content: Workshop problems model errors with return values (`bool`, `std::optional`, `std::variant`, a `Result` type), which is also what Google-style C++ does. A problem that is *about* exceptions is taught with predict-behaviour cards, which compile natively.
   - `bp_test.h` has a no-exceptions mode: `ASSERT_*` and `FAIL` `return` from the test body (use them directly in the `TEST` body, not in helpers) and `EXPECT_THROWS` is a `static_assert`. Native builds (`content:verify`) keep exceptions; reference designs must therefore not throw, and `content:verify` (A3) must also compile every reference and bad design with `-fno-exceptions` to guarantee browser parity.
2. **argv must be non-empty.** wasi-libc `_start` exits with code 71 when `argc == 0`. Always pass `args: ["a.wasm"]`.
3. **Command signature:** `commands["clang++"](args, files, opts)`; do not include the program name in `args` (the README example is out of date).
4. **Full AST JSON is not viable.** `-Xclang -ast-dump=json` with `-ast-dump-filter=A` still produced 14.6 MB and took 35 s because the filter matches names in the standard library that contain the string. Senior Review (B7) must either use a tighter filter (qualified names of the user's classes), `-fsyntax-only` with a clang plugin-free approach, or a lightweight TypeScript declaration parser. Decide in B7 with a measurement.
5. **Nested paths work.** The yowasp filesystem accepts nested objects; `toTree` converts `src/a.cpp`.
6. **Diagnostics** from clang are `path:line:col: severity: message` and map straight through `parseDiagnostics` (root `""` because the virtual cwd is the project root).

## Consequences and open items for A2c
- Serving: `llvm.core.wasm` is 75.5 MB, under GitHub Pages' 100 MB per-file limit. The service worker must **not** precache it; cache it lazily (runtime cache) the first time the player opens a code screen, and show a one-time "downloading compiler (105 MB)" progress using the package's `fetchProgress` option.
- The browser has no `node:wasi`. A2c adds a small preview1 shim (candidate: `@bjorn3/browser_wasi_shim`, or ~150 lines of our own: `fd_write` to a buffer, `args_*`, `clock_time_get`, `proc_exit`, `random_get`).
- Latency: 3.9 s per TU is slow for a Run button. Mitigations to evaluate in A2c: compile TUs in parallel in a pool of workers, cache objects by content hash (the hidden driver and tests change rarely; only the player's TU recompiles), and keep headers light in `api.h`.
- Move `@yowasp/clang` from devDependencies to dependencies when A2c imports it from app code.
- Timeouts: wasm runs in a worker that is terminated after the limit (no preemption inside WASI).
