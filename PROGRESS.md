# Blueprint Clash progress

## Owner decisions
See `DECISIONS.md` (the routine proceeds with its recommendation and logs it there; it never blocks on approval).

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
- Installed `@yowasp/clang`; `scripts/spikes/clang-wasm.mjs` compiles and links a 2-TU project with `bp_test.h` and runs it under WASI in Node: ~5.4 s cold, ~3.5 s warm, 586 KB wasm, 3 ms run.
- Findings: no C++ exception runtime (throw fails to link), `std::thread` compiles but aborts at run time, argv must be non-empty. Documented in `docs/adr/0001-browser-cpp-toolchain.md` and ARCH §2.
- `bp_test.h` now works with and without exceptions (`BP_EXCEPTIONS`); `judgeNative({noExceptions:true})` mirrors the browser; new test covers it.
- Verification: `npm run lint`, `typecheck`, `test` (15 pass), `build`, `build:pages`. No UI change, so no screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: browser-side measurements (download, memory, Chromium timing) not done yet; the package is 105 MB.
- Next: A2c (browser worker + `/dev/judge`).

## 2026-10-28: A2c browser judge worker
- Added `lib/judge/browser/` (compile worker around `@yowasp/clang`, disposable run worker with a minimal WASI host, `judgeInBrowser` client), `scripts/copy-clang.mjs` (toolchain to git-ignored `public/clang/`, wired into predev/prebuild/prebuild:pages), SW precache excludes `clang/`, and the `/dev/judge` page. ADR 0001 updated with measurements.
- Verification: `lint`, `typecheck`, `test` (17 pass, incl. new WASI test), `build:pages` pass. Playwright (Chromium) at 1280x800 and iPhone 14 on `/dev/judge`: accepted, wrong_behaviour (file:line messages), compile_error, runtime_error (trap), time_limit (infinite loop) all correct; no console errors, no horizontal overflow; screenshot viewed. `npm run build` (non-static) not separately re-run beyond build:pages' compile; see below.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: compile is ~9–10 s cold (every page load); no warm-compile or Chromium memory measurement; Pages deploy of 105 MB toolchain unverified; the `/dev/judge` page is unstyled scaffolding.
- Next: A3 (workshop content pipeline + `content:verify`).

## 2026-10-28: A3 workshop content pipeline
- Added `lib/workshop/` (types, structural `validatePackage`, node loader, cumulative native phase runner), the package format documented in ARCH §3, `npm run content:verify` (Vitest via `vitest.content.config.ts`, `content/verify/*.verify.ts`), and the first problem `content/workshop/library-management` (base phase): api.h, brief, hidden requirements and a 10-question clarify menu (3 essential, 4 useful, 3 noise), 4-responsibility rubric, 5-part-reference design (Catalog, Member, LoanPolicy seam, LibraryService), 12 behaviour tests, 3 bad designs each failing documented tests, editorial with alternatives / trade-offs / 10x / level signals, 5 leveled follow-ups.
- `content:verify` checks: package is valid (every hidden requirement revealable, rubric owners exist in the reference, editorial sections, bad designs documented), the reference passes every phase, each bad design passes earlier phases and fails the documented tests (compiled with `-fno-exceptions`, like the browser).
- Fixed a lint error left on main by A2c (`module` variable in `run.worker.ts`).
- Verification: `lint`, `typecheck`, `test` (25 pass, incl. 8 new validator/runner tests), `content:verify` (3 pass), `build`, `build:pages` all pass. No UI change, so no screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no storms yet (the validator already demands tests, a requirement and a bad design per storm phase); Senior Review checks on reference/bad designs await B7; the rubric ownership check is a class-name match, not a UML check (C1).
- Next: A4 (multi-file editor).

