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

## 2026-10-29: B1c player and Ada Lintwell
- Added `scripts/art/characters.mjs` generating `game/sprites/characters/`: 24×32 overworld walkers for the player (teal jacket, blueprint tube, tool belt) and Ada Lintwell (plum cardigan, long skirt, round glasses, silver bun, pencil behind the ear) with 4-frame `walk-down` / `walk-up` / `walk-right` cycles (left = mirrored right) plus a 4-frame idle; and 48×48 dialogue portraits with an idle blink and a talk animation. `/dev/sprites` now lists creatures, walkers (6×) and portraits. `paint.mjs` `emit` quotes hyphenated animation names.
- Verification: `lint`, `typecheck`, `test` (78 pass, new character tests: dimensions, 4-frame cycles that differ, feet on the ground line, portrait blink/talk), `content:verify`, `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14 on `/dev/sprites`: no console errors, no horizontal overflow; screenshots viewed.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: Ada's overworld glasses are a bar that hides her eyes at this size; side-view heads are blocky; no run/interact poses; the walkers have only a few hand-tuned limb offsets rather than a full 6-frame cycle.
- Note: this session's designated branch was `claude/funny-ramanujan-4ej3h0`; committed to `main` as CLAUDE.md requires.
- Next: B1d (Old Town tileset and the Drafting Hall interior).

## 2026-10-29: B1d Old Town tileset and Drafting Hall interior
- Added `scripts/art/tiles.mjs` generating `game/sprites/tiles/old-town.ts` (25 tiles: grass/flower variants, cobble path and plaza, 4-frame water, brick wall, lit/dark windows, door, slate roof and eave, plaster, trees, flickering lamp, fence, sign, bench, crate, flowerbed, hedge, blueprint notice board) and `drafting-hall.ts` (18 tiles: wood floors, rug set, panelled wall, window, bookshelf, drafting tables with blueprints, chalkboard with a UML sketch, plant, wall lamp, door mat, stairs). 16×16 tiles, palette + row strings, animated tiles have 2–4 frames.
- `game/sprites/tiles/tileset.ts` defines `TileSetDef`, `validateTileSet` and `composeScene` (layered tile maps to a sprite); `scenes.ts` has a sample Old Town square and Drafting Hall. `/dev/sprites` now shows both scenes and every tile.
- Verification: `lint`, `typecheck`, `test`, `content:verify`, `build`, `build:pages` pass (9 new tests in `tests/tiles.test.ts`). Playwright at 1280x800 and iPhone 14 on `/dev/sprites`: no console errors, no horizontal overflow; scene screenshots viewed, both read as a brick-and-slate town square and a wood-panelled drafting studio.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no district-specific tiles beyond Old Town; the hall's rug edge tiles do not wrap its corners cleanly; no tile collision metadata yet (B2); tile-to-tile edge blending (grass/path) is not drawn.
- Note: this session's designated branch was `claude/funny-ramanujan-6k1ea4`; pushed to it and to `main` as CLAUDE.md requires.
- Next: B2 (overworld + dialogue engine).

## 2026-10-29: B2a overworld and dialogue logic
- Added pure `lib/world/` (`MapDef`, grid `step` with turn-then-move, solid tiles, NPC blocking, warps checked before solidity, `facingTarget`, `validateMaps`) and `lib/dialogue/` (node-graph scripts with `next`/`choices`, flag `set`/`requires`, pure `advance`, `validateScript`, typewriter `visibleText`). Old Town and Drafting Hall maps (door and mat warps, Ada Lintwell, three notice boards and a chalkboard) and Ada's intro script with a choice. Documented in ARCH ("World and dialogue"). B2 split into B2a (done) and B2b (Pixi scene and `/play`).
- Verification: `lint` (3 pre-existing warnings in `scripts/art/tiles.mjs`), `typecheck`, `test` (103 pass, 16 new in `tests/world.test.ts`, including walking from the start to the hall door), `content:verify`, `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no rendering or input yet; no NPC wandering; no run/ledge/trigger tiles; flags are not yet persisted in the save.
- Note: this session's designated branch was `claude/funny-ramanujan-7bz3kq`; pushed to it and to `main`.
- Next: B2b (Pixi overworld scene + `/play`).

