# ADR 0001: In-browser C++ judge toolchain

Status: accepted (2026-10-28). Spike: `scripts/judge-spike.mjs`. Algo Clash had no judge yet, so this is the original spike.

## Decision
Compile player code in a Web Worker with **`@yowasp/clang`** (Clang/LLD built for wasm, ships libc++ for wasm32-wasip1), run the produced `.wasm` under WASI in a second worker with a timeout, and parse the JSON lines that `bp_test.h` prints.

## Measured (Node 22, one core, `-std=c++20 -O1`, 3-file project with `<map>`, `<memory>`, `<iostream>`)
| Step | Time |
|---|---|
| Cold compile + link (includes toolchain instantiation) | 5.5–7 s |
| Warm compile + link (same process) | ~3.6 s |
| `-O0` warm | ~3.7 s (no gain; front end dominates) |
| Instantiate + run one test binary | 2–4 ms |
| Output size | ~590 KB wasm per build |

Toolchain download: `llvm.core.wasm` is 75 MB raw (≈23 MB gzip), plus a 30 MB resource tar (headers, libc++, sysroot). Cache it in the service worker after first use and make the judge an opt-in download, not part of the app shell. GitHub Pages serves gzip/br, so the transfer is roughly 35–40 MB once.

## Findings that shape the design
1. **No C++ exceptions.** The wasi libc++/libc++abi in the package has no `__cxa_throw`; `-fexceptions`, `-fwasm-exceptions` and sjlj all fail to link. So browser builds use `-fno-exceptions`. Consequences:
   - `bp_test.h` ASSERT/FAIL cannot unwind. In a no-exceptions build they report the test and `_Exit(3)`; the host runs **one test per instance** (`a.wasm =Suite.Name`, list with `--list`). Instantiation costs ~3 ms, so this is cheap and also isolates crashes and infinite loops per test.
   - `EXPECT_THROWS` is unavailable in the browser build. Workshop tests and reference designs use error returns (`std::optional`, status enums, `bool`), which is what most LLD interview solutions do anyway. Native `content:verify` should compile both ways so a test never silently depends on exceptions.
   - Player code that `throw`s will fail to compile in the browser. The editor must say so plainly (lesson: "this judge builds without exceptions").
2. **Threads.** WASI preview1 has no threads; `<thread>`/`<mutex>` compile and link but `std::thread` cannot run. Concurrency lessons (Phase C) need a deterministic cooperative simulation or a native-judged path; decide in the concurrency ADR before that content ships.
3. **Time limits** are enforced by the host (terminate the worker), not by wasm; a ~3 s compile is acceptable for a 90-minute mock but means the UI needs a visible compiling state and compile caching (hash of project files).

## Alternatives rejected
- **Server-side compile:** needs a backend and sandboxing; breaks the static PWA / offline goal.
- **Emscripten-built compiler (wasm-clang etc.):** unmaintained, no libc++ headers bundled.
- **Interpreting C++ (Cling, etc.):** not available for the web at usable size.

## Next
A2c: worker wiring and `/dev/judge` page; cache compiled output by project hash; stream compile progress.
