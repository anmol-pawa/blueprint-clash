# ADR 0001: Browser C++ toolchain (`@yowasp/clang`)

Status: accepted for the judge (A2b spike); two limits need owner decisions (below). Date: 2026-10-28.

## Context
LLD solutions are C++ that must be compiled and run in the browser against hidden behaviour tests (ARCH §2). Algo Clash has no judge yet to copy, so this spike evaluated `@yowasp/clang` (clang/lld built for wasm, libc++ for `wasm32-wasip1`).

## Measurements (Node 22, this CI-class container, `scripts/spikes/clang-wasm.mjs`)
| Item | Result |
| --- | --- |
| Package size | ~105 MB on disk (75.5 MB `llvm.core.wasm`, 29.7 MB sysroot tar, small extras) |
| Compile + link, 2 TUs + `bp_test.h` + libc++, `-O1` | cold ~5.4 s, warm ~3.5 s |
| Output | ~586 KB `a.wasm`, run under WASI in ~3 ms |
| Standard headers | `<map> <unordered_map> <memory> <functional> <optional> <variant> <regex> <random> <thread> <mutex> <atomic> <future> <shared_mutex> ...` all compile |

Numbers are from one machine, one run; browser numbers come in A2c.

## Findings that shape the design
1. **No C++ exception runtime.** `libc++abi.a` has no `__cxa_throw`/`__cxa_allocate_exception`; any `throw` fails to link. We must compile with `-fno-exceptions`. `bp_test.h` now builds either way (`BP_EXCEPTIONS`): `ASSERT_*` `return`s from the test body instead of throwing, and `EXPECT_THROWS` reports a clear failure. `judgeNative({noExceptions:true})` mirrors the browser in tests.
2. **No threads.** `<thread>` compiles and links, but `std::thread` aborts at run time (`system_error` in no-exceptions mode). Concurrency problems (producer/consumer, thread pool, rate limiter with locks) cannot run real threads in this sysroot.
3. **WASI needs a non-empty argv:** run with `args: ["a.wasm"]`, otherwise the program exits 71 before `main`.
4. The package is built for Node; the ~105 MB download needs lazy loading and a persistent cache (service worker / IndexedDB). Browser feasibility is the A2c job.

## Decision
Use `@yowasp/clang` in a Web Worker with `-std=c++17/20 -fno-exceptions`. Keep native g++ as the `content:verify` oracle but also run the reference through the `-fno-exceptions` build so content never depends on exceptions.

## Consequences and open decisions (NEEDS OWNER APPROVAL)
- LLD problems that expect exceptions (typical interview style: `throw std::invalid_argument`) must use error returns (`bool`, `std::optional`, error enums) in the Workshop; the editorial should say that is a deliberate trade-off, and note that `Result`/`optional` APIs are also common in big-tech C++ (Google style bans exceptions).
- Concurrency: options are (a) a deterministic cooperative "thread" shim in `bp_test.h`/`api.h` with scheduled interleavings (teaches races reproducibly, but is not real `std::thread`), (b) custom-built wasm sysroot with wasi-threads (large build effort), (c) run concurrency tests natively only and offer them as read-and-reason cards in the browser. Recommended: (a) for the Workshop plus (c) for predict-behaviour cards.

## Browser measurements (A2c, Chromium headless, desktop and iPhone 14 emulation)
- Architecture: `scripts/copy-clang.mjs` copies the toolchain to `public/clang/` (git-ignored; run by `predev`/`prebuild`/`prebuild:pages`). A persistent compile worker loads `clang/bundle.js` at runtime (outside the bundler); each run gets a disposable worker with a hand-written WASI host (`lib/judge/browser/wasi.ts`) so a timeout is just `terminate()`.
- Cold compile+link of a 3-file project: ~9–10 s (includes toolchain load from localhost). Compile error path: <1 s. Test run: 3–8 ms. Infinite loop is killed at the timeout (verdict `time_limit`).
- The service worker does not precache `clang/` (~105 MB); it is cached on first judge use. `llvm.core.wasm` is 73 MB, under GitHub Pages' 100 MB file limit.
- The WASI host needs `clock_time_get` (std::chrono in `bp_test.h`); unknown WASI imports answer ENOSYS.