## 2026-10-29: B2b Pixi overworld and /play
- Added `game/overworld/OverworldGame.ts` (Pixi scene: tile rendering with animated tiles, tween walking with the walker cycles, NPC sprite, camera clamp, door warps, interact/dialogue routing) and `/play` (`app/play/`): dialogue box with Ada's portrait, typewriter text, choices, keyboard controls, touch D-pad and A button. Documented in ARCH.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (103 pass), `build`, `build:pages`, `content:verify` pass. Playwright at 1280x800 and iPhone 14 on `/play`: walked Old Town, through the door into the Drafting Hall, talked to Ada (portrait, typewriter, three choices); no console errors, no horizontal overflow; screenshots viewed. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the game is not linked from the home page yet; flags and position are not saved; no NPC idle animation; the typewriter cannot be skipped by tap (tap advances); no fade on door transitions; the Pixi scene has no unit tests (logic is covered in `tests/world.test.ts`).
- Note: designated branch was `claude/funny-ramanujan-8xjebm`; pushed to it and to `main`.
- Next: B3 (battle stage and card battles).

## 2026-10-29: B3a battle logic and starter deck
- Added pure `lib/battle/` (`cards.ts`: four card kinds, `validateCards`, exact-set `isCorrect`; `battle.ts`: seeded shuffle of cards and options, streak damage, counter damage, missed cards re-queued at the back, win/lose, stars) and `lib/battle/verify.ts` + `compileAndRun` in `lib/judge/native.ts`. 12-card Old Town deck in `content/cards/old-town.ts` (RAII, ownership, Rule of Zero, Observer, Decorator, two smell cards, four predict cards: slicing, virtual call in constructor, destructor order, unique_ptr move). B3 split into B3a (done) and B3b (Pixi stage and UI). Documented in ARCH.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (115 pass, 12 new in `tests/battle.test.ts`, including g++ proof of every predict output), `content:verify`, `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no UI yet; deck has 12 of the planned 30 Old Town cards (B4/B5 add more); no UML-reader/estimation/trade-off card kinds yet; misses are not yet fed to the SRS/save.
- Note: designated branch was `claude/funny-ramanujan-3ec4fk`; pushed to it and to `main`.
- Next: B3b (Pixi battle stage + `/battle` UI).

## 2026-10-29: B3b Pixi battle stage and /battle
- Added `game/battle/BattleStage.ts` (dusk backdrop, platforms, Draftling back vs foe, intro slide-in + fade, lunge attack, hurt flash, shake, hit-stop, floating damage numbers, faint) and `/battle` (`app/battle/`): HP bars, code view, single/multi-select options with keys 1-9, Attack, explanation panel, Next, victory/defeat screen with stars and Rematch. Added `rotateHue`/`hueShifted` (tested) and the placeholder foe `ROUGH_DRAFT` (hue-shifted Draftling, shown on `/dev/sprites`).
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (121 pass), `content:verify`, `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14 on `/battle`: answered a card, saw the strike, damage number and explanation; no console errors, no horizontal overflow; screenshots viewed. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: foe is a recolour, not dedicated art; no battle music/sfx; no link to `/battle` from `/play` or home; on iPhone the explanation sits below the options (scrolls into view); no Pixi unit tests; battle result is not saved or fed to SRS.
- Note: designated branch was `claude/funny-ramanujan-gp1ugc`; committed to `main` as CLAUDE.md requires.
- Next: B4 (Old Town lesson, first half: 30 cards and 6 judged class exercises).

## 2026-10-29: B4a Old Town deck grown to 30 cards
- B4 split into B4a (done) and B4b (six judged class exercises). Added 18 cards to `content/cards/old-town.ts` covering struct vs class, invariants/encapsulation, initialiser lists (and declaration-order init), `explicit`, delegating constructors, const member functions, static members, copy vs move, `shared_ptr`/`weak_ptr`, `optional`, `enum class`, and non-owning parameters. 7 new predict cards are proven by native g++ in `tests/battle.test.ts` and `content:verify`.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (121 pass), `content:verify`, `build`, `build:pages` pass. Data-only change to the deck, so no new screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the deck is still all in one file (no per-lesson split yet); no UML-reader/estimation/trade-off card kinds; correct answers are mostly option 0 in the source (the battle shuffles options at run time).
- Note: designated branch was `claude/funny-ramanujan-wdfdj8`; pushed to it and to `main`.
- Next: B4b (six judged class exercises).