## 2026-10-29: A4 multi-file editor
- Added pure `lib/editor/workspace.ts` (create/rename/delete/open/close/edit with path validation, read-only `api.h` protected, starter content, draft restore that drops invalid or clashing files), `lib/editor/drafts.ts` (IndexedDB store that degrades to "no draft", memory store, debounced saver), `components/CodeEditor.tsx` (CodeMirror 6 C++, dark theme, clang diagnostics as inline lint marks) and `components/WorkspaceEditor.tsx` (file tree, tabs, Run/Submit with per-test results and clickable diagnostics, drafts per problem id). Demo at `/dev/editor`.
- Verification: `lint`, `typecheck`, `test` (34 + 9 new), `content:verify`, `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14 on the static build: invalid path rejected, wrong behaviour then Accepted, draft restored after reload, compile error mapped to impl.cpp:2:41 with a lint mark; no console errors, no horizontal overflow. Caught and fixed a mobile overflow (grid min-content) via screenshots.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no folders in the tree (paths are one level deep by the judge's rules), no autocomplete, Run and Submit differ only by the supplied extras until B6 wires visible vs hidden tests; the editor is dev-page only until the Workshop flow (B6).
- Next: A5 (save system v1).

## 2026-10-29: A5 save system v1
- Added `lib/save/`: `schema.ts` (SaveData v1, `newSave`, `validateSave`), `migrations.ts` (ordered pure `n -> n+1` chain; rejects gaps and newer saves), `store.ts` (`SaveStore` with memory and IndexedDB backends, `loadSave`, `updateSave`) and `transfer.ts` (checksummed JSON export/import). Algo Clash has no save code yet, so this is built fresh; documented in ARCH (Save system).
- Behaviour: corrupt/newer/unavailable storage yields a fresh in-memory save plus a warning and never overwrites the stored value.
- Verification: `lint`, `typecheck`, `test` (46 pass, 12 new in `tests/save.test.ts`), `content:verify`, `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no settings/export UI yet (arrives with the title/menu in B1/B2); the IndexedDB backend is not exercised in Node (covered by the interface via the memory store); no cross-tab write coordination.
- Next: B1 (Draftling art, player and Ada Lintwell, Old Town tileset).

## 2026-10-29: B1a sprite engine and Draftling
- Ported the renderer-agnostic sprite format (`game/sprites/pixel.ts`, `texture.ts`, `SpriteCanvas`) and the `scripts/art/paint.mjs` painter from Query Clash. Authored DRAFTLING (64×64, 19-colour palette) with `scripts/art/draftling.mjs`: blueprint-blue body, set-square ears, compass antenna, ruler-tick belly, pencil tail. Animations: idle 4, attack 3, hurt 2, faint 4 (dithered dissolve), evolve 4 (white silhouette pulse). `/dev/sprites` reviews every animation; `tests/sprites.test.ts` validates every sprite.
- Verification: `lint`, `typecheck`, `test` (55 pass), `content:verify`, `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14 on `/dev/sprites`: no console errors, no horizontal overflow; screenshots viewed, the creature reads as a drafting critter.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no back sprite or Architect evolution yet; the ears sit slightly off the head silhouette; `/dev/sprites` is unstyled scaffolding.
- Note: this session's designated branch was `claude/funny-ramanujan-20eb50`; pushed to it and to `main` as CLAUDE.md requires.
- Next: B1b (Draftling back sprite + Architect evolution).

## 2026-10-29: B1b Draftling back + Architect
- Added `scripts/art/draftling-forms.mjs` generating `draftling-back` (64×64) and `architect` / `architect-back` (80×80): hard hat over set-square ears, spectacles, strapped blueprint scroll, gridded back, long pencil tail. Each has idle 4, attack 3, hurt 2, faint 4, evolve 4. All listed on `/dev/sprites`.
- Verification: `lint`, `typecheck`, `test` (70 pass), `content:verify`, `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14 on `/dev/sprites`: no console errors, no horizontal overflow; screenshots viewed, forms read as one evolution line.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: Architect evolve frames reuse the silhouette pulse (no colour reveal); the spectacles are rings only; the back-view pencil overlaps the body.
- Next: B1c (player and Ada Lintwell walk cycles + portraits).
