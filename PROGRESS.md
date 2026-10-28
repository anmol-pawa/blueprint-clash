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

## 2026-10-28: A2b toolchain spike (`@yowasp/clang`), ADR 0001
- Spiked `@yowasp/clang` 22.1 in Node (`scripts/spike-clang.mjs`) and added `lib/judge/toolchain.ts`: `buildProject(clang, files)` compiles each TU to wasm32-wasip1, links, maps diagnostics to project files, returns timings; the clang command is injected so the same code will run in a worker.
- **Key finding:** the wasm sysroot has no C++ exception runtime (`__cxa_throw` undefined), so the browser build uses `-fno-exceptions` (`throw` becomes a compile error). `bp_test.h` gained a no-exceptions mode (ASSERT/FAIL `return`, EXPECT_THROWS is a static_assert). Other findings: argv must be non-empty (exit 71 otherwise); full AST JSON is 14.6 MB / 35 s even when filtered, so B7 needs another approach. All recorded with numbers in `docs/adr/0001-cpp-toolchain.md` (warm compile about 3.9 s per TU, link about 0.3 s, 105 MB package).
- Verification: `npm run lint`, `typecheck`, `test` (17 pass, including 3 real-clang tests: multi-file accept, wrong behaviour with file+line, compile error mapping, link error, `throw` rejected), `build`, `build:pages` pass. No UI change, so no screenshots.
- Branch/CI: committed on the session branch `claude/funny-ramanujan-qdpdve` (the session requires it) rather than `main`. CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no browser run yet (needs a WASI shim and lazy asset loading, A2c); `@yowasp/clang` is still a devDependency; 3.9 s per TU needs the object cache and worker pool in A2c.
- Next: A2c.