## 2026-10-29: B4b six judged class exercises
- Added `lib/exercises/` (types, compiler-free `validateExercise`, node loader, `judgeExercise`) and six packages in `content/exercises/`: bank-account (invariants), file-handle (RAII, move-only, self-move), inventory (`unique_ptr` ownership transfer), stack (`Stack<T>`, move-only elements, no needless copies), counter (static members, copy ctor vs assignment), temperature (`enum class`, validating factory, cross-unit comparison). Each has a prompt, compiling starter with a TODO, reference, 7-9 hidden tests, a 3-rung hint ladder and 3-4 known-wrong solutions (one `rejects: "compile"`). Documented in ARCH ("Class exercises"). B4 is complete.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (132 pass, 11 new in `tests/exercises.test.ts`), `content:verify` (28 pass: every reference accepted, every starter rejected, every wrong solution fails exactly the documented tests under g++ `-fno-exceptions`), `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Gotcha found while verifying: C++17 evaluates the right side of `m[item->name] = item.release()` first, so the "obvious" leaky wrong solution crashed instead of leaking. Fixed in the fixture; worth a card later.
- Known gaps: no in-game UI to play the exercises yet (they run through `content:verify` and the shared judge only); the exercises are not wired to lesson progress/save; the browser judge has not yet run these packages (native g++ only).
- Note: designated branch was `claude/funny-ramanujan-0pc0qw`; pushed to it and to `main`.
- Next: B5 (Old Town second half: polymorphism, virtual destructors, slicing, `variant`; 25 cards and 6 exercises).

## 2026-11-02: B5a Old Town polymorphism deck
- B5 split into B5a (done) and B5b (six judged exercises). Added `content/cards/old-town-poly.ts` with 26 cards: virtual dispatch and when it applies, virtual destructors, `override`, abstract classes and interface shape, virtual `clone()`, `final`, virtual calls in constructors, `dynamic_cast` smell vs legitimate use, LSP (Square/Rectangle), inheritance-for-reuse smell, ISP, Strategy and Template Method pattern cards, NVI, `variant` vs hierarchy (closed vs open set), `visit`, default-constructed `variant`, and the cost of virtual. 10 predict cards, including slicing in a vector and by value, hiding a non-virtual, and default arguments bound statically. `OLD_TOWN_DECK` is now the 56-card concatenation of the basics and this deck.
- Verification: `lint`, `typecheck`, `test`, `content:verify` (every predict output proven by native g++), `build`, `build:pages` pass (see run summary). Data-only change, so no screenshots. CI/deploy checked per CLAUDE.md.
- Known gaps: the whole 56-card deck is one battle (no per-lesson split yet); no UML-reader, estimation or trade-off card kinds; misses are not fed to the SRS yet.
- Note: designated branch was `claude/funny-ramanujan-uw1twk`; pushed to it and to `main`.
- Next: B5b (six judged exercises).

## 2026-11-02: B5b six polymorphism exercises (B5 complete)
- Added six judged packages in `content/exercises/`: shapes (abstract interface, virtual destructor), widgets (virtual `clone()`, deep-copying Panel, copy assignment), pricing (Strategy; tests plug in a rule the solution never saw), roles (ISP, `is_base_of` checks), variant-eval (`variant` + `visit`), sink (NVI; a rogue subclass proves `write` cannot be overridden). Each has hidden tests, a 3-rung hint ladder, starter, reference and 3 wrong solutions (two reject at compile time or via type traits). ARCH "Class exercises" updated.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (138 pass), `content:verify` (all 12 exercises: references accepted, starters rejected, wrong solutions rejected as documented; first run caught two fixture bugs, fixed), `build`, `build:pages` pass. Data-only, no screenshots. CI/deploy not checked: the Actions quota note was past its 2026-11-01 end date but `gh` is unavailable in this environment.
- Known gaps: no in-game UI to play exercises yet; not wired to progress/save; browser judge has not run these packages (native g++ only).
- Next: B6 (the Workshop flow v1).

## 2026-11-02: B6a Library management Change Storm 1
- B6 split into B6a (done), B6b (pure Workshop flow + OCP score) and B6c (`/workshop` UI). Added Storm 1 (membership tiers) to `content/workshop/library-management`: `api_storm1.h` (`TieredLibrary`, `Tier`, `makeTieredLibrary`), `tests/storm1/` (7 tests including base-rule regressions), a hidden storm requirement `R-tier` revealed by a new essential clarify question, a `res-tier` rubric item, editorial and a follow-up on demotion. The reference now adds `TierLimitPolicy` without touching `borrow()`. Two bad designs (`premium_ignored`, `demote_unchecked`) pass the base phase and fail Storm 1 as documented.
- Loader/validator: `WorkshopPackage.phaseApis` loads `api_<phase>.h`; `validatePackage` requires one for every storm; `testFilesUpTo` puts every phase header on the include path (the reference is the post-storm design). ARCH §3 updated.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (139 pass), `content:verify`, `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation: `gh` is unavailable in this environment, so not checked.
- Known gaps: no UI yet; no before/after reference snapshot for OCP scoring (B6b needs a pre-storm reference or the player's own pre-storm submission); Storm 1 tests are not yet run in the browser judge.
- Next: B6b.

## 2026-11-02: B6b pure Workshop flow, clarify scoring and OCP score
- Added `lib/workshop/flow.ts` (pure reducer: brief -> clarify -> code -> submit/lock -> storm -> ... -> debrief; illegal events are no-ops; `surprises` finds hidden storm requirements the player never uncovered), `ocp.ts` (LCS line diff; OCP = added / (added + touched), a modified line counts once as touched) and `score.ts` (`clarifyScore`, `timeScore`, `workshopScore` with GDD §5.3 weights, renormalised while board/review are absent; stars 0-3 with `starThreePending` until Senior Review exists). Documented in ARCH.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (159 pass, 20 new in `tests/workshopFlow.test.ts`), `content:verify` (52 pass), `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation: `gh` is unavailable here, so not checked.
- Known gaps: OCP unit is the file, not the class; no pre-storm reference diff beyond the player's own locked snapshot; no UI yet.
- Next: B6c (`/workshop` UI).

## 2026-11-02: B6c `/workshop/[id]` UI (B6 complete)
- Added `/workshop/library-management` (static, from `WORKSHOP_REGISTRY`): brief, clarify menu with interviewer answers, multi-file editor with Run/Submit in the browser judge, storm card ("you saw this coming" vs "you never asked"), second round with the storm header revealed, and a debrief (stars, weighted score, clarify score, OCP per file, rubric, editorial, follow-ups, reference code). New `lib/workshop/bundle.ts` (provided/hidden file split, expected test counts), `components/Prose.tsx` (tiny markdown renderer), `WorkspaceEditor` `onJudged` hook, `loadPackageWith` loader split. ARCH and DECISIONS #3 updated.
- Bug found by the playthrough and fixed: a missing definition is a *link* error (`wasm-ld: error:`), which was reported as a toolchain failure; `parseDiagnostics` now turns linker errors into a compile error (tested).
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test`, `content:verify`, `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14: brief, clarify, base submit (compile error), storm card, reference through the browser judge (Accepted, all tests), debrief; no console errors, no horizontal overflow; screenshots viewed.
- Known gaps: flow state is not saved (reload resets it, the draft stays); not linked from home or `/play`; first judge run downloads ~105 MB (no progress UI); debrief shows no player-vs-reference diff; Run and Submit are identical (DECISIONS #3).
- Next: B7 (OCP scorer and Senior Review v1).

## 2026-11-02: B7a Senior Review v1 (pure rules)
- B7 split into B7a (done) and B7b (UI + scoring wiring). Added `lib/review/` (`tokenize.ts`, `parse.ts`, `model.ts`, `rules.ts`, `index.ts`: `reviewFiles`) with 5 rules: `virtual-destructor` (blocker; protected non-virtual accepted per C.35), `raw-new` (blocker), `public-mutable-field` (blocker; plain data carriers exempt), `missing-override` (minor), `god-class` (major; >12 methods or >300 lines). Each finding has a fix and a lesson pointer. ADR 0002 and DECISIONS #4: the planned clang JSON AST dump measured ~226 MB for a file including `<memory>`, so a declaration parser replaced it; ARCH §2 and the Workshop section updated.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (191 pass, 25 new in `tests/review.test.ts` including a cross-check of the parser against clang's JSON AST), `content:verify` (53 pass; new check that every Workshop reference has no blocker/major findings; it caught a false positive on classes that only override a base from the unreviewed `api.h`, now fixed and tested), `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation: `gh` is unavailable in this environment, so not checked.
- Known gaps: not shown in the UI or scored yet; no slicing, type-tag `switch`, `dynamic_cast`, long-function or deep-inheritance rules (need types or more token patterns); name-based matching, no overload resolution or macro expansion; bad designs are not yet checked for expected findings.
- Note: designated branch was `claude/funny-ramanujan-eq6kj3`; pushed to it and to `main`.
- Next: B7b.


## 2026-11-03: B7b Senior Review in the Workshop debrief (B7 complete)
- The `/workshop` debrief now reviews the player's locked final files (provided `api*.h` excluded): findings list with severity, file:line, fix and lesson; the Senior Review row shows its score. New `lib/review/score.ts` (`reviewScore`: blocker 0.34, major 0.2, minor 0.05 off 1.0; `isProvidedHeader`) feeds `workshopScore`'s 15 % review weight and the third-star rule (needs no blocker/major).
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (192 pass), `content:verify` (53 pass), `build`, `build:pages` pass. Playwright (seeded draft, real browser judge) at 1280x800 with the reference: 3 stars, "no findings"; at iPhone 14 with a seeded bad design: 2 stars, 3 blockers + 1 minor listed with fix/lesson; no console errors, no horizontal overflow; screenshots viewed. CI/deploy: not checked (`gh` unavailable here).
- Known gaps: review shown only at debrief (not while coding); no per-finding jump to the editor; bad designs not yet checked for expected findings; flow state still not saved; design board (15 %) still absent.
- Note: designated branch was `claude/funny-ramanujan-iqqotl`; pushed to it and to `main`.
- Next: B8 (Old Town master battle).

## 2026-11-03: B8a district master fight (pure logic + Old Town content)
- B8 split into B8a (done), B8b (96×96 master sprite), B8c (`/battle/master` UI with phase 2 through the browser judge, badge saved) and B8d (evolution scene). Added `lib/battle/master.ts`: a three-phase fight (concept cards -> judged mini exercise -> smell boss) with one HP pool, small heals between phases, a continuous master HP bar (`masterHpFraction`, 40/20/40), stars from card misses plus failed submissions, and a badge only on victory. An assisted workshop pass (reference viewed) never beats the master. Content: `content/masters/old-town.ts` (Warden Hollis Vane, dialogue, badge id, `file-handle` as the phase-2 exercise, level 2+ cards from the deck) and `old-town-smells.ts` (six new smell cards: hidden singleton dependencies, raw owning pointer, inheriting from `std::vector`, feature envy, fat interface, copy-paste duplication). ARCH gained a "District master fight" paragraph.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (206 pass, 14 new in `tests/master.test.ts`), `content:verify` (53 pass), `build`, `build:pages` pass. CI/deploy: `gh` unavailable here, so not checked; the Actions quota note has expired. Data and pure logic only, so no screenshots.
- Known gaps: no UI or sprite yet; the smell cards are not yet in the SRS/review queue; the smell pool is small (6) so a retry repeats cards.
- Next: B8b (master sprite).

## 2026-11-03: B8b Warden Hollis Vane 96×96 sprite
- Added `scripts/art/warden.mjs` and generated `game/sprites/creatures/warden-vane.ts` (96×96, 27-colour palette, 3–4 shade ramps, outlined): a grey-bearded gatekeeper in a slate coat and flat cap, with a key-ring staff (ownership), a belt of keys and a lantern. Animations: idle (4, breathing, lantern sway, blink), attack (4, staff raise and slam, lantern glows), hurt (2), faint (4, kneel and dissolve). Registered in `SPRITES` so it shows on `/dev/sprites`. Sprite tests: evolve is optional for masters, palette limit is 32 at 96 px, plus a 96×96 check.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (212 pass), `content:verify`, `build`, `build:pages` pass. Playwright on `/dev/sprites` at 1280×800 and iPhone 14: no console errors, no horizontal overflow; screenshots viewed (face readable under the cap, frames consistent).
- Known gaps: the staff ring clips the top edge in attack frame 2; no back sprite (master is a foe only); not yet used in a battle scene. CI/deploy not checked: `gh` is unavailable here.
- Note: designated branch was `claude/funny-ramanujan-oi3zpw`; pushed to it and to `main`. Untracked `AGENTS.md` (written by Next dev) was not committed.
- Next: B8c (`/battle/master` UI).

## 2026-11-03: B8c `/battle/master` UI
- Added `/battle/master`: Warden Hollis Vane fight end to end. Intro dialogue, phase 1 concept cards, a banner, phase 2 build (`file-handle` in the `WorkspaceEditor` through the browser judge; Submit is the attack, Run is free, 3-rung hint button, attempts left, miss costs HP and the Warden strikes), phase 3 smell boss, then a result screen with stars, win/lose dialogue and the Gate Badge saved to the IndexedDB save (`lib/save/progress.ts` `awardBadge`, idempotent). One continuous master HP bar from `masterHpFraction`. New `lib/exercises/bundle.ts` (client-safe exercise bundle without the reference), `content/exercises/registry.ts`, `loadExercise(..., metaOverride)`, shared `components/BattleCard.tsx`. ARCH updated.
- Bugs found and fixed while testing (both also affected `/battle`): (1) during feedback the UI showed the *next* card above the previous card's explanation (state had already advanced); it now holds the answered card. (2) The green/red answer highlight never rendered because unlayered `.px-btn` CSS beats Tailwind utilities, even for its own `--btn` variables; the tint is now inline. The `/battle` back link was `./play` (resolved to `/battle/play/` under trailing slashes); now `../play/`.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (214 pass, 2 new in `tests/progress.test.ts`), `content:verify`, `build`, `build:pages` pass. Playwright, real browser judge: a full winning run at 1280×800 (intro, all cards answered correctly, reference solution pasted and submitted, smell boss, 3 stars, "Badge saved"), a losing run (defeat screen), and iPhone 14 up to the workshop phase; no console errors, no horizontal overflow; screenshots viewed (green/red highlights, explanation now matches the card).
- Known gaps: no link to `/battle/master` from the overworld or home yet; misses are not fed to the SRS; the Pixi stage letterboxes inside a tall mobile area (the editor sits below the fold on iPhone, reached by scrolling); the Warden has no attack-phase reaction to a phase change; the evolution scene is B8d. CI/deploy: `gh` is unavailable here, so not confirmed.
- Note: designated branch was `claude/funny-ramanujan-mm57ez`; pushed to it and to `main`.
- Next: B8d (Draftling evolution scene).

## 2026-11-03: B8d Draftling evolution scene (B8 complete)
- Added `lib/battle/evolution.ts` (pure timeline: announce 1.2 s, morph 3.2 s with a chirping flicker between forms and a growing glow, burst 0.7 s, reveal 1.6 s), `game/battle/EvolutionStage.ts` (Pixi night scene, platform, glow rings, burst rays, white-silhouette flash on the existing Draftling and Architect sprites) and `/evolve` (narration, Skip, reduced-motion skip, Back to town). The master victory screen now has an "Evolve!" link. ARCH gained an "Evolution scene" note.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (220 pass, 6 new in `tests/evolution.test.ts`), `content:verify` (53 pass), `build`, `build:pages` pass. Playwright at 1280x800 and iPhone 14 through the whole sequence: no console errors, no horizontal overflow; screenshots viewed (white silhouette with rays at the burst, Architect reveal; found and fixed a mobile layout where the text panel was clipped).
- Known gaps: no save flag for the evolved form (implied by the badge), the overworld/battle still use Draftling; no sound (B9); `/evolve` is not yet gated on the badge. CI/deploy: `gh` is unavailable here, so not confirmed.
- Note: designated branch was `claude/funny-ramanujan-5khp00`; pushed to it and to `main`.
- Next: B9 (Audio v1).

## 2026-11-03: B9 Audio v1
- Ported and adapted the Query Clash synth. New pure `lib/audio/themes.ts` (Old Town major-pentatonic loop at 96 bpm, minor Warden-fight loop at 132 bpm, `stepEvents`, `midiToHz`, `parseAudioSettings`; 9 tests in `tests/audio.test.ts`), `game/audio/synth.ts` (context on first gesture, lookahead music scheduler, sfx: click, correct, wrong, hit, hurt, faint, victory, defeat, judgePass/Fail, badge, evolving, evolved) and `components/AudioToggle.tsx` (44 px mute button, persisted). Wired: music on `/play` and `/battle` (Old Town) and `/battle/master` (Warden theme); strike/faint sounds in the shared `BattleStage`; card result, judge result and badge stingers; evolution shimmer and reveal. ARCH gained an Audio section.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (229 pass), `build`, `build:pages` pass (`content:verify` untouched, no content change). Playwright on the static export at 1280x800 and iPhone 14 (`/play`, `/battle`, `/evolve`): oscillators created after a gesture, mute persists to localStorage, no console errors, no horizontal overflow; screenshots viewed (toggle sits in the header row without overlap).
- Known gaps: real playback quality can only be judged by ear (headless run proves the graph runs, not how it sounds); no volume slider (only mute); no dialogue blips or footsteps in the overworld yet; workshop pages have no sound; `/battle/master` plays no win stinger beyond the badge fanfare. CI/deploy checked below.
- Note: designated branch was `claude/funny-ramanujan-oumncb`; pushed to it and to `main`.
- Next: B10 (slice polish: full Playwright playthrough and slice review).

## 2026-11-03: B10 Slice polish and review (Phase B complete)
- The title screen was a dead end ("Start (coming soon)"). It now links every built mode: Start (`/play`), Concept battle, Workshop: Library, Old Town master; Siege and Interview mocks stay locked. `PLAYABLE_MODES` in `lib/siteInfo.ts` with a test that every href maps to an existing route. The Workshop header gained a 44 px Menu link.
- Slice review: end-to-end flows were each played in a real browser by B6c, B7b, B8c, B8d and B9 (judge, review, master fight, evolve, audio). This run re-checked navigation from the menu into each route and back on the static export at 1280x800 and iPhone 14: no console errors, no horizontal overflow; screenshots viewed.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (230 pass), `content:verify`, `build`, `build:pages` pass. CI/deploy: `gh` unavailable here, not confirmed.
- Slice gaps (carry into Phase C): the overworld has no door to the Workshop or master; `/evolve` is not badge-gated; misses are not fed to the SRS (C3); the first judge run downloads ~105 MB with no progress UI; Workshop flow state is not saved; Design Board (C1) absent; no Siege yet.
- Note: designated branch was `claude/funny-ramanujan-y0lvff`; pushed to it and to `main`.
- Next: C1 (Design Board).

## 2026-11-03: C1a Design Board pure logic
- C1 split into C1a (done), C1b (UI) and C1c (PNG export, skeleton insert, saved board). Added `lib/board/`: model + `validateBoard` (unique C++ names, no inheritance cycles, `implements` only to interface/abstract, multiplicity syntax), `scoreBoard` (responsibility rubric: exactly one owner, loose name match, missing 0, duplicated/misplaced half credit, god-class/empty/unconnected flags, phase-limited) producing the 0..1 `boardScore` for `workshopScore`, and `boardToSkeleton` (one header per class, UML-driven ownership, pure-virtual interfaces with virtual destructors, `override`, inferred std includes). ARCH gained a "Design Board model" section.
- Verification: `lint` (3 pre-existing warnings), `typecheck`, `test` (245 pass, 15 new in `tests/board.test.ts` including a real g++ `-fsyntax-only` of the exported headers, which caught a missing `<map>` include, now fixed), `build`, `build:pages` pass. No UI change, so no screenshots. `content:verify` untouched. The Actions quota note has expired; CI/deploy confirmation is not possible here (`gh` unavailable).
- Known gaps: no UI yet; no reference board per Workshop problem to prove the rubric scores the reference at 1.0 (add with C1b); aggregation vs association emit the same member shape.
- Note: designated branch was `claude/funny-ramanujan-qhqdd2`; pushed to it and to `main`.
- Next: C1b (Design Board UI).
