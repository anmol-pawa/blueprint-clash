# Blueprint Clash progress

Append a dated entry after every run: what changed, how it was verified (commands, screenshot notes), known gaps, what's next. Newest at the bottom.

## 2026-10-28: Project seeded
- Added `CLAUDE.md`, `ROADMAP.md` (phases A–G), `docs/GAME_DESIGN.md`, `docs/CURRICULUM.md` and `docs/ARCHITECTURE.md`.
- The C++ judge should be ported from Algo Clash (`/home/user/algo-clash/lib/judge/`) once it exists. Otherwise spike `@yowasp/clang` (it ships libc++ for wasm32-wasip1).
- Next: ROADMAP A1.

## 2026-10-28: A1 scaffold
- Scaffolded from Query Clash: Next.js 16 / React 19 / Pixi 8 / CodeMirror 6 / Tailwind 4, PWA manifest + service worker generator (`scripts/gen-sw.mjs`, worker-fragment fix kept), `ci.yml` + `pages.yml` (basePath `/blueprint-clash`), original generated icons (`scripts/gen-icons.mjs`), blueprint-themed title screen with locked mode tiles, `lib/siteInfo.ts` + test. All Query/SQL/PGlite references removed.
- Verification: `npm run lint`, `typecheck`, `test` (2 pass), `build`, `build:pages` all pass. Playwright at 1280x800 and iPhone 14: no console errors, no horizontal overflow, text readable (screenshots viewed).
- CI and Pages deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Known gaps: title screen is static (no art yet, comes in B1); Start is disabled.
- Next: A2 (C++ judge; algo-clash has no judge yet, so toolchain spike + ADR).

## 2026-10-28: A2a judge core (bp_test.h, lib/judge, native runner)
- Split A2 into A2a/A2b/A2c (ROADMAP). algo-clash has no judge yet, so the browser toolchain is a spike in A2b.
- Added `lib/judge/cpp/bp_test.h` (TEST, EXPECT_/ASSERT_ macros, EXPECT_THROWS, JSON-lines output with `begin`/`result`/`summary`, so a crash is attributed to the running test) and pure `lib/judge/`: project model and path validation (read-only files protected), clang/gcc diagnostics mapped to project files, a result parser that ignores user `cout` noise, verdicts (accepted / wrong_behaviour / compile_error / runtime_error / time_limit), and `native.ts` (g++ runner for tests and the coming `content:verify`).
- Verification: `npm run lint`, `typecheck`, `test` (14 pass: accept, wrong value with file+line, compile error mapped to the player's file, crash attribution, infinite-loop kill, stdout noise), `build`, `build:pages` pass. Header also compiles warning-free with clang++ (the browser compiler). No UI change, so no screenshots.
- Committed on `main` per CLAUDE.md. CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the header is not yet exposed to the browser VFS (A2b); no AST dump yet (B7).
- Next: A2b, the `@yowasp/clang` worker spike with ADR 0001.

## 2026-10-28: A2b toolchain spike (ADR 0001)
- Spiked `@yowasp/clang` in Node: multi-file C++20 project compiles and links to wasm in ~3.6 s warm / 5.5-7 s cold, runs in 2-4 ms under WASI. Added it as a devDependency and `scripts/judge-spike.mjs`.
- **Key finding:** the wasi libc++ has no exceptions (`-fexceptions`/`-fwasm-exceptions` fail to link). `bp_test.h` now supports no-exceptions builds: ASSERT/FAIL report and `_Exit(3)`, the host runs one test per instance (`=Suite.Name`, `--list`); `EXPECT_THROWS` is compiled out there. `judgeNative` gained `noExceptions` and `runArgs`. Written up in `docs/adr/0001-cpp-judge-toolchain.md` (also notes threads are unavailable, so concurrency lessons need a decision).
- Verification: `npm run lint`, `typecheck`, `test` (16 pass, incl. 2 new no-exceptions tests), `build`, `build:pages` pass. No UI change, no screenshots.
- Committed on the designated branch `claude/funny-ramanujan-wyi2h9` (session instructions), not `main`. CI and deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: worker wiring, toolchain download/caching UX, Pages file-size check (llvm.core.wasm is 75 MB, under the 100 MB limit).
- Next: A2c, `/dev/judge` page wiring the worker.
