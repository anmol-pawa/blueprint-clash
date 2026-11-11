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

## 2026-11-03: C1b Design Board UI
- Workshop flow gained a `design` stage (`BEGIN_DESIGN`, `FINISH_BOARD`; `FlowState.board`; `BEGIN_CODING` still skips it). New pure `lib/board/edit.ts` (immutable edit ops, auto-layout, edge anchors; `tests/boardEdit.test.ts`, 2 flow tests) and `components/DesignBoard.tsx`: SVG UML canvas (drag boxes, class/abstract/interface/enum, fields and methods, six relationship kinds with UML markers, multiplicities, responsibility checkboxes, live rubric check with flags). The debrief now feeds `scoreBoard` into `workshopScore` (the 15 % part) and shows the board verdicts.
- Verification: `lint` (0 errors), `typecheck`, `test` (254 pass), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: built a 3-class board with composition and aggregation edges, live score 75 %, no console errors, no horizontal page overflow; screenshots viewed (mobile canvas scrolls horizontally inside its panel). `content:verify` untouched.
- Known gaps: board scored only against base-phase responsibilities (storm responsibilities are not visible yet); relationship drawing uses tap-source-tap-target (tested via synthetic pointer events); no reference board shown in the debrief; board is not saved with the draft (C1c); no keyboard drag alternative.
- CI/deploy: Actions quota note expired; `gh` unavailable here, so not confirmed.
- Note: designated branch was `claude/funny-ramanujan-8n9rdx`; pushed to it and to `main`.
- Next: C1c (PNG export, skeleton download/insert, saved board).

## 2026-11-03: C1c Board export, skeleton insert, saved board (C1 complete)
- New pure `lib/board/persist.ts` (tolerant `parseBoard`/`serializeBoard`, per-problem storage key, `joinSkeleton`) and `insertFiles` in `lib/editor/workspace.ts` (adds files, never overwrites). `DesignBoard` gained Export PNG (2x raster of the live SVG, with explicit background and font so the file matches the canvas), Download C++ skeleton (single `skeleton.h.txt` with per-file banners; a zip would need a dependency) and autosave/restore of the board to localStorage per problem. The code stage shows an "Insert board skeleton" button that adds the headers to the editor workspace.
- Verification: `lint` (0 errors), `typecheck`, `test` (260 pass, 6 new in `tests/boardPersist.test.ts`), `content:verify` (53 pass), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: downloaded a valid PNG (viewed; first version had a white background, fixed), downloaded skeleton, reload restored the board, skeleton inserted as `Library.h` and `IFeePolicy.h` tabs, no console errors, no horizontal overflow.
- Known gaps: box positions are not saved (auto-layout on restore); the selected-box highlight appears in the PNG; the saved board is localStorage, not the IndexedDB save; skeleton is one text file, not separate downloads.
- CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Next: C2 (Patternling party and type chart).

## 2026-11-03: C2a Patternling roster, type chart, party and debuff (pure logic)
- C2 split into C2a (done) and C2b (save, UI, design battle). Added `lib/patterns/`: the 21 Patternlings with an honest "solves" and "cost" line each; `matchup` (super x2, neutral x1 with a 0.75 YAGNI factor for heavier picks, weak x0.5 with a specific failure explanation); 5 starter design problems; `PartyState` with mastery, triangular levels (1..30), evolution stages at levels 10 and 20, and the Singleton "Global State" debuff (3 unjustified Solo picks; a super pick heals one; debuff trims non-super multipliers by 20%). 10 tests in `tests/patterns.test.ts`.
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test`, `build`, `build:pages`, `content:verify` pass (see commit). No UI change, so no screenshots.
- Known gaps: not wired into the save or any screen; no Patternling art yet (arrives per district C4 to C7); only 5 design problems.
- CI/deploy: `gh` unavailable here, not confirmed.
- Next: C2b.

## 2026-11-03: C2b Party save, /party page, design battle (C2 complete)
- Save schema v2: `party` (owned, mastery, singletonOveruse) with a 1->2 migration (starter party: Chamelstrat, Solo, Forgebot), validation via `isPartyState`, `lib/save/party.ts`. New pure `lib/patterns/battle.ts` (foe HP 100, 3 hearts; super 80 dmg and befriends, neutral 30 with YAGNI, weak costs a heart; Global State debuff applied). New `/party` page: pick a design problem, tap Patternlings (unowned ones are a "practice loan"), result card with the specific explanation, party levels/stages, debuff banner; persists to the IndexedDB save. Linked from the home modes.
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (278 pass; new designBattle and migration tests), `content:verify` (53 pass), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: played a battle, reload, no console errors, no horizontal overflow; screenshots viewed.
- Known gaps: no Patternling art or battle animation yet (arrives per district C4-C7); only 5 design problems; no mastery/level-up toast; disabled buttons after a battle look dim.
- CI/deploy: `gh` unavailable; Actions status not confirmed.
- Next: C3 (SRS and mastery with rust; Daily Review).

## 2026-11-03: C3 SRS, mastery with rust, Daily Review
- Added pure `lib/srs/` (SM-2 flavoured scheduler: 1 day, 3 days, then x ease; a miss resets reps, counts a lapse and returns in 10 minutes; assisted answers never advance; mastery states unseen/seen/learning/practiced/mastered/ingrained; rust level 0-2 from overdue time relative to the interval; queue builder: due cards most-overdue first, then at most 4 new). `SaveData.srs` already existed, so no schema bump. New `/review` page (Old Town deck, mastery summary, rust note, per-answer persistence to the IndexedDB save, Pattern duel link at the end) and the concept battle now feeds its missed cards to the SRS. Title screen links the Daily Review.
- Verification: `lint` (0 errors, 4 pre-existing warnings), `typecheck`, `test` (286 pass; new `tests/srs.test.ts`), `build`, `build:pages` pass; `content:verify` not rerun after the change (no content touched). Playwright on the static export at 1280x800 and iPhone 14: answered two cards, reload showed the saved mastery counts, no console errors, no horizontal overflow; screenshots viewed.
- Known gaps: rust is text only (no sprite rust yet); queue covers only the Old Town deck; the Daily Review lacks the estimation, micro-Siege and past-LLD question (those modes do not exist yet, tracked as C3c); battle only feeds misses, not successes; the master fight does not feed misses.
- CI/deploy: Actions quota note expired, but `gh` is unavailable here, so not confirmed.
- Note: pushed to the designated branch `claude/funny-ramanujan-jrit2z` and to `main`.
- Next: C3c is blocked on later modes; take C4 (SOLID Square).

## 2026-11-03: C4a SOLID Square deck
- C4 split into C4a (done), C4b (wire deck: district battle, `/review` deck choice), C4c (lessons), C4d (8 refactor exercises), C4e (district art and master/gym).
- Added `content/cards/solid-square.ts`: 43 original cards across SRP, OCP, LSP, ISP, DIP, DRY/KISS/YAGNI, Law of Demeter, tell-don't-ask, composition and immutability. Mix: 23 mcq, 11 smell, 5 predict, 4 pattern. Each explanation says why the tempting option is wrong and notes over-application costs. Contract-based LSP (pre/postconditions, invariants) and the rectangle/square trap are included.
- Verification: `content/verify/solid-cards.verify.ts` (card shape, all 5 predict cards compiled and run natively, at least 3 cards per principle) passes; `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (286 pass), `build`, `build:pages` pass. No UI change, so no screenshots.
- Known gaps: the deck is not reachable from the game yet (C4b); no district art or lessons.
- CI/deploy: `gh` unavailable here, not confirmed.
- Next: C4b.

## 2026-11-03: C4b Wire the SOLID Square deck
- New `content/decks.ts` registry (Old Town, SOLID Square; `getDeck`, `deckIdFromSearch` falling back to Old Town) with `tests/decks.test.ts` (unique deck and card ids, valid answers, `?deck=` resolution). `/battle?deck=solid-square` starts the concept battle with that deck (`BattleEntry` reads the query on the client via `useSyncExternalStore`, since the site is a static export); `/review` gained a deck switcher (44 px buttons) and honours `?deck=`; a title-screen tile links the SOLID Square battle. Card ids are globally unique, so the one SRS map serves both decks. The `siteInfo` test now strips query strings.
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (289 pass), `content:verify`, `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: battle and review with `?deck=solid-square` showed the 43-card deck, the deck switch worked, no console errors, no horizontal overflow; screenshots viewed.
- Known gaps: the battle still uses the Rough Draft foe and Old Town backdrop (district art is C4e); the card header for mcq cards reads "Which pattern?" in battle; the master fight still uses the Old Town deck only.
- CI/deploy: `gh` unavailable here, so Actions/Pages status not confirmed (the quota note has expired).
- Note: designated branch was `claude/funny-ramanujan-es7zmh`; pushed to it and to `main`.
- Next: C4c (SOLID lessons).

## 2026-11-03: C4c SOLID Square lessons
- Added the first lesson system: `lib/lessons/model.ts` (type + validator), `content/lessons/solid-square.ts` (6 lessons: SRP, OCP, LSP, ISP, DIP, and DRY/KISS/YAGNI/Demeter/tell-don't-ask), `content/lessons/registry.ts`, `/learn` index and `/learn/[id]` pages (before/after code side by side, trade-off, interview phrasing, over-application cost, "Mark as learned" saved to `lessonsDone`, link to the SOLID Square cards), a Lessons tile on the title screen, and an ARCH "Lessons" section. Each lesson states the expression-problem or other trade-off honestly (OCP vs switch/variant, LSP via contracts and the rectangle/square trap, ISP/DIP over-application).
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (293 pass, new `tests/lessons.test.ts`), `content:verify` (new `solid-lessons.verify.ts`: all 12 programs compile with g++ and print the recorded output; each `after` is Senior-Review clean; the review caught a public mutable field in the DIP test double, now fixed), `build`, `build:pages` pass. Playwright on the static export at 1280x900 and iPhone 14: `/learn` and `/learn/lsp` rendered, no console errors, no horizontal overflow, mark-as-learned worked; screenshots viewed.
- Known gaps: no lesson art or NPC trigger yet (C4e); lessons are not yet tied to district progress; L1 lessons do not exist (only exercises and cards); no "Learned" mark on the title screen.
- Next: C4d (8 refactor exercises).

## 2026-11-03: C4d1 SOLID refactor exercises (srp-invoice, dip-notifier, lsp-account)
- C4d split into C4d1 (done) and C4d2 (five more: OCP registry, ISP fat Machine, owning DIP with a clock, Demeter/tell-don't-ask, composition over inheritance). Three full exercise packages (prompt, `api.h`, starter, reference, hidden tests, three known-wrong solutions each, 3-rung hints): **srp-invoice** (split data, formatting, archiving; a detection trait proves `Invoice` has no `render`/`store`), **dip-notifier** (inject `MessageSender&`; recorder and always-failing test doubles, hard-wired sender rejected), **lsp-account** (contract-based substitution: a per-call cap or a fee on a refused withdrawal breaks the contract; `FixedDeposit` must not derive from `Account`).
- `content:verify` now also runs Senior Review on every exercise reference (no blocker or major findings). Tests use `ASSERT_EQ` on sizes before indexing, because an out-of-range read in a wrong solution crashed the run and hid later failures.
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (296 pass), `content:verify` (89 pass), `build`, `build:pages` pass. No UI change, so no screenshots.
- Known gaps: these exercises are not yet reachable in-game (the district gym in C4e will use them); no lesson links to them yet.
- CI/deploy: the Actions quota note has expired, but `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Note: designated branch was `claude/funny-ramanujan-kc3if8`; the routine protocol pushes to `main`.
- Next: C4d2.

## 2026-11-03: C4d2 Five more SOLID refactor exercises (C4d complete)
- Five full packages (prompt, `api.h`, starter, reference, hidden tests, three known-wrong solutions each, 3-rung hints): **ocp-shipping** (registry of `unique_ptr<ShippingRule>`, cheapest matching rule, -1 when none; tests register rules the solution never saw and count live objects), **isp-machine** (`BasicPrinter` is only a `Printer`; `AllInOne` has both roles; `copyDocument(Scanner&, Printer&)`; the wrong `copy_needs_allinone` is a compile error), **dip-clock** (owning `unique_ptr<Clock>` injection, expiry exactly at the ttl, destroying the store destroys the clock), **demeter-wallet** (a detection trait proves `Customer` has no `wallet()`; `Shop` counts revenue only on a successful `pay`), **composition-history** (`BoundedHistory` has-a deque; must not derive from `std::vector` or offer `push_back`).
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (301 pass), `content:verify` (114 pass: every reference accepted and Senior-Review clean, every starter rejected, every wrong solution rejected the documented way), `build`, `build:pages` pass. No UI change, so no screenshots.
- Known gaps: not reachable in-game yet (the district gym in C4e will use all eight); no lesson links to them.
- CI/deploy: `gh` unavailable here, so Actions/Pages status was not confirmed.
- Note: designated branch was `claude/funny-ramanujan-mobvei`; pushed to it and to `main`.
- Next: C4e (SOLID Square district art, then the master/gym).

## 2026-11-03: C4e1 SOLID Square tileset, map and warps
- C4e split into C4e1 (done), C4e2 (trainers, master, battle backdrop) and C4e3 (Principle Hall interior, duels, gym). New generator `scripts/art/solid-square.mjs` writes `game/sprites/tiles/solid-square.ts`: 28 tiles of 16x16 (limestone walls, copper-green roofs, arched windows and door, columns, purple banners that sway, a marble checker plaza, a four-tile fountain basin with animated water and spray, flagstone path, topiary cubes, a scales statue, lamps, benches, flowerbeds, notice board), its own 46-colour palette. New map `solid-square` (20x14) reached by the Old Town south road (warps on the bottom row) and back; three signs (district sign, lessons board, shut Principle Hall door with a notice). The overworld and `/dev/sprites` render it.
- Verification: `lint` (0 errors; no new warnings), `typecheck`, `test` (306 pass; new SOLID Square walk/warp/blocked tests, scene test extended), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: `/dev/sprites` scene and a real `/play` walk from Old Town through the south road into SOLID Square, no console errors, no horizontal overflow; screenshots viewed (header reads "SOLID Square").
- Known gaps: no trainers, master or battle backdrop yet (C4e2); the hall door is a notice only (C4e3); the district has no music theme of its own.
- CI/deploy: `gh` unavailable here, so Actions/Pages status was not confirmed.
- Note: designated branch is `claude/funny-ramanujan-38uwxg`; pushed to it and to `main`.
- Next: C4e2.

## 2026-11-03: C4e2a SOLID Square trainers
- C4e2 split into C4e2a (done) and C4e2b (master + backdrop). `scripts/art/characters.mjs` now takes style flags (skirt, pack, bun, glasses, pencil, strap, lapel; Ada and the player regenerate byte-identical). Two new trainers with 24x32 four-frame walk cycles and 48x48 idle/talk portraits: **Sable Quill** (moss-green long coat, short dark bob) and **Rook Ferris** (ochre vest, round glasses, tool belt). Placed on the SOLID Square plaza with SRP and DIP teaching dialogue (each states the over-application caveat); wired into the overworld walkers and `/play` portraits.
- Verification: `lint` (0 errors, 3 pre-existing warnings), `typecheck`, `test` (315 pass, new trainer placement test), `build:pages` pass; `content:verify` not rerun (no content touched). Playwright on the static export at 1280 wide and iPhone 14: `/dev/sprites` (viewed: trainers distinct from Ada and the player) and `/play` load, no console errors, no horizontal overflow. I did not walk to the trainers in-browser; placement is covered by tests.
- Known gaps: trainers do not duel yet (C4e3); Rook's glasses use Ada's wrinkle marks on his portrait.
- CI/deploy: `gh` unavailable here, so status not confirmed.
- Note: pushed to `main` per the run protocol.
- Next: C4e2b.

## 2026-11-03: C4e2b SOLID Square master and battle backdrop
- New master **Provost Isolde Marlow** (`scripts/art/provost.mjs` → `game/sprites/creatures/provost-marlow.ts`): 96×96, burgundy robe, white fluted ruff, silver twist under a flat cap, round gold spectacles, a staff whose balance carries five gems (one per principle; the beam tilts in attack) and a gavel. Idle 4, attack 4, hurt 2, faint 4 frames. Overworld walker and 48×48 portrait (`marlow`, `marlow-portrait`) via `characters.mjs` (existing characters regenerate byte-identical); wired into `WALKERS`, `PORTRAITS`, the overworld walker map and `/play` portraits. She is not placed on a map yet (Principle Hall interior is C4e3).
- Backdrop: `BattleStage` takes a `BattleScene` (`lib/battle/scene.ts`); `Deck.scene` selects it, so the SOLID Square concept battle now shows a marble hall (five lit arched windows, fluted columns, purple banners, checker floor, gold-rimmed daises).
- Verification: `lint` (0 errors, 4 pre-existing warnings), `typecheck`, `test` (326 pass; sprite validation caught a two-character palette key, fixed), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: `/battle?deck=solid-square` and `/dev/sprites` viewed, no console errors, no horizontal overflow. `content:verify` not rerun (no content touched).
- Known gaps: the foe is still Rough Draft; Marlow has no battle yet and no master music; no back view needed.
- CI/deploy: `gh` unavailable here; Actions quota note expired, so not confirmed.
- Note: designated branch `claude/funny-ramanujan-xxi0o7`; pushed to it and to `main` per the run protocol.
- Next: C4e3 (Principle Hall interior, trainer duels, master fight wired to the SOLID deck and exercises).

## 2026-11-04: C4e3a Principle Hall interior
- C4e3 split into C4e3a (done), C4e3b (Marlow master fight) and C4e3c (trainer duels). New map `principle-hall` (14x10, SOLID Square tileset: limestone wall with windows, columns, banners, marble checker floor, a flagstone aisle, two scale statues and benches). The plaza arch door (two tiles) is now a warp into the hall and the aisle end warps back; Provost Marlow stands at the head of the aisle with an original `marlow-intro` dialogue (speculative generality, stating a principle with its cost). The old "door shut" notice was removed. Scene added to `/dev/sprites`; the overworld uses the SOLID tileset for the hall.
- Verification: `lint` (0 errors, 4 pre-existing warnings), `typecheck`, `test` (327 pass; new warp/return/NPC-facing test), `build`, `build:pages` pass. Playwright on the static export: `/dev/sprites` at 1280 and iPhone 14 (no console errors, no horizontal overflow) and a real `/play` walk Old Town -> SOLID Square -> Principle Hall (screenshots viewed: Marlow, statues, benches and banners render, header reads "Principle Hall"). I did not capture the dialogue box in-browser; the script is covered by the dialogue validation tests. `content:verify` not rerun (no content touched).
- Known gaps: the hall is always open (no gate); Marlow only talks, the trial is C4e3b; the aisle uses the outdoor path tile rather than a carpet; no hall music.
- CI/deploy: the Actions quota note has expired; `gh` CLI is unavailable in this environment, so Actions/Pages status was not confirmed.
- Note: designated branch `claude/funny-ramanujan-nh5j0f`; pushed to `main` per the run protocol.
- Next: C4e3b.

## 2026-11-04: C4e3b Provost Marlow master fight
- `/battle/master` now serves every district master from `?master=<district>` (read on the client for the static export; unknown ids fall back to Old Town). New `content/masters/index.ts` registry, `MasterProfile` gained `exercises[]`, `badgeName` and `arrival`. **Provost Marlow** (`?master=solid-square`): phase 1 uses the level 2+ SOLID cards (no smell cards, 24 cards), phase 2 lets the player choose any of the eight refactor exercises (all registered in `EXERCISE_META`), phase 3 uses eight new dedicated smell cards (`solid-square-smells.ts`: two-actor SRP, type-switch OCP with the variant counter-argument, throwing-override LSP, fat-interface ISP, `new` in constructor DIP, tell-don't-ask, speculative factory YAGNI, inheritance-for-reuse). Her 96x96 sprite and the marble hall backdrop are used; the Hall Badge (`solid-square`) is saved on victory. Marlow's dialogue now points to the trial; a Principle Hall master entry was added to the site index.
- Verification: `lint` (0 errors), `typecheck`, `test` (331 pass; new Marlow tests for cards, exercise registry, `?master=` selection and a full clean run), `content:verify` (114 pass), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: `/battle/master/?master=solid-square` intro and phase-1 card viewed, no console errors, no horizontal overflow. I did not play through the workshop chooser or the end screen in-browser (state machine covered by tests).
- Known gaps: the fight is not launched from an in-world trigger (Marlow only points to it, as with Old Town); the "Evolve!" link on victory is still the Old Town one; no master music of her own; the player's Draftling is still the only party sprite.
- CI/deploy: `gh` unavailable here, so Actions/Pages status was not confirmed.
- Note: designated branch `claude/funny-ramanujan-ipkl1o`; pushed to it and to `main` per the run protocol.
- Next: C4e3c (trainer duels).

## 2026-11-04: C4e3c Trainer duels (closes C4e3, C4e, C4)
- New `content/trainers.ts`: Sable Quill (SRP, cohesion, OCP, KISS, DRY) and Rook Ferris (DIP, ISP, LSP, coupling) each draw six topic-filtered cards from the SOLID Square deck. `/battle?trainer=<id>` runs the existing concept battle with a shorter foe (36 HP), the trainer's name on the foe bar, an intro line and win/lose lines. A won duel is stored as `duel:<id>` in `lessonsDone` (no save-schema change); misses feed the SRS as before. The two trainers' dialogue now points to their duels, and both are in the site index.
- Verification: `lint` (0 errors), `typecheck`, `test` (336 pass; new `tests/trainers.test.ts`), `build`, `build:pages` pass; `content:verify` started in the background (no cards changed; result not awaited). Playwright on the static export at 1280x800 and iPhone 14: `/battle/?trainer=rook-ferris` screenshots viewed, no horizontal overflow; the only console error came from my ad-hoc static server lacking a JS MIME type for `sw.js`.
- Known gaps: the foe sprite is still Rough Draft; the duel is launched from the Battle menu rather than an in-world prompt; the duel hand is random per visit; no duel badge UI on the overworld yet.
- CI/deploy: the Actions quota note has expired, but `gh` is unavailable here, so status was not confirmed.
- Note: pushed to `main` per the run protocol; the designated branch `claude/funny-ramanujan-1kk2bx` was not force-updated (force push was denied).
- Next: C5 (Creational Foundry).

## 2026-11-04: C5a Creational Foundry card deck
- C5 split into C5a (done) to C5e (see ROADMAP). New `content/cards/creational-foundry.ts`: 41 original cards over Factory Method, Abstract Factory, Builder, Prototype, Singleton, Object Pool and DI (MCQ, pattern-to-Patternling, smell spotter, 7 predict-output cards). Each card states the trade-off: simple factory vs Factory Method, Abstract Factory's closed-to-new-product cost, Builder vs C++20 designated initialisers, `unique_ptr` breaking covariant `clone()`, Meyers singleton thread-safety covers construction only (plus the `auto c = instance()` copy trap), static-init-order, Service Locator as hidden global, pool RAII handles. Registered in `content/decks.ts` as `creational-foundry` (works with `/battle?deck=`, `/review` deck selection).
- Verification: `lint` (0 errors, 7 pre-existing warnings), `typecheck`, `test` (337 pass; new deck-registry test), `content:verify` for the new deck (predict outputs match native g++ output, coverage test), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: `/battle/?deck=creational-foundry` screenshot viewed (card, options, Attack button readable), no console errors, no horizontal overflow. Did not rerun the full `content:verify` (other decks untouched).
- Known gaps: the deck borrows the SOLID Square marble backdrop until C5d; no Foundry foes or art yet.
- CI/deploy: Actions quota note expired; `gh` CLI is unavailable here, so status was not confirmed.
- Note: designated branch `claude/funny-ramanujan-dgoa36`; pushed to it and to `main` per the run protocol.
- Next: C5b (lessons).

## 2026-11-04: C5b Creational Foundry lessons
- New `content/lessons/creational-foundry.ts`: 7 lessons (Factory Method, Abstract Factory, Builder, Prototype, Singleton, Object Pool, DI), registered in the lesson registry and shown on `/learn` as L3. Each has a smell, a compiling before/after C++ pair with recorded output, refactor notes with the trade-off and the deciding factor, an interview signal and the cost of over-applying it. Highlights: simple factory vs Factory Method vs Abstract Factory, designated initializers vs Builder, `unique_ptr` non-covariance in `clone()`, Meyers singleton plus injecting it, RAII lease pool, composition root and ownership choices for DI.
- `content/verify/solid-lessons.verify.ts` now covers both lesson sets: every before/after compiles natively, prints the recorded output, and every `after` is Senior Review clean. Senior Review caught a public mutable field in my first FakeNotifier, fixed.
- Verification: `lint` (0 errors, 7 pre-existing warnings), `typecheck`, `test` (338 pass), `content:verify` (123 pass), `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: `/learn` and `/learn/builder` viewed; no console errors, no horizontal overflow. A long inline code span clipped on iPhone and single-asterisk emphasis rendered literally; both fixed in the content.
- Known gaps: Senior Review's parser treats a nested `class Builder;` forward declaration as a public mutable field (false positive), so the Builder lesson uses a friend `HttpRequestBuilder` instead; worth fixing in C11. The lesson markdown renderer does not support single-asterisk italics.
- CI/deploy: the Actions quota note has expired, but `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Note: designated branch `claude/funny-ramanujan-shf88p`; pushed to it and to `main` per the run protocol.
- Next: C5c (six judged exercises).

## 2026-11-04: C5c1 Creational exercises: factory registry and builder
- C5c split into C5c1 (done), C5c2 and C5c3. Two new judged class exercises, 22 in total. **factory-registry** (Factory Method as a registry of `std::function` factories: lazy creation, a fresh product per call, first registration wins, sorted names, null factory result passes through; the tests register codecs the solution has never seen and count live objects and factory calls). Wrong solutions: hard-coded ladder, overwrite-on-duplicate, eager factory call at registration, unsorted names. **builder-request** (validating fluent `HttpRequestBuilder` with a friend-built immutable `HttpRequest`: URL scheme, method set, body only with POST/PUT, timeout range, case-insensitive header replace-in-place, build() as a reusable snapshot; type traits prove no public construction). Wrong solutions: public constructor, no validation, duplicate headers, GET with body.
- Verification: `lint` (0 errors, 7 pre-existing warnings), `typecheck`, `test` (340 pass; both ids added to the structural-validity list), `content:verify` for both new exercises natively (reference accepted with a clean Senior Review, starter rejected, every wrong solution fails its documented tests), `build`, `build:pages` pass. No visual change, so no screenshots.
- Known gaps: the exercises are not yet linked from a lesson or the Foundry master (C5e); the full `content:verify` was not rerun (nothing else changed).
- CI/deploy: `gh` unavailable here; not confirmed.
- Note: designated branch `claude/funny-ramanujan-ds4wf4`; pushed to it and to `main` per the run protocol.
- Next: C5c2 (abstract-factory-family, prototype-clone).

## 2026-11-04: C5c2 Creational exercises: abstract factory and prototype
- Two new judged class exercises (24 in total). **abstract-factory-family** (`LightFactory`/`DarkFactory` over `Button`/`Checkbox`, `makeFactory(name)`, and a `renderLogin(const WidgetFactory&)` that must work for a family the tests invent). Wrong solutions: dark factory builds a light checkbox, screen type-switches on the concrete factory, unknown family silently falls back to light. **prototype-clone** (`Label`, `Badge : Label`, `Panel` owning `unique_ptr` children, `Palette` of prototypes with private snapshots; the prompt explains why `clone()` returns `unique_ptr<Widget>`, not a covariant type). Wrong solutions: shallow panel copy (shared_ptr children), `Badge` forgets its `clone()` override (slices to Label), `Palette` stores a pointer to the caller's object.
- Verification: `lint` (0 errors, 7 pre-existing warnings), `typecheck`, `test` (342 pass; ids added to the structural-validity list), `content:verify` filtered to both new exercises natively (reference accepted, clean Senior Review, starter rejected, every wrong solution fails its documented tests), `build`, `build:pages` pass. No visual change, so no screenshots.
- Known gaps: not yet linked from a lesson or the Foundry master (C5e); full `content:verify` not rerun.
- CI/deploy: `gh` unavailable here; Actions/Pages status not confirmed.
- Note: designated branch `claude/funny-ramanujan-i4naek`; pushed to it and to `main` per the run protocol.
- Next: C5c3 (singleton-meyers, pool-lease).

## 2026-11-04: C5c3 Creational exercises: Meyers singleton and object pool (closes C5c)
- Two new judged class exercises (26 in total). **singleton-meyers** (`IdGenerator` as a Meyers singleton with private constructor and deleted copy/move, plus an `OrderService` that takes an `IdSource&` so the logic never names the singleton; tests use a fake source and the real one, and type traits prove it cannot be copied or created). Wrong solutions: copyable, `*new` per call (no singleton), service reaches for the global. **pool-lease** (`BufferPool` with a move-only RAII `Lease`: bounded, empty lease when exhausted, buffer cleared and reused on return, move/move-assign/self-move semantics, pool-outlives-lease documented). Wrong solutions: no reset, double release on move, move-assign leaks, never exhausts.
- Design note: no thread-based tests, because the WASM judge toolchain has no threads; the thread-safety of function-local static initialisation is covered in the lesson and a comment, not by a flaky test.
- Verification: `lint` (0 errors, 7 pre-existing warnings), `typecheck`, `test` (344 pass), `content:verify` filtered to both new exercises (10 pass: reference accepted, clean Senior Review, starter rejected, every wrong solution fails its documented tests), `build`, `build:pages` pass. No visual change, so no screenshots.
- Known gaps: not yet linked from a lesson or the Foundry master (C5e); full `content:verify` not rerun.
- CI/deploy: `gh` unavailable here; Actions/Pages status not confirmed.
- Note: pushed to `main` per the run protocol.
- Next: C5d (Foundry Patternling art).

## 2026-11-04: C5d1 Foundry Patternling sprites
- C5d split into C5d1 (done) and C5d2 (tileset, backdrop). `scripts/art/foundry.mjs` generates four 64x64 shaded, outlined sprites in `game/sprites/creatures/`, each with idle 4, attack 3, hurt 2, faint 4 (dithered dissolve) and evolve 4: **Forgebot** (steel foundry-bot, glowing furnace belly, hammer arm, smoke, a little product beside it), **Beaverbuild** (tool-belted beaver, buck teeth, paddle tail, brick stack that grows), **Solo** (one-eyed violet loner behind a padlocked fence under a single halo), **Clonewisp** (teal wisp with a half-formed dithered copy that solidifies on attack). Registered in `SPRITES`, so they appear on `/dev/sprites` and pass the existing sprite tests.
- Verification: contact sheets reviewed as images (all frames read well, silhouettes distinct); `lint`, `typecheck`, `test`, `build`, `build:pages` run (see commit). No UI change beyond `/dev/sprites`.
- Known gaps: no back sprites yet for the party views; Forgebot's hammer is small; Clonewisp's echo outline is noisy when dithered.
- CI/deploy: `gh` unavailable here; not confirmed.
- Next: C5d2 (Foundry tileset and backdrop).

## 2026-11-04: C5d2 Foundry tileset and battle backdrop (closes C5d)
- Code landed in the previous run (`9e657ed`) but the box and log were not recorded; this run verified and closed it. `game/sprites/tiles/foundry.ts` adds the Creational Foundry tileset (cinder floor, steel plate, conveyor, molten channel, furnace, smokestack, gears, crates, pallets, anvil, pipes), `foundry-scene` on `/dev/sprites`, and a Foundry battle backdrop in `BattleStage`.
- Verification: `lint` (0 errors, 8 warnings), `typecheck`, `test` (368 pass), `build`, `build:pages` pass. Playwright on the static export under `/blueprint-clash/` at 1280x800 and iPhone 14: `/dev/sprites` has no console errors and no horizontal overflow; the Foundry scene and tile sheet were viewed and read clearly, distinct from the other districts.
- Known gaps: unused `IRON` constant warning in the tile generator; `content:verify` not rerun (no content change).
- CI/deploy: `gh` unavailable here; Actions/Pages status not confirmed.
- Next: C5e (Foundry map, trainers, pattern duels, master/gym).

## 2026-11-04: C5e1 Creational Foundry overworld map
- C5e split into C5e1 (done), C5e2 (trainers and duels) and C5e3 (hall, master, badge). New `FOUNDRY` map in `lib/world/maps.ts` built from the shared `FOUNDRY_ROWS`: impassable molten channel, conveyor, furnaces and crates are solid; a two-tile west gate returns to SOLID Square, whose new east gate (x=19, y=3-4) leads in. `sign-foundry` dialogue added and the SOLID Square sign now mentions the east gate. `OverworldGame` uses `FOUNDRY_TILES` for the map. The roller doors are scenery until C5e3.
- Tests: foundry round-trip via the east gate, molten channel blocks, sign interaction, plus a check that every warp in every map lands on a walkable tile (357 tests pass overall).
- Verification: `lint`, `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: walked Old Town to SOLID Square to the Foundry, screenshots viewed (map reads clearly, D-pad usable), no console errors, no horizontal overflow.
- Known gaps: no NPCs yet; `content:verify` not rerun (no content change).
- CI/deploy: `gh` unavailable here; Actions/Pages status not confirmed.
- Next: C5e2 (two Foundry trainers and pattern duels).

## 2026-11-04: C5e2 Foundry trainers and pattern duels
- Two new trainers via `scripts/art/characters.mjs` (24x32 walk cycles + 48x48 portraits with blink/talk): **Dova Kiln** (rust-orange coverall, hair bun) and **Bram Cask** (slate-blue jacket, pack, sandy hair). Placed on walkable Foundry tiles (9,6) and (14,8, south of the molten channel, reached by the east/west edge columns), with `dova-intro` and `bram-intro` dialogue (a choice each, trade-off stated: factory switch vs registry, Singleton's hidden-state cost).
- Pattern duels: `DOVA_KILN` (Factory Method, Abstract Factory, Builder) and `BRAM_CASK` (Prototype, Singleton, Object Pool, DI) as 6-card duels from the Creational Foundry deck, reusing the existing `?trainer=` battle route, duel flags and the Battle menu list in `lib/siteInfo.ts`.
- Tests: trainer pools/hands valid for all four trainers, dialogue points to each duel, and a flood-fill test that both Foundry NPCs are on walkable, reachable tiles with art and dialogue (380 pass).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: walked Old Town to SOLID Square to the Foundry, viewed both trainers in the yard and Dova's dialogue with portrait; no console errors, no horizontal overflow. `content:verify` not rerun (no content packages changed).
- Known gaps: duels use the generic battle backdrop/foe (Foundry backdrop for deck battles lands with C5e3); Dova and Bram share the walker body of the other trainers.
- CI/deploy: `gh` unavailable here; Actions/Pages status not confirmed.
- Note: designated branch `claude/funny-ramanujan-ssak4a`; pushed to it and to `main` per the run protocol.
- Next: C5e3 (Foundry hall interior, master, `/battle/master?master=creational-foundry`, badge).

## 2026-11-04: C5e3a Foundry Hall interior and Foreman Corvo
- C5e3 split into C5e3a (done) and C5e3b (master fight, badge). New `FOUNDRY_HALL` map (14x10, `FOUNDRY_HALL_ROWS` in the Foundry tileset: brick wall with furnaces and gears, anvils and crates, a conveyor running to the Foreman's bay). The middle roller door of the yard (x=9-10, y=2) is now a warp in; the conveyor end warps back out. **Foreman Corvo** (forest-green coveralls, grey crop, square glasses, pencil behind the ear) has a 24x32 walker and 48x48 portrait from `scripts/art/characters.mjs`, wired into `OverworldGame` and `PlayClient`, with a `corvo-intro` dialogue (trade-off question: why a Singleton HTTP client instead of injecting one; says the trial is not ready yet).
- Tests: round trip yard to hall to Corvo and back; hall rows and legend checks (385 pass).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: `/dev/sprites` has no console errors and no horizontal overflow; the hall scene was viewed and reads clearly. `content:verify` not rerun (no content change). The in-game walk-in was covered by the unit test, not a screenshot.
- Known gaps: Corvo has no master sprite or fight yet; the hall reuses the yard backdrop.
- CI/deploy: confirmation skipped per the Actions quota note (the note says before 2026-11-01, so this is stale: `gh` is unavailable here, so Actions/Pages status was not confirmed).
- Next: C5e3b (Corvo master fight and badge).

## 2026-11-04: C5e3b Foreman Corvo master fight and Foundry Badge (closes C5)
- New 96x96 master sprite **Foreman Corvo** (`scripts/art/corvo.mjs`; idle 4, attack 4 with a stamp that leaves identical crates, hurt 2, faint 4). `/battle/master?master=creational-foundry` now runs the three-phase fight on the Foundry backdrop: phase 1 draws the level 2+ non-smell cards of the 41-card Foundry deck, phase 2 lets the player pick one of the six judged builds, phase 3 uses six new dedicated smell cards (`content/masters/creational-foundry-smells.ts`: telescoping constructor, singleton test leakage, factory for one product (restraint), shallow clone, manual pool release, mixed abstract-factory families). Win awards the `creational-foundry` badge; Corvo's intro dialogue now points to the trial; Battle menu entry added.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (395 pass, including new master and sprite tests), `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: master intro and phase-1 card screen viewed (Corvo reads clearly on the Foundry backdrop), no console errors, no horizontal overflow. `content:verify` not rerun (no exercise or predict-card change; smell cards are judgment cards validated by `validateCards`).
- Known gaps: phases 2 and 3 were not clicked through in the browser (covered by the state-machine test); smell-card correctness is reviewed by hand, not machine-checked.
- CI/deploy: confirmation skipped; `gh` is unavailable in this environment (the Actions quota note has expired as of 2026-11-01, so this is an environment limit).
- Note: pushed to the designated branch `claude/funny-ramanujan-lqm4xh` and to `main` per the run protocol.
- Next: C6 (Structural Bridges).

## 2026-11-04: C6a Structural Bridges deck
- C6 split into C6a (done), C6b (lessons), C6c (7 exercises), C6d (art), C6e (map, trainers, hall, master). New 41-card deck `content/cards/structural-bridges.ts` covering Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy plus cross-pattern judgement (Decorator vs Proxy vs Adapter, over-engineering in a 45-minute round): 9 predict, mcq, pattern and smell cards, levels 1-3, each with a trade-off explanation. Registered as `?deck=structural-bridges` (borrows the marble-hall backdrop until C6d).
- Verification: `content:verify` for the new deck (all 9 predict cards compiled and run natively, output matches; `validateCards` clean), `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (396 pass, incl. the new deck-registry test), `build`, `build:pages` pass. No visual change, so no screenshots.
- Caught while writing: a first decorator-order card was wrong by hand (an Upper/Bracket pair gives the same result either order); replaced by a Cut3/Bracket pair and proven natively.
- Known gaps: deck not yet linked from lessons or a master; smell/mcq correctness reviewed by hand.
- CI/deploy: `gh` unavailable here; Actions/Pages status not confirmed.
- Note: pushed to the designated branch `claude/funny-ramanujan-f42xvc` and to `main` per the run protocol.
- Next: C6b (Structural Bridges lessons).

## 2026-11-04: C6b Structural Bridges lessons
- New `content/lessons/structural-bridges.ts`: 7 L4 lessons (Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy), registered and shown on `/learn`. Each has a smell, a compiling before/after C++ pair with recorded output, refactor notes with the trade-off and deciding factor, an interview signal and the cost of over-applying it. Highlights: object vs class adapter, Bridge as M+N vs M x N grid (and vs Strategy), Composite `add()` transparency vs safety, Decorator order shown with truncate/bracket (a pair where order changes the output), Facade staying thin, Flyweight as a measured optimisation with immutable `shared_ptr<const T>`, caching Proxy with the non-const interface and invalidation caveats.
- `content/verify/solid-lessons.verify.ts` and `tests/lessons.test.ts` now cover all three lesson sets; every before/after compiles natively, prints the recorded output, and every `after` is Senior Review clean (first run).
- Verification: `content:verify` (lessons file, 21 pass), `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (397 pass), `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: `/learn/proxy` viewed; no console errors, no horizontal overflow.
- Known gaps: only the top of the lesson page was screenshotted (code blocks use the existing lesson renderer, unchanged).
- CI/deploy: `gh` unavailable here; the Actions quota note has expired, so status was not confirmed.
- Note: pushed to `main` per the run protocol; the designated branch `claude/funny-ramanujan-2ffozu` is fast-forwarded to match.
- Next: C6c (seven judged exercises, 3 runs).

## 2026-11-04: C6c1 Bridges exercises: adapter, bridge, composite
- C6c split into C6c1 (done), C6c2 (decorator, facade) and C6c3 (flyweight, proxy). Three new full packages (api.h, prompt, starter, reference, tests, meta with hint ladder): **adapter-payments** (cents/`std::string`/enum over a vendor `LegacyBank` with dollars/C-string/codes; holds the vendor by reference; impossible requests never reach the bank), **bridge-renderer** (`Shape` x `Renderer` with SVG and text backends, runtime `setRenderer`, `Drawing::useRenderer`, tests use a test-local backend to prove shapes depend only on the interface), **composite-fs** (`File`/`Directory`, recursive size/count/render, path `find`, duplicate/null/self rejection).
- 12 known-wrong solutions in total (4 each), each rejected for the documented tests: integer division, vendor copied by value, all failures declined, bank called on invalid input; set-renderer ignored, open rectangle outline, move ignored, retarget first shape only; shallow size, shallow find, duplicates allowed, leaf `find` matches anything.
- Caught while writing: a test indexing past the end of a vector crashed the binary and hid later test results for a wrong solution; guarded with `ASSERT_EQ(size)`.
- Verification: `content:verify` for the three exercises (15 pass: reference accepted, Senior Review clean, starter not accepted, all wrongs rejected), `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (400 pass), `build`, `build:pages` pass. No visual change, so no screenshots.
- Known gaps: the exercises are registered in the metadata registry but not yet offered by an in-game screen; `content:verify` for the other exercises not rerun.
- CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Next: C6c2 (decorator-stream, facade-checkout).

## 2026-11-04: C6c2 Bridges exercises: decorator, facade
- Two new full packages (api.h, prompt, starter, reference, tests, meta with hint ladder). **decorator-stream**: `Upper`/`Truncate`/`Bracket`/`Counting` writers over a `Writer` interface (with `flush`), each owning its inner writer via `unique_ptr` through a shared decorator base; tests prove the wrapping order is the caller's choice (`[ab` vs `[abc]`), flush reaches the innermost writer and the whole chain is destroyed once. **facade-checkout**: a `Checkout` facade over `Inventory`/`Payments`/`Shipping`/`Mailer` held by reference; tests use call-logging fakes to prove the order (validate, reserve, charge, ship, email), the compensation (release on decline), no email on failure and that subsystems stay usable directly.
- 9 known-wrong solutions (4 + 5): no flush forward, truncate off by one, bracket skips empty, leaks inner; no release on decline, charge before reserve, skips validation, emails on decline, charges unit price only. Each is rejected for the documented tests.
- Caught while writing: my first three-layer decorator expectation was wrong by hand (`HELL` instead of `[HEL`); the native judge caught it before the reference was accepted.
- Verification: `content:verify` for both exercises (10 pass: reference accepted, Senior Review clean, starter not accepted, all wrongs rejected), `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (402 pass), `build`, `build:pages` pass. No visual change, so no screenshots.
- Known gaps: exercises are in the metadata registry but not yet offered by an in-game screen; `content:verify` for the other exercises not rerun.
- CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Next: C6c3 (flyweight-glyphs, proxy-cache).

## 2026-11-04: C6c3 Bridges exercises: flyweight, proxy (closes C6c)
- Two new full packages (api.h, prompt, starter, reference, tests, meta with hint ladder). **flyweight-glyphs**: an immutable `Glyph` (intrinsic state) shared through a `GlyphFactory` keyed by (char, font, size) and returned as `shared_ptr<const Glyph>`; `TextLine` keeps the position (extrinsic state) beside the shared glyph. Tests prove sharing with a construction counter, key sensitivity, const-ness (`static_assert`), running positions across mixed styles, and cross-line sharing. **proxy-cache**: `CachingStore` (same `Store` interface, write-through with no stale value, a missing key is not remembered) and `LazyStore` (virtual proxy: created on first use, exactly once, owned), plus stacking.
- 9 known-wrong solutions (4 + 5): new object per request, key ignores size, key ignores font, width counts distinct glyphs; caches nothing, stale after put, caches "missing" as empty, lazy but eager, lazy but rebuilds each call. Each is rejected for the documented tests.
- Design note: the judge compiles without exceptions (like the browser), so `Store::get` returns `std::optional<std::string>`; "do not cache the failure" became "do not cache the miss".
- Verification: `content:verify` for both exercises (10 pass: reference accepted, Senior Review clean, starter not accepted, all wrongs rejected). `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (404 pass), `build`, `build:pages` pass. No visual change, so no screenshots. CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Known gaps: the exercises are in the metadata registry but not yet offered by an in-game screen (C6e).
- Next: C6d (Bridges art: 7 Patternling sprites, tileset, backdrop).

## 2026-11-05: C6d1 Bridges Patternling sprites (verified and closed)
- The previous run committed the art (`game/sprites/creatures/{axolink,bridgeback,fractree,shellcrab}.ts`, generator `scripts/art/bridges.mjs`, registered in `game/sprites/index.ts`) but was cut off before ticking the box or logging. This run reviewed it and closed the box.
- Designs: Axolink (axolotl with a plug-adapter tail), Bridgeback (turtle carrying an arched bridge, flag), Fractree (tree whose crowns repeat as small trees), Shellcrab (crab wearing nested shells, the Decorator). 64x64, 3-4 shade ramps, outlines, idle(4)/attack(3)/hurt(2)/faint(4)/evolve(4).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (424 pass), `build`, `build:pages` pass. Playwright on the static export at desktop 1280x800 and iPhone 14: `/dev/sprites` viewed for all four creatures; clear silhouettes, no console errors, no horizontal overflow.
- Known gaps: no back sprites for the Bridges set yet (the front sprites are what battles use today). CI/deploy not checked.
- Next: C6d2 (Facadeon, Flytile, Proxifox sprites).

## 2026-11-05: C6d2 Facadeon, Flytile, Proxifox sprites
- Three new 64x64 Patternlings via `scripts/art/bridges2.mjs`, registered in `game/sprites/index.ts` (idle 4, attack 3, hurt 2, faint 4, evolve 4). **Facadeon** (Facade): cream house-front with one door and a face; a tangle of pipes and wires hides behind it. **Flytile** (Flyweight): teal mosaic tile with a row of tiny identical tiles behind it (shared glaze, differing position). **Proxifox** (Proxy): orange fox holding a blank stand-in mask, with a pale ghost of the real subject behind.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (439 pass), `build`, `build:pages` pass. Playwright on the static export at desktop 1280x800 and iPhone 14: `/dev/sprites` viewed (contact sheets plus page); all three read clearly, no console errors, no horizontal overflow. `content:verify` not rerun (no content change).
- Known gaps: no back sprites for the Bridges set. CI/deploy: `gh` is unavailable in this environment, so Actions/Pages status was not confirmed.
- Next: C6d3 (Bridges tileset and battle backdrop).

## 2026-11-05: C6d3 Bridges tileset and battle backdrop (closes C6d)
- New harbour tileset `game/sprites/tiles/bridges.ts` (generator `scripts/art/bridges-tiles.mjs`): sandstone quays, animated tidal water and quay edge, plank bridge deck with rails, stone arch arcade, wooden piles, teal-roofed warehouse with lit windows and door, harbour crane (swinging hook), bobbing boat, bollard, crates, rope coil, barrels, lamps, district sign, flag. 29 tiles, 16x16, animated water/boat/lamps/crane.
- `BRIDGES_SCENE`/`BRIDGES_ROWS`/`BRIDGES_LEGEND` added (map rows reusable for C6e) and shown on `/dev/sprites`. New `bridges` battle scene (golden-hour harbour, far warehouses, crane, three-arch stone bridge, plank quay floor, teal mooring pads); the `structural-bridges` deck now uses it.
- Verification: `lint` (0 errors; no new warnings), `typecheck`, `test` (443 pass, incl. new tileset and deck-scene assertions), `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: `/dev/sprites` scene and `/battle?deck=structural-bridges` viewed; legible, no console errors, no horizontal overflow. `content:verify` not rerun (no content change).
- Known gaps: no interior (Bridges Hall) tiles yet. CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Note: pushed to the designated branch `claude/funny-ramanujan-pizupa` and to `main`.
- Next: C6e (Bridges map, trainers, pattern duels, hall, master and badge); it is large, so split it first.

## 2026-11-05: C6e1 Structural Bridges overworld map and Foundry east gate
- New `BRIDGES` map (`lib/world/maps.ts`, from `BRIDGES_ROWS`, legend, tileset wired in `OverworldGame`): west-bank warehouse, tidal channel crossable only by the plank bridge, crane, lamps, crates, boats and an arcade. Two-tile east gate from the Creational Foundry and a matching west gate back; `sign-bridges` added and the Foundry sign now points east. The flag tile moved one column in `BRIDGES_ROWS` so both gate landings are walkable. The warehouse door is scenery until C6e3.
- Tests: gate round trip, crossing the channel on the bridge row only (water above and below blocks), warehouse blocked, sign read; the existing "every warp lands on a walkable tile" test covers the new warps.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (446 pass), `build`, `build:pages` pass. Playwright on a throwaway static build with a temporary start position (reverted), desktop 1280x800 and iPhone 14: map viewed, bridge walkable, no horizontal overflow; only console error was the missing `sw.js` of that non-Pages build. `content:verify` not rerun (no content change).
- Known gaps: no trainers yet, no Bridges hall.
- Next: C6e2 (two trainers, portraits, dialogue and pattern duels).

## 2026-11-05: C6e2 Bridges trainers Nerys Quay and Tobin Reef
- Two trainers on the Structural Bridges map: **Nerys Quay** (west bank; yellow oilskin, clipboard pencil) duels on Adapter, Facade and Proxy; **Tobin Reef** (east bank across the plank bridge; sea-green knit, glasses, rope-coil pack) duels on Composite, Decorator, Bridge and Flyweight. Each has a 24x32 walker, 48x48 portrait (via `scripts/art/characters.mjs`), an intro dialogue with a design question and trade-off answer, a `TrainerProfile` (six cards from `structural-bridges`, no overlap between the two pools) and a Play-menu entry (`/battle?trainer=nerys-quay`, `tobin-reef`).
- Tests: placement/reachability/art/dialogue for both trainers on the Bridges map, duel scripts name their Battle-menu entry, pool sizes and disjointness.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (455 pass), `build`, `build:pages` pass. Playwright on a throwaway static build with a temporary start position (reverted), desktop 1280x800 and iPhone 14: both trainers visible on their banks, Nerys's dialogue with portrait opens, no horizontal overflow; only console error is the missing `sw.js` of that non-Pages build.
- Known gaps: no Bridges hall yet; the warehouse door is scenery until C6e3.
- CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Next: C6e3 (Bridges hall, master and badge; split first).

## 2026-11-05: C6e3a Bridges Hall and Harbourmaster Vale placed
- New `bridges-hall` map (14x10; plank floor, stone runner, crates, barrels, windows, flag) with a warp from the warehouse door (4,2) on the Bridges map and a two-tile return at the bottom of the runner. Added `BRIDGES_HALL_ROWS`/`BRIDGES_HALL_SCENE` (legend gained `d` plain plank) and the scene on `/dev/sprites`.
- Harbourmaster Vale (master): 24x32 walker and 48x48 portrait via `scripts/art/characters.mjs` (long navy coat, pinned silver-streaked braid), `vale-intro` dialogue (Adapter vs editing every call site, with the cost stated), wired into overworld and portraits. Other characters regenerated unchanged.
- Tests: door warp, reaching and facing Vale, return warp, walker/portrait/dialogue exist; the old "warehouse blocked" test now checks the walls beside the door.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (461 pass), `build`, `build:pages` pass. Playwright on the Pages export at desktop and iPhone 14: `/dev/sprites` hall scene viewed, no console errors, no horizontal overflow. `content:verify` not rerun (no content change).
- Known gaps: Vale's formal fight is not ready (dialogue says so). CI/deploy not checked (Actions quota note ended 2026-11-01, but `gh` is unavailable here).
- Next: C6e3b (Vale master fight and badge).

## 2026-11-09: C6e3b Harbourmaster Vale master fight and Bridges Badge (closes C6e, C6)
- New 96x96 master sprite via `scripts/art/vale.mjs` (`harbourmaster-vale`; idle 4, attack 4, hurt 2, faint 4): long navy coat with brass buttons and teal sash, dark hair with silver streaks in a pinned bun, a signal lantern in one hand and a plank bridge model that unfolds into an arch on attack. Registered on `/dev/sprites`.
- `content/masters/structural-bridges.ts` (profile, three phases, seven structure drills to choose from in phase 2) and `structural-bridges-smells.ts` (7 original smell cards: vendor-leaking adapter, shape x renderer class explosion, wrapper order, composite for a flat list [restraint card], god facade, mutable flyweight, stale caching proxy). Registered as `/battle/master?master=structural-bridges` with the `bridges` backdrop; badge `structural-bridges` is saved by the generic master flow. Vale's dialogue now points to the Battle menu; Play menu entry added.
- Tests: master suite (smell cards valid and disjoint from the deck, phase-1 pool >= 15, all seven exercises registered and loadable, `?master=` selection, a clean run earns the badge) and sprite assertions.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (471 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/battle/master?master=structural-bridges` viewed; Vale and the harbour backdrop read clearly, no console errors, no horizontal overflow. `content:verify` not rerun (no exercise change).
- Known gaps: no back sprites for the Bridges set; Vale's lantern is small at battle scale. CI/deploy: `gh` is unavailable here, so Actions/Pages status was not confirmed.
- Next: C7 (Behavioural Theatre; split first).

## 2026-11-09: C7a Behavioural Theatre deck, part 1 (and C7 split)
- Split C7 into C7a (deck part 1), C7a2 (deck part 2), C7b (lessons), C7c (11 exercises), C7d (art), C7e (map, trainers, master).
- New `content/cards/behavioural-theatre.ts`: 30 original cards, five per pattern for Strategy, Observer, Command, State, Template Method and Iterator (mcq, pattern, predict, smell). Predict cards cover stable_sort with a swappable ordering, `weak_ptr` observers (expired observer skipped), command history with undo, a turnstile State machine, NVI Template Method with a hook, and a custom range-for iterator. Registered as `?deck=behavioural-theatre` (borrows the Bridges backdrop until C7d) with a Play-menu entry.
- Patternling names reserved for the pattern cards (art in C7d): Swapaw (Strategy), Watchowl (Observer), Scrollhound (Command), Chamelyn (State), Stencilmoth (Template Method), Stepede (Iterator).
- Verification: `content/verify/theatre-cards.verify.ts` compiles and runs every predict card natively (a first run caught a trailing-space mismatch, fixed). `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (472 pass), `build`, `build:pages` pass; `content:verify` (8 files, 199 tests, ~10 min) passes. Playwright on the Pages export at desktop 1280x800 and iPhone 14: `/battle?deck=behavioural-theatre` viewed, card text readable, no console errors, no horizontal overflow.
- Known gaps: deck has no Chain of Responsibility, Mediator, Memento, Visitor, Interpreter, Null Object or Specification cards yet. Actions quota note ended 2026-11-01 but `gh` is unavailable here, so CI/deploy were not confirmed.
- Next: C7a2 (deck part 2).

## 2026-11-09: C7a2 Behavioural Theatre deck, part 2
- New `content/cards/behavioural-theatre-2.ts`: 35 original cards, five each for Chain of Responsibility, Mediator, Memento, Visitor, Interpreter, Null Object and Specification (mcq, pattern, predict, smell), merged into `BEHAVIOURAL_THEATRE_DECK` (now 65 cards). Predict cards: approval chain with a fall-off-the-end fallback, chat-room mediator, `Snapshot` memento with a private constructor, two Visitors over shapes, an expression-tree interpreter, a NoAudit null object, composed specifications. Cards include honest over-application and limits (Mediator as god object, Visitor cost of new elements, Interpreter ceiling, Null Object hiding essential failures, Specification vs a lambda). Patternling names reserved for C7d: Relayrat, Hubhen, Snapsnail, Visitrix, Glyphpup, Nullnewt, Sieveling.
- Verification: `content/verify/theatre-cards.verify.ts` (compiles and runs every predict card natively; every pattern has >= 5 cards and a predict card) passes; `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (472 pass), `build`, `build:pages` pass. Full `content:verify` not rerun (only this file changed). Playwright on the Pages export at desktop 1280x800 and iPhone 14: `/battle?deck=behavioural-theatre` shows "65 left", predict card readable, no console errors, no horizontal overflow.
- Known gaps: no event-driven design cards yet (planned with the lessons in C7b); art still borrows the Bridges backdrop until C7d. `gh` is unavailable here, so CI/Pages status was not confirmed.
- Next: C7b (lessons, split by 4 patterns per run).

## 2026-11-09: C7b1 Behavioural Theatre lessons, part 1 (Strategy, Observer, Command, State)
- New `content/lessons/behavioural-theatre.ts` (L5) with four lessons in the house format (intro, smell, before/after C++ programs, refactor notes with trade-offs, interview signal, over-application cost). Strategy covers virtual vs template vs `std::function`; Observer stores `weak_ptr` listeners and prunes expired ones (lapsed-listener and re-entrancy notes); Command has execute/undo with two stacks and clears redo on a new action; State returns the next state from each handler so a state is never destroyed mid-call. Registered in the lesson registry and `/learn`; each lesson drills its `L5.*` card topic.
- Verification: `content/verify/solid-lessons.verify.ts` now includes these four (compile, exact output, Senior Review clean); the four plus the well-formed check pass. `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (473 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/learn/state/` and `/learn/` viewed, readable, no console errors, no horizontal overflow. Full `content:verify` not rerun (only the lesson file changed).
- Known gaps: seven more patterns plus Specification and event-driven lessons (C7b2 to C7b4). `gh` is unavailable here, so CI/Pages status was not confirmed.
- Next: C7b2 (Template Method, Iterator, Chain of Responsibility, Mediator).

## 2026-11-09: C7b2 Behavioural Theatre lessons, part 2 (Template Method, Iterator, Chain of Responsibility, Mediator)
- New `content/lessons/behavioural-theatre-2.ts` (L5): four lessons in the house format, registered in the lesson registry and `/learn`. Template Method uses NVI (public non-virtual `run()`, private virtual steps, an empty-default hook) and the before shows a copy-paste-drifted missing `close`. Iterator exposes `begin()/end() const` instead of a mutable `vector&` (before consumes the list it only meant to read). Chain of Responsibility links `unique_ptr` handlers with an explicit "nobody approves" at the end and discusses the table-of-limits alternative. Mediator routes a lobby's "everyone ready" rule through one class that stores names, not pointers, and states the god-object risk.
- Tests: `tests/lessons.test.ts` now asserts the eight L5 ids in order; `content/verify/solid-lessons.verify.ts` includes the new lessons (each before/after compiles natively, prints the recorded output, after is Senior-Review clean).
- Verification: the four new lessons plus the well-formed check pass in `content:verify` (file filtered; full suite not rerun). `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (473 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/learn/mediator/` viewed, readable, no console errors, no horizontal overflow.
- Known gaps: Memento, Visitor, Interpreter, Null Object, Specification and event-driven lessons still to come. `gh` is unavailable here, so CI/Pages status was not confirmed (Actions quota note ended 2026-11-01).
- Next: C7b3 (Memento, Visitor, Interpreter, Null Object).

## 2026-11-09: C7b3 Behavioural Theatre lessons, part 3 (Memento, Visitor, Interpreter, Null Object)
- New `content/lessons/behavioural-theatre-3.ts` (L5): four lessons in the house format, registered in the lesson registry and `/learn`. Memento uses a nested `Snapshot` with a private constructor and `friend class Editor` (before: the caller forgot to restore the cursor). Visitor shows double dispatch, a stateful second visitor and the expression-problem trade-off, with `std::variant`/`std::visit` as the lighter alternative (before: a `dynamic_cast` ladder that prints "unknown shape" for a new type). Interpreter builds `unique_ptr` expression trees with a variable context (before: a left-to-right loop gets `2+3*4` wrong as 20). Null Object normalises a null `unique_ptr<Logger>` to `NullLogger` in the constructor and says when no-op is the wrong default.
- Tests: `tests/lessons.test.ts` asserts all twelve L5 ids in order; `content/verify/solid-lessons.verify.ts` includes the new lessons (compile, exact output, Senior Review clean).
- Verification: the four new lessons plus the well-formed check pass in `content:verify` (filtered; full suite not rerun). `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (473 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/learn/visitor/` and `/learn/null-object/` viewed, no console errors, no horizontal overflow. The screenshot showed lesson markdown does not render single-asterisk italics, so the new prose avoids them.
- Known gaps: Specification and event-driven lessons (C7b4). `gh` is unavailable here, so CI/Pages status was not confirmed.
- Next: C7b4 (Specification and event-driven design).

## 2026-11-10: C7b4 Behavioural Theatre lessons, part 4 (Specification, event-driven design); C7b done
- New `content/lessons/behavioural-theatre-4.ts` (L5), registered in the lesson registry and `/learn`. Specification: one named rule as `unique_ptr`-owned leaf and `AndSpec`/`NotSpec` composites (before: two copies of a rule where one drifted from `>=` to `>`), with the plain-lambda alternative and query translation as the deciding factor. Event-driven: a past-tense `OrderPlaced` fact, a queued `EventBus` with per-handler failure isolation (before: the service calls every consumer), contrasted honestly with synchronous observer and event sourcing, plus ordering, at-least-once delivery, idempotent handlers, dead-letter queue and outbox. The event-driven lesson drills the `L5.observer` cards (no dedicated event cards yet).
- Tests: `tests/lessons.test.ts` asserts all fourteen L5 ids in order; `content/verify/solid-lessons.verify.ts` includes the new lessons (compile, exact output, Senior Review clean) and passes with the well-formed check.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (473 pass), `build`, `build:pages` pass. Playwright on the Pages export (served under `/blueprint-clash`), desktop 1280x800 and iPhone 14: `/learn/specification/` and `/learn/event-driven/` viewed, readable, no console errors, no horizontal overflow. Full `content:verify` not rerun (only the lesson file changed). `gh` is unavailable here, so CI/Pages status was not confirmed.
- Known gaps: no dedicated event-driven cards in the deck.
- Next: C7c (eleven judged exercises, 3-4 per run).

## 2026-11-10: C7c1 Behavioural Theatre exercises, part 1 (Strategy, Observer, Command, State)
- Four new judged packages (api/prompt/meta/starter/reference/tests/wrong), registered in `content/exercises/registry.ts`:
  - `strategy-ranker`: `RankingPolicy` strategies behind a `Leaderboard`; stable ties, runtime swap, a policy defined in the tests proves open/closed. Six wrong solutions (hard-coded rule, `std::sort`, non-strict `>=`, ignored swap, null policy stored, `top()` overrun).
  - `observer-topic`: `Topic` holding `weak_ptr` listeners; no lifetime extension, duplicate-subscribe guard, snapshot iteration for re-entrant (un)subscribe, pruning. Five wrongs (shared_ptr leak, no pruning, duplicates, live-list iteration, reversed order).
  - `command-undo`: `AppendCommand`, `EraseCommand` (saves what was actually removed) and a two-stack `History` that clears redo on a new action. Six wrongs.
  - `state-document`: draft/review/published workflow with one class per state, handlers return the next state, refused actions change nothing. Five wrongs.
- The judge builds without exceptions, so the strategy exercise falls back to `HighestScore` on a null policy instead of throwing (documented in its prompt). A wrong that crashes the test binary only reports its first failing test, so those entries list one test.
- Verification: `content:verify` filtered to the four ids (20 tests: load/valid, reference accepted, Senior Review clean, starter not accepted, every wrong rejected as documented) passes; `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (477 pass), `build`, `build:pages` pass. No UI change, so no screenshots this run; full `content:verify` not rerun.
- Known gaps: exercises are not yet attached to Theatre lessons or a gym (C7e). `gh` is unavailable here, so CI/Pages status was not confirmed.
- Next: C7c2 (Template Method, Iterator, Chain of Responsibility, Mediator).

## 2026-11-10: C7c2 Behavioural Theatre exercises, part 2 (Template Method, Iterator, Chain of Responsibility, Mediator)
- Four new judged packages (api/prompt/meta/starter/reference/tests/wrong), registered in `content/exercises/registry.ts` and listed in `tests/exercises.test.ts`:
  - `template-report`: `ReportGenerator` with a public non-virtual const `generate()`, private virtual steps and an optional footer hook; rows() called exactly once. Six wrongs (rows twice, footer before rows, hook never called, no empty placeholder, pure-virtual hook and non-const generate as compile rejections).
  - `iterator-roster`: `Roster::const_iterator`, a forward iterator that hides tombstones at the start, middle and tail, with the five typedefs, const-reference deref and correct post-increment. Seven wrongs (skip-one-only, no skip in begin, no skip after increment, size counts slots, post-increment returns new, by-value deref and missing typedefs as compile rejections).
  - `chain-approval`: `Approver` links that own their successor, `then()` returns the appended link, stop at the first approver, explicit "rejected" fallback; a test-only `BlocklistApprover` and a call-counting spy prove extension and short-circuit. Seven wrongs.
  - `mediator-lobby`: `Lobby` owning fan-out and the start rule (>= 2 players, all ready, announced once, re-checked on `leave`). Seven wrongs.
- Wrong solutions are derived from each reference by a one-edit-per-bug script (kept out of the repo), so each documented bug is the only difference.
- Verification: `content:verify` filtered to the four ids (20 tests: valid, reference accepted, Senior Review clean, starter not accepted, every wrong rejected as documented) passes; `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (481 pass), `build`, `build:pages` pass. No UI change, so no screenshots this run; full `content:verify` not rerun. `gh` is unavailable here, so CI/Pages status was not confirmed.
- Known gaps: exercises are not yet attached to Theatre lessons or a gym (C7e).
- Next: C7c3 (Memento, Visitor, Interpreter).

## 2026-11-10: C7c3 Behavioural Theatre exercises, part 3 (Memento, Visitor, Interpreter); C7c done
- Three new judged packages (api/prompt/meta/starter/reference/tests/wrong), registered in `content/exercises/registry.ts` and `tests/exercises.test.ts`:
  - `memento-editor`: `Editor` with a nested sealed `Snapshot` (private constructor, `friend class Editor`, no getters) and a `History` caretaker. Hidden tests use type traits to reject a public or default constructor. Six wrongs (snapshot by reference, forgotten cursor, public constructor, oldest-first undo, empty undo wipes the editor, typing ignores the cursor).
  - `visitor-basket`: `ItemVisitor` with three overloads, `Goods`/`Service`/`Voucher` with one-line `accept`, an owning `Basket` visiting in insertion order, `TotalVisitor`. Tests add a receipt visitor and a counter without touching the items. Six wrongs (ignored quantity, service billed once, voucher added, reverse order, voucher never accepts, null stored then dereferenced).
  - `interpreter-calc`: expression tree (`Num`, `Var`, `Add`, `Sub`, `Mul`, `Div`) with `std::optional` results because the judge has no exceptions; errors propagate, tree is re-evaluable under many `Context`s, `show()` fully parenthesised; tests nest their own `Negate` rule. Six wrongs (unknown variable is 0, divide-by-zero crash, swapped subtraction, errors read as 0, no parentheses, variable caches first context).
- Wrongs derived from each reference by a one-edit-per-bug script (kept out of the repo). All 11 Theatre pattern exercises now exist, so C7c is ticked (Null Object and Specification have lessons and cards but no exercise; not planned).
- Verification: `content:verify` filtered to the three ids (15 tests) passes; `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (484 pass), `build`, `build:pages` pass. No UI change, so no screenshots; full `content:verify` not rerun. `gh` is unavailable here, so CI/Pages status was not confirmed (quota note ended 2026-11-01).
- Known gaps: exercises are not yet attached to Theatre lessons or a gym (C7e).
- Next: C7d (Theatre art: 11 Patternling sprites, 3-4 per run).

## 2026-11-10: C7d1 Theatre art, part 1 (Chamelstrat, Owlserver, Commandant)
- New `scripts/art/theatre1.mjs` generates three 64x64 Patternlings (idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4): Chamelstrat (Strategy: chameleon with three swappable colour patches, one active), Owlserver (Observer: owl on a perch whose hoot rings reach a row of bell-chicks), Commandant (Command: officer-toad with a sealed order scroll). Registered in `game/sprites/index.ts`, so they show on `/dev/sprites`.
- ROADMAP: C7d split into C7d1-C7d4.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (499 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/dev/sprites/` viewed, sprites readable, no console errors, no horizontal overflow. CI/Pages deploy not checked (`gh` unavailable here).
- Known gaps: no back sprites for these (same as other Patternlings); not yet used in a map or duel (C7e).
- Next: C7d2 (Shapeshift, Templar, Inchworm, Antchain).

## 2026-11-10: C7d2 Theatre art, part 2 (Shapeshift, Templar, Inchworm, Antchain)
- New `scripts/art/theatre2.mjs` generates four 64x64 Patternlings (idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4): Shapeshift (State: gel blob re-tinting teal/amber/violet with a mode dial), Templar (Template Method: mason beetle with a stencil of fixed rungs and one lit hook), Inchworm (Iterator: segmented worm with a cursor ring), Antchain (Chain of Responsibility: ant with linked rings and a parcel). Registered in `game/sprites/index.ts` and shown on `/dev/sprites`.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (519 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/dev/sprites/` viewed, new sprites readable, no console errors, no horizontal overflow. `content:verify` not rerun (no content change). `gh` is unavailable here, so CI/Pages status was not confirmed.
- Known gaps: no back sprites; not yet used in a map or duel (C7e).
- Next: C7d3 (Mediowl, Mementortoise, Visitorb).

## 2026-11-10: C7d3 Theatre art, part 3 (Mediowl, Mementortoise, Visitorb)
- New `scripts/art/theatre3.mjs` generates three 64x64 Patternlings (idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4): Mediowl (Mediator: headset operator with three cables to peer nodes, one pinged at a time), Mementortoise (Memento: tortoise with a sealed shell hatch and a ghost shell as the snapshot), Visitorb (Visitor: lens-orb whose beam visits a square, circle and triangle). Registered in `game/sprites/index.ts`, shown on `/dev/sprites`.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (534 pass), `build`, `build:pages` pass. Contact sheets reviewed; Playwright on the Pages export, desktop and iPhone 14: `/dev/sprites/` loads, new names present, no console errors, no horizontal overflow. `content:verify` not rerun (no content change). `gh` unavailable, so CI/Pages status not confirmed.
- Known gaps: Visitorb's ring is faint; no back sprites; not yet used in a map or duel (C7e).
- Next: C7d4 (Theatre tileset and battle backdrop).

## 2026-11-10: C7d4 Theatre tileset and battle backdrop (closes C7d)
- New playhouse tileset `game/sprites/tiles/theatre.ts` (generator `scripts/art/theatre-tiles.mjs`): violet plaza paving, plank stage boards (plus a taped spike mark), red velvet carpet, chasing-bulb footlights, plum plaster walls, slate roof and eave, lit windows, studded stage door, marquee with comedy/tragedy masks (animated bulbs), curtain left/mid/right, pelmet, gilded column top/base, spotlight, seats, poster easel, ticket booth, costume trunk, mask sign, lamp, bunting, laurel. 31 tiles, 16x16.
- `THEATRE_SCENE`/`THEATRE_ROWS`/`THEATRE_LEGEND` added (rows reusable for C7e) and shown on `/dev/sprites`. New `theatre` battle scene (proscenium with swagged pelmet and tied-back velvet curtains, painted night-sky flat, plank stage, footlights, gilt spotlight-pool platforms); the `behavioural-theatre` deck now uses it (was borrowing the harbour).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (538 pass, incl. new tileset and deck-scene assertions), `build`, `build:pages` pass. Playwright on the static export, desktop 1280x800 and iPhone 14: `/dev/sprites` scene and `/battle?deck=behavioural-theatre` viewed; legible, no console errors, no horizontal overflow. `content:verify` not rerun (no content change). CI/Pages not checked (`gh` unavailable here).
- Known gaps: no interior (Theatre Hall) tiles beyond the stage rows; door tile is small relative to the marquee.
- Next: C7e (Theatre map, trainers, duels, hall, master and badge); split it like C6e first.

## 2026-11-10 - C7e1: Behavioural Theatre overworld map
- Added the `theatre` map in `lib/world/maps.ts` from `THEATRE_ROWS` (plaza walkable; playhouse, booth, curtain and stage scenery solid), a two-tile east gate from the Bridges (x=19, rows 5-6) and a west gate back, `sign-theatre` dialogue, `THEATRE_TILES` wired into the overworld, and updated the Bridges sign.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (540 pass, incl. 2 new Theatre world tests), `build`, `build:pages` pass. No Playwright walk this run (the map reuses the scene already reviewed on `/dev/sprites`); CI/Pages confirmation skipped because `gh` is unavailable here.
- Known gaps: no trainers or hall yet.
- Next: C7e2 (two trainers and duels).

## 2026-11-10 - C7e2: Theatre trainers Ilsa Cue and Perrin Wick with pattern duels
- Two new trainers on the Behavioural Theatre plaza (`lib/world/maps.ts`): Ilsa Cue (stage manager; Strategy, Observer, Command, State) and Perrin Wick (prop master; Template Method, Iterator, Chain of Responsibility, Mediator). Each has a 24x32 walker, 48x48 portrait (generated by `scripts/art/characters.mjs`), an intro dialogue with a trade-off answer, a `TrainerProfile` duel of six cards drawn from the `behavioural-theatre` deck (disjoint pools), and a Battle-menu entry in `lib/siteInfo.ts`.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (549 pass, incl. new reachability/art/dialogue test for the Theatre and trainer-pool tests), `build`, `build:pages` pass. Playwright on the static export, desktop 1280x900 and iPhone 14: `/dev/sprites` walkers and portraits viewed, readable, no console errors, no horizontal overflow. The in-map placement was verified by the flood-fill test, not by a screenshot walk. `content:verify` not rerun (no content change). CI/Pages not checked (`gh` unavailable here).
- Known gaps: Ilsa's walker reads magenta more than black; no hall, master or badge yet.
- Next: C7e3 (Theatre hall interior, master fight and badge; split like C6e3).

## 2026-11-10 - C7e3a: Theatre Hall interior and Director Voss placed
- New `theatre-hall` map (`THEATRE_HALL_ROWS`, 14x10: stage-board floor, red carpet runner, trunks and posters along the walls, spotlight pool). The playhouse door (7,3) is now a warp (it was scenery); the runner's end warps back to the plaza. Director Voss (Theatre master) has a 24x32 walker, 48x48 portrait (generated by `scripts/art/characters.mjs`: plum frock coat, grey swept-back hair, round glasses), the `voss-intro` dialogue (Observer trade-off question), and is registered in the overworld and play client. Hall scene added to `/dev/sprites`.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (555 pass, incl. new Theatre Hall warp/NPC/art tests and hall-row legend test), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/dev/sprites/` hall scene viewed, readable, no console errors, no horizontal overflow on desktop. `content:verify` not rerun (no content change). CI/Pages confirmation skipped (Actions quota note; `gh` unavailable).
- Known gaps: Voss cannot be fought yet.
- Next: C7e3b (Voss master fight and Theatre Badge, like C6e3b).

## 2026-11-10 - C7e3b: Director Voss master fight and Theatre Badge (closes C7e, C7)
- New 96x96 master sprite via `scripts/art/voss.mjs` (`director-voss`; idle 4, attack 4, hurt 2, faint 4): plum velvet frock coat with gilt trim and crimson cravat, swept-back grey hair, round glasses, a gilt cue baton that lights on attack and a theatre mask that flips from comedy to tragedy. Registered on `/dev/sprites`.
- `content/masters/behavioural-theatre.ts` (profile, three phases, eleven pattern drills to choose from in phase 2) and `behavioural-theatre-smells.ts` (7 original smell cards: dangling raw-pointer observer, strategy as an int mode switch, boolean flags instead of State, virtual Template Method skeleton, god Mediator, Visitor on a moving type axis, Null Object hiding an essential failure). Registered as `/battle/master?master=behavioural-theatre` with the `theatre` backdrop; badge `behavioural-theatre` is saved by the generic master flow. Voss's dialogue points to the Battle menu; Play menu entry added.
- Tests: master suite (smell cards valid and disjoint from the deck, phase-1 pool >= 15, all eleven exercises registered and loadable, `?master=` selection, a clean run earns the badge) and sprite assertions.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (565 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/battle/master?master=behavioural-theatre` viewed; Voss and the theatre backdrop read clearly, no console errors, no horizontal overflow. `content:verify` not rerun (no exercise change). `gh` unavailable here, so CI/Pages status was not confirmed.
- Known gaps: no back sprites for the Theatre set; Voss's glasses read as a gold band at battle scale; Null Object and Specification still have no exercise.
- Next: C8 (Modelling and UML lessons and Design Board drills; split first).

## 2026-11-10 - C8a: Modelling lessons part 1 and the Drafting Studio deck
- Three L6 lessons in `content/lessons/modelling.ts`: requirements to entities (noun/verb analysis and CRC cards, library loans with a named `FinePolicy`), class-diagram relationships as C++ ownership (composition by value, aggregation as non-owning pointer, dependency as parameter), and state diagrams (vending machine, boolean flags to an `enum class` state). Each has smell, native-compiled before/after with recorded output, trade-offs, interview signal and over-application cost.
- New `modelling` deck (`content/cards/modelling.ts`, 12 mcq cards, topics `L6.entities`, `L6.class-diagram`, `L6.state-diagram`) registered as "Drafting Studio" on the Old Town backdrop (own art later). ROADMAP: C8 split into C8a-C8d.
- Verification: `content:verify` lessons suite (38 incl. the 3 new, review-clean) passes; `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (566 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop and iPhone 14: `/learn/class-diagram-ownership/` viewed, readable, no console errors, no horizontal overflow. CI/Pages not confirmed (`gh` unavailable here).
- Known gaps: no UML-reading cards or diagrams yet (need the Design Board, C8c); deck has no backdrop of its own.
- Next: C8b (sequence diagrams and extension-point lessons).

## 2026-11-10 - C8b: Modelling lessons part 2 (sequence diagrams, extension points)
- Two L6 lessons in `content/lessons/modelling-2.ts`: sequence diagrams with the failure path and a compensating `release()` (before output shows a declined order leaking stock and the next order wrongly "sold out"), and extension points from requirements (only the discount becomes a `DiscountRule` seam; `Cart` stays concrete). Each has smell, native-compiled before/after, trade-offs, interview signal and over-application cost. Ten new cards (`L6.sequence`, `L6.extension`) added to the `modelling` deck; registry and `tests/lessons.test.ts` updated.
- Verification: `content/verify/solid-lessons.verify.ts` (40 tests incl. both new lessons, compiled natively and review-clean) passes; `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (566 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop and iPhone 14: both lesson pages viewed, no console errors, no horizontal overflow; a stray single-asterisk italic that rendered literally was fixed. Full `content:verify` was not run to completion (slow); only the lessons suite. CI/Pages not confirmed (Actions quota).
- Known gaps: no UML-reading cards or diagrams (need the Design Board, C8c).
- Next: C8c (Design Board engine: pure-logic UML model, rubric scorer, tests).

## 2026-11-10: C8c Design Board engine (verification-only)
- On inspection the engine already exists in `lib/board/` (model with validation, edit operations, persistence, rubric scorer with phase limits and god-class/empty/unconnected flags, C++ skeleton generator) with 28 passing tests (`board`, `boardEdit`, `boardPersist`), including g++-compiled skeleton headers. No code change was needed; box ticked.
- Verification: lint (0 errors), typecheck, `npm test` (566 passed), build, build:pages passed. content:verify was still running when this entry was written (see below if updated). No visual change, so no screenshots. CI/deploy confirmation skipped (Actions quota).
- Known gaps: no UI yet; UML-reading cards still need diagrams.
- Next: C8d (Design Board UI and 4-6 drills with rubrics).

## 2026-11-10 - C8d: Design Board drills (closes C8)
- The Design Board UI already existed (workshop step 2). New standalone drills: `content/drills/` (4 drills: parking lot, elevator, vending machine, notification service; each with brief, responsibility rubric, reference board, trade-offs and SDE II/Senior/Staff level signal), routes `/board` and `/board/[id]` (draw, score, then reference + trade-offs), home tile, optional `finishLabel` on `DesignBoard`.
- Tests: `tests/boardDrills.test.ts` (reference scores 100% with no flags, each responsibility has one permitted owner, god-class and misplaced variants score lower and are flagged).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test` (586 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop and iPhone 14: `/board/parking-lot/` draw and result views read well, no console errors, no horizontal overflow. `content:verify` not rerun (no exercise change).
- Known gaps: the reference is text-only (no rendered diagram); drills do not feed XP/save yet; UML-reading cards still absent.
- Next: C9 (Race Hunter engine).

## 2026-11-10 - C9a: Race Hunter engine (interleaving explorer)
- New `lib/concurrency/`: step IR (load/store/set/lock/unlock/wait/notify/notifyAll/cas/atomicAdd/jmp/assert, each with an attached `cpp` line), pure `step` engine, `runSchedule` manual scheduler, and a breadth-first exhaustive `explore` (state-hash de-dup, shortest counterexample, `proved` only when the whole space is searched within the bound). Detects invariant/assertion failures, lockset data races, deadlock, lost wake-up, unlock-not-owned, wait-without-lock and lock leaks; optional spurious wake-ups. Sample programs in `samples.ts` (racy/locked/atomic counter, AB-BA deadlock and lock ordering, condvar handshake with unlocked producer / `if` wait / `while` wait). ARCH §5 and ROADMAP updated (C9 split into C9a/C9b).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test` (597 pass, 11 new in `tests/concurrency.test.ts`), `build`, `build:pages` pass. No visual change, so no screenshots; `content:verify` not rerun (no content change).
- Known gaps: `notify` wakes FIFO only (no nondeterministic choice of waiter); no memory-model reorderings (all steps sequentially consistent), stated in ARCH; no UI yet.
- Next: C9b (Race Hunter UI at `/race`).

## 2026-11-10 - C9b: Race Hunter UI at /race (closes C9)
- `/race` index and `/race/[id]` pages, `components/RaceHunter.tsx` (per-thread code panels with a program-counter marker, per-thread Step buttons, undo/reset, state and trace view, "Explore all interleavings" that replays the shortest counterexample or reports a bounded proof), `lib/concurrency/describe.ts` (plain-C++ line per IR step), `content/race/puzzles.ts` (2 puzzles: lost update with plain/mutex/atomic variants; opposite lock order with fixed ordering), home tile.
- Tests: `tests/raceHunter.test.ts` (explorer finds a bug in each buggy variant and proves each correct one; describe fallbacks).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test`, `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/race/lost-update/` viewed, readable, no console errors, no horizontal overflow; mutex variant shows "Proved". `content:verify` not rerun (no exercise change). CI/Pages: see below.
- Known gaps: the data-race detector fires before the lost-update value shows (explained in the goal text); no "pick the fix" scoring or XP yet; no ABA or condvar puzzles (C10).
- Next: C10 (Concurrency Docks: lessons, 12 puzzles, 5 C++ exercises; split first).

## 2026-11-11 - C10a: four more Race Hunter puzzles (6 of 12)
- New programs in `lib/concurrency/samples.ts` (`lazyInit`, `twoVariableInvariant`, `claimSlot`) and four puzzles in `content/race/puzzles.ts`: check-then-act (with `call_once` note), invariant across two atomics vs one mutex, load-then-store vs `compare_exchange_strong` slot claim (ABA caveat), and the condvar handshake (unlocked producer, `if` wait, `while` wait). ROADMAP: C10 split into C10a-C10d.
- Tests: existing `tests/raceHunter.test.ts` loops over every puzzle variant; the explorer finds a bug in each buggy variant and proves each correct one (21 tests, all pass).
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test` (618 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop and iPhone 14: `/race/claim-slot/` and `/race/wait-handshake/` viewed, readable, no console errors, no horizontal overflow. `content:verify` not rerun (no exercise change). CI/Pages not confirmed (no `gh`; checked via MCP below if available).
- Known gaps: raw `goto N` lines show for un-authored jumps; no puzzle selection/score/XP yet.
- Next: C10b (six more puzzles).

## 2026-11-11 - C10b: six more Race Hunter puzzles (12 of 12) and livelock detection
- Engine: new `trylock` op and a `livelock` finding (complete search, Tarjan SCCs, reported only when every unfinished thread steps inside the cycle, so a spin-wait on a flag is not flagged). The new check exposed a real bug in the existing `handshake("while-wait")` sample (a wrong jump target made the consumer loop forever, previously reported as "proved"); fixed.
- Puzzles (`lib/concurrency/samples.ts`, `content/race/puzzles.ts`): ABA lock-free stack (bare vs tagged), bounded buffer (one cv + notify_one loses a wake-up; notify_all and two cvs are correct), readers need the lock (skipped lock, split sections, one section), double-checked locking (plain, relaxed-reordered, release/acquire), flag publication (same three), polite livelock (try_lock retry, global order, one side insists). Relaxed-ordering variants are authored in the visible-order a relaxed store may take, since the engine is sequentially consistent (stated in notes and ARCH §5).
- Tests: every variant proved or caught; first-finding kinds pinned; try_lock, spin-not-livelock and livelock-lap replay tests. 646 pass.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test`, `build`, `build:pages` pass. Playwright on the Pages export, desktop and iPhone 14: `/race/polite-livelock/` and `/race/bounded-queue/` explore-all viewed, readable, no console errors, no horizontal overflow. `content:verify` not rerun (no exercise change).
- Known gaps: raw `goto N` lines for jumps; no shared-lock (shared_mutex) op; no puzzle score/XP.
- Next: C10c (L7 lessons).

## 2026-11-11 - C10c: L7 concurrency lessons and deck
- Six lessons in `content/lessons/concurrency-docks.ts` (share less and join, RAII mutex, condvar predicate, atomics check-then-act with CAS, deadlock and `scoped_lock`, thread pool with futures and clean shutdown), each with a before/after program, trade-offs, interview signal and over-application cost. Deterministic output: the bad interleaving is pinned with a latch/barrier or pause seam (documented in the file header), mirroring Race Hunter schedules. New 12-card deck `content/cards/concurrency-docks.ts` registered as the "Concurrency Docks" deck (Old Town backdrop for now). `compileAndRun` and `judgeNative` now pass `-pthread`.
- Caught while verifying: the first deadlock demo was nondeterministic (one thread timing out released its lock and let the other finish); fixed with a second barrier so neither releases until both have tried.
- Tests: `tests/lessons.test.ts` (L7 ids and card coverage). `content:verify` lessons file: all six new lessons compile, print the recorded output (stable over 3 runs) and pass Senior Review clean.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test` (647 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop and iPhone 14: `/learn/` and `/learn/atomics-check-then-act/` viewed, readable, no console errors, no horizontal overflow. CI/Pages confirmation: see note below.
- Known gaps: no predict-output cards for L7 yet; lessons run natively only (the wasm sysroot has no threads, ADR 0001), so the in-browser "try it" for these is not offered; the deck has no dedicated backdrop.
- Next: C10d (five judged C++ exercises and a gym). Per DECISIONS #2, the exercises use the deterministic cooperative thread shim.

## 2026-11-11 - C10d1: first two Concurrency Docks exercises
- New judged packages `content/exercises/locked-stats` (RAII `lock_guard`, atomic batch in one critical section, no lock leak on the early `return false`, reads locked too) and `ordered-transfer` (ascending-id lock ordering against the AB-BA trap, self-transfer must not double-lock, both locks released on every path). Both use an injected abstract `Lock` in `api.h` and a spy in the tests that records acquisitions, order and misuse, so they are deterministic with no threads and run the same natively and in the browser (DECISIONS #2). Each has a 3-rung hint ladder and 4 documented wrong solutions (unlocked read/reset, manual unlock leak, lock per element; source-first order, self-deadlock, leak on failure, locks only one).
- ROADMAP: C10d split into d1 (done), d2 (three more exercises), d3 (gym).
- Verification: `content:verify` exercises file filtered to both ids (reference passes, every wrong rejected as documented); `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test` (649 pass, ids added to `tests/exercises.test.ts`), `build`, `build:pages` pass. No visual change, so no screenshots. Full `content:verify` not rerun. Actions quota note expired on 2026-11-01; CI/Pages confirmation below.
- Known gaps: exercises are not yet reachable from a screen (the gym, C10d3); editorials for alternatives (address ordering, hierarchy levels, `std::scoped_lock`) live in prompts/hints only.
- Next: C10d2 (bounded blocking queue with a spy condition variable, once-init, cooperative task queue).

## 2026-11-11 - C10d2: three more Concurrency Docks exercises
- New judged packages: `blocking-queue` (bounded ring-buffer queue; `while` predicate loops on two conditions, notify the other side, lock for every operation), `lazy-once` (double-checked locking with `std::atomic<bool>` acquire/release; loser of the race must not reload; a failed load is not cached and must unlock), `task-queue` (worker loop and clean shutdown: tasks run outside the lock, drain on shutdown, `notifyAll` on shutdown, submit after shutdown rejected). New `Condition` seam in `api.h` (spy `wait` releases the lock, plays a script of a spurious wake-up then a real producer/consumer step, and re-locks), plus a pre-lock hook on the spy `Lock` to simulate "another thread won the race". No exceptions or threads, so tests are deterministic natively and in the wasm toolchain (DECISIONS #2). Each has a 3-rung hint ladder and 4 documented wrong solutions (12 total), all rejected the documented way.
- Verification: `content:verify` exercises file filtered to the three ids (15 tests: loads, reference accepted, Senior Review clean, starter not accepted, every wrong rejected); `lint`, `typecheck`, `npm test`, `build`, `build:pages` see below. No visual change, so no screenshots.
- Known gaps: not reachable from a screen yet (gym, C10d3); memory-order correctness of `lazy-once` is explained but cannot be proven by a sequentially consistent test (stated in the prompt).
- Next: C10d3 (Docks gym wired to the Concurrency deck and the five exercises).

## 2026-11-11 - C10d3a: Concurrency Docks tileset and scene
- New `scripts/art/docks-tiles.mjs` generating `game/sprites/tiles/docks.ts` (harbour tileset: cobbled quay, pier boards, 4-frame animated water and quay edge, brick warehouse, slate roof, shuttered windows, padlocked cargo door, crates (one padlocked), barrels, bollard, rope, crane, lanterns, net, bobbing boats). `DOCKS_LEGEND`, `DOCKS_ROWS` and `DOCKS_SCENE` in `scenes.ts`, scene added to `/dev/sprites`, tileset registered. ROADMAP: C10d3 split into d3a-d3d.
- Tests: `tests/tiles.test.ts` (opaque ground tiles, rectangular fully-mapped rows, animated water). `npm test` 656 pass.
- Verification: `lint` (0 errors; one new warning fixed, 8 pre-existing), `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/dev/sprites` Docks scene viewed, legible, no console errors, no horizontal overflow. `content:verify` not rerun (no content change). CI/Pages not confirmed (no `gh`).
- Known gaps: cargo door tile is small relative to the warehouse; no battle backdrop for the Docks deck yet (still Old Town).
- Next: C10d3b (Docks overworld map, warp from the Theatre east gate, sign).

## 2026-11-11 - C10d3b: Concurrency Docks overworld map
- `DOCKS` map in `lib/world/maps.ts` (from `DOCKS_ROWS`): east-gate warp from the Behavioural Theatre and a west gate back, `sign-docks` and updated `sign-theatre` dialogue, Docks tileset wired in `OverworldGame.ts`. Water, crates on the piers and boats are solid; the quay lip is walkable so both piers can be reached; the cargo door is scenery until C10d3d. Arrival from the Theatre is on row 6 (a lantern base blocks (1,5)).
- Tests: `tests/world.test.ts` Concurrency Docks block (warp there and back, walking the quay, both piers, blocked water/crate/door, sign). `npm test` 658 pass.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the dev server, desktop 1280x800 and iPhone 14: Docks viewed in `/play/` (temporary start position, reverted), legible, no console errors, no horizontal overflow. `content:verify` not rerun (no content change). CI/Pages not checked (no `gh` in this session).
- Known gaps: no trainers or hall yet; Docks battle backdrop still Old Town.
- Next: C10d3c (two trainers and their duels on the Concurrency deck).

## 2026-11-11 - C10d3c: Docks trainers Wren Latch and Pike Tallow
- Two new trainers on the Concurrency Docks quay: Wren Latch (threads, mutexes, condition variables) and Pike Tallow (atomics, deadlock, thread pools), each with a 24x32 walker (4-frame walk cycles), a 48x48 talking portrait (generated by `scripts/art/characters.mjs`), an intro dialogue with a trade-off answer, and a 6-card duel from the Concurrency Docks deck (disjoint topic pools). Registered in `content/trainers.ts`, `siteInfo` playable modes, `OverworldGame` walkers and `/play` portraits.
- Tests: trainers (dialogue points at the duel, pools >= 6 and disjoint) and world (both reachable from the arrival tile, both piers still reachable). The existing quay walking test now walks the quay lip (row 7) because row 6 holds the trainers.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `npm test` (667 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/dev/sprites` Wren and Pike walkers viewed, legible, no console errors, no horizontal overflow. Not viewed in `/play` itself. `content:verify` not rerun (no content change). CI/Pages not checked (no `gh` here).
- Known gaps: Docks deck still uses the Old Town battle backdrop; portraits not viewed in dialogue on screen.
- Next: C10d3d (Docks hall interior, master fight and badge).

## 2026-11-11 - C10d3d1: Docks Hall interior and Dockmaster Halyard placed
- New `docks-hall` map (`DOCKS_HALL_ROWS`, 14x10: pier-board warehouse floor, dark plank runner, crates, barrels and lamp posts, brick wall with shutters and nets). The cargo door (8,3) on the quay is now a warp into the hall; the runner's end warps back. Dockmaster Halyard (Docks master) has a 24x32 walker, 48x48 portrait (generated by `scripts/art/characters.mjs`: deep-teal oilskin coat, grey crop, round glasses) and the `halyard-intro` dialogue (check-then-set race on a plain bool; trade-off between mutex and `call_once`/atomic flag, and why `volatile` is not synchronisation). Registered in the overworld and play client; hall scene added to `/dev/sprites`. ROADMAP: C10d3d split into d1 (done) and d2.
- Tests: world (cargo-door warp, reach Halyard, return; walker/portrait/dialogue) and tiles (hall rows rectangular and in legend, scene composes). `npm test` 673 pass.
- Verification: `lint` (0 errors, 8 pre-existing warnings), `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/dev/sprites` hall scene and Halyard walker viewed, legible, no console errors, no horizontal overflow. `content:verify` not rerun (no content change). CI/Pages confirmation not done: no `gh` in this session.
- Known gaps: Halyard cannot be fought yet; Halyard's glasses read as a gold band at walker scale (same as Voss); runner contrast is subtle; Docks battle backdrop still Old Town.
- Next: C10d3d2 (Halyard master sprite, master fight and Docks Badge, like C7e3b).

## 2026-11-11 - C10d3d2: Dockmaster Halyard master fight and Docks Badge (closes C10d, C10)
- New 96x96 master sprite via `scripts/art/halyard.mjs` (`dockmaster-halyard`; idle 4, attack 4, hurt 2, faint 4): deep-teal oilskin coat with brass trim and a yellow oilskin sash, grey crop, round glasses, a signal lantern that lights on attack and a big brass padlock whose shackle springs open. New illustrated `docks` battle scene (dusk harbour: banded sky, cranes, boats, water glints, plank quay, pontoon pads); the Concurrency Docks deck now uses it instead of the Old Town backdrop.
- `content/masters/concurrency-docks.ts` (profile, three phases, one of five builds in phase 2, 8 extra phase-1 questions so the pool reaches 16 without repeating the deck) and `concurrency-docks-smells.ts` (7 original smell cards: manual unlock on an early return, inconsistent lock order, `if` around `wait`, atomic check-then-act, detached thread with reference capture, task run under the queue lock, and a restraint card where the mutex is already right). Registered as `/battle/master?master=concurrency-docks`; badge `concurrency-docks` saved by the generic master flow. Halyard's dialogue points to the Battle menu; Play menu entry added.
- Fix found on the way: the five Docks exercises (C10d1/d2) were never registered in `content/exercises/registry.ts`, so the master workshop could not have loaded them. Registered.
- Tests: master suite (smells valid and disjoint, pool >= 15 with unique ids, all five exercises registered and loadable, `?master=` selection, a clean run earns the badge), sprite assertions, deck scene list. `npm test` 683 pass.
- Verification: `lint` (0 errors, 9 pre-existing warnings), `typecheck`, `test`, `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x800 and iPhone 14: `/battle/master/?master=concurrency-docks` viewed; Halyard and the harbour backdrop read clearly, no console errors, no horizontal overflow. `content:verify` not rerun (no exercise content changed). CI/Pages confirmation: no `gh` in this session.
- Known gaps: the phase-2 workshop was covered by tests, not driven in the browser; the exercises run on the cooperative thread shim (DECISIONS #2).
- Next: C11 (Senior Review v2).

## 2026-11-11 - C11a: Senior Review v2 (blocker and major rules)
- C11 split into C11a (done) and C11b (minor rules + debrief/doc tables). `lib/review/` gained `object-slicing` (blocker), `deep-inheritance` (>3), `long-function` (>40 lines), `type-tag-switch` (>=3 cases on a type/kind/tag expression) and `dynamic-cast-chain` (>=2 casts in one function), all major. `parse.ts` now records parameters (type, by-value) and scans each function body (`FileModel.bodies`). ARCH Senior Review paragraph updated.
- Verification: `lint` (0 errors), `typecheck`, `test` (695 pass; 13 new positive/negative fixtures in `tests/review.test.ts`), `content:verify` (304 pass; every existing reference still has no blocker/major findings), `build`, `build:pages` pass. No UI change, so no screenshots. Actions quota note expired 2026-11-01, but `gh` is unavailable here, so CI/deploy not confirmed.
- Known gaps: free-function declarations without a body are not checked for slicing; the type-tag heuristic is name-based.
- Next: C11b.

## 2026-11-11 - C11b: Senior Review minor rules (closes C11)
- `lib/review/` gained three heuristic minors: `non-const-getter` (getter-named, zero-arg, value-returning, not `const`/override, body has no assignment/increment/mutating call), `magic-number` (literals other than 0/1/2 outside `const`/`constexpr` statements and `case` labels, one finding per function) and `unclear-name` (placeholder method/field names like `tmp`, `doIt`; class names like `Helper`, `Utils`, `Manager`). Parser now records return-type shape on methods and `mutates`/`magicNumbers` on bodies. The debrief lists findings generically, so they show with no UI change. ARCH §3 and GDD §5.3 rule tables updated.
- Verification: `lint` (0 errors, 9 pre-existing warnings), `typecheck`, `npm test` (703 pass; 9 new positive/negative fixtures), `content:verify` (304 pass; no reference gets a blocker or major), `build`, `build:pages` pass. No visual change, so no screenshots. CI and Pages status not checked this run (no gh CLI in this session).
- Known gaps: single-letter names deliberately not flagged (fixtures use them); getter mutation detection cannot see through calls to other non-const members; field initialisers are not scanned for magic numbers.
- Next: C12 (Workshop Row problems), or C3c when its modes exist.

## 2026-11-11 - C12a: Workshop problem 2, Parking lot
- C12 split into one-problem boxes (a full package fills a run). New `content/workshop/parking-lot`: `api.h` (`park::ParkingLot`, tickets/receipts, deterministic `minutesParked`), `api_storm1.h`, brief, 11-question clarify menu (4 essential, 4 useful, 3 noise), 5-item rubric, reference design (`SpotInventory` best-fit, `TicketBook`, `FeePolicy` seam with `HourlyFeePolicy`/`RatedFeePolicy`, `ParkingService`), 16 base tests and 7 Storm 1 tests (per-vehicle rates, 15 free minutes), 5 bad designs (`no_size_check`, `double_park`, `spot_leak` fail base; `fee_hardcoded`, `rate_by_spot` fail the storm), editorial with alternatives (Spot/Vehicle hierarchies rejected with reasons), trade-offs, 10x, level signals, 6 follow-ups. Registered in `WORKSHOP_REGISTRY` (served at `/workshop/parking-lot`) and added to the title-screen modes.
- Verification: `lint` (0 errors, 9 pre-existing warnings), `typecheck`, `npm test` (703 pass), `content:verify` workshop suite (8 pass: reference passes both phases and Senior Review with no blocker/major, every bad design fails exactly its documented tests), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/workshop/parking-lot/` brief renders, no console errors, no horizontal overflow, readable. Did not drive the editor in the browser (shared with Library). Full `content:verify` not rerun: only the workshop folder changed.
- Known gaps: one storm only (CUR asks 2-3 per problem; a second storm, e.g. EV chargers / reserved spots, is a candidate); Workshop menu has no problem index yet beyond title-screen tiles.
- Next: C12b (Vending machine).

## 2026-11-11 - C12b: Workshop problem 3, Vending machine (State)
- New `content/workshop/vending-machine`: `api.h` (`vend::VendingMachine`: slots, restock, coins, select, cancel), `api_storm1.h` (`ServiceableMachine`: maintenance mode), brief, 11-question clarify menu (4 essential, 4 useful, 3 noise), 5-item rubric, reference design (`SlotCatalog`, `Till`, `MachineState` with `IdleState`/`HasCreditState`, `MachineCore` for data and transitions, `VendingMachineImpl` as a thin delegator), 20 base tests and 11 Storm 1 tests, 5 bad designs (`credit_leak`, `refusal_eats_credit`, `idle_not_modelled` fail base; `maintenance_keeps_credit`, `maintenance_still_sells` fail the storm), editorial with alternatives (enum+switch, transition table, stateful states), trade-offs, 10x, level signals, 6 follow-ups. Storm 1 is additive in the reference: one new `MaintenanceState` class, no edit to the other states. Registered in `WORKSHOP_REGISTRY` and the title-screen modes.
- Verification: `content:verify` workshop suite filtered to vending (4 pass: reference passes both phases and Senior Review with no blocker/major; every bad design fails exactly its documented tests). The first draft had a god-class finding (15 methods), fixed by splitting `MachineCore` out. `lint` (0 errors, 9 pre-existing warnings), `typecheck`, `npm test` (703 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/workshop/vending-machine/` brief renders and is readable, no console errors, no horizontal overflow (iPhone screenshot viewed). Editor not driven in the browser (shared with the other workshop problems). Full `content:verify` not rerun: only the workshop folder changed.
- Known gaps: one storm only (CUR asks 2-3; a card-payment or exact-change storm is a candidate); no limited coin inventory (stated in clarify and follow-ups).
- Next: C12c (Elevator system).

## 2026-11-11 - C12c: Workshop problem 4, Elevator system (State + Strategy)
- New `content/workshop/elevator-system`: `api.h` (`elev::ElevatorSystem`, discrete `step()`, hall calls and cabin buttons), `api_storm1.h` (`ServiceableElevators`: take a car out of service), brief, 11-question clarify menu (4 essential, 4 useful, 3 noise), 5-item rubric, reference design (`StopList`, `Car` with a sweep, `CarMode` objects `ActiveMode`/`DoorsOpenMode`/`OutOfServiceMode`, `Dispatcher` Strategy with `NearestCarDispatcher`, `Fleet`, thin `ElevatorSystemImpl`), 23 base tests and 10 Storm 1 tests, 5 bad designs (`first_car_only`, `nearest_stop_first`, `no_door_tick` fail base; `oos_keeps_calls`, `oos_still_dispatched` fail the storm), editorial with alternatives (flat class, enum+switch, FIFO queue, lazy assignment, std::function), trade-offs, 10x, level signals, 6 follow-ups. Storm 1 adds one mode class and leaves the other modes and the dispatcher untouched because the fleet only offers the policy cars in service. Registered in `WORKSHOP_REGISTRY` and the title-screen modes.
- Verification: `content:verify` workshop suite filtered to elevator (4 pass: structure valid, reference passes both phases and Senior Review with no blocker/major, every bad design fails exactly its documented tests). First draft had a god-class finding on `Car` (17 methods), fixed by extracting `StopList`. `lint` (0 errors, 9 pre-existing warnings), `typecheck`, `npm test` (703 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/workshop/elevator-system/` brief renders, readable, no console errors, no horizontal overflow (iPhone screenshot viewed). Editor not driven in the browser (shared with other workshop problems). Full `content:verify` not rerun: only the workshop folder changed. CI/Pages not confirmed: no `gh` in this session.
- Known gaps: the dispatcher ignores direction and load (follow-ups discuss the upgrade); retiring a car drops cabin stops instead of finishing the trip; one storm only (CUR asks 2-3; a direction-aware dispatch storm is a candidate).
- Next: C12d (Tic-tac-toe to Connect-N).

## 2026-11-11 - C12d: Workshop problem 5, Tic-tac-toe to Connect-N (two storms)
- New `content/workshop/tic-tac-toe`: `api.h` (`ttt::Game`, status codes, outcome), `api_storm1.h` (`ConfigurableGame`: any board size and winning length, `makeConfigurableGame` returns nullptr for impossible configs) and `api_storm2.h` (`UndoableGame::undo()`), brief, 11-question clarify menu (5 essential, 4 useful, 2 noise), 6-item rubric, reference design (`Board`, `LineWinRule` scanning only lines through the last move, `Players`, `GameConfig`, `MoveHistory`, thin `GameImpl`), 25 base, 17 storm 1 and 11 storm 2 tests, 7 bad designs (`turn_on_refusal`, `draw_beats_win`, `anti_diagonal_missed` fail base; `swapped_stride`, `exact_run` fail storm 1; `undo_keeps_turn`, `undo_keeps_result` fail storm 2), editorial with alternatives (hard-coded 3x3, full-board scan, WinRule interface, Player hierarchy, snapshot undo), trade-offs, 10x, level signals, 6 follow-ups. Registered in `WORKSHOP_REGISTRY` and the title-screen modes. This is the first Workshop problem with two storms.
- Verification: `content:verify` workshop suite filtered to tic-tac-toe (4 pass: structure valid, reference passes all three phases and Senior Review with no blocker/major, every bad design fails its documented tests). First draft had a public-mutable-field finding on `GameConfig`, fixed by making it a class. `lint` (0 errors, 9 pre-existing warnings), `typecheck`, `npm test` (703 pass), `build`, `build:pages` pass. Playwright on the Pages export, desktop 1280x900 and iPhone 14: `/workshop/tic-tac-toe/` brief renders with Storm 1 and Storm 2 tabs, readable, no console errors, no horizontal overflow (iPhone screenshot viewed). Editor not driven in the browser (shared with other workshop problems). Full `content:verify` not rerun: only the workshop folder changed. CI/Pages not confirmed: no `gh` in this session.
- Known gaps: no tall-board (rows > cols) tests, because the `swapped_stride` bad design would read out of bounds there (it is documented in the bad design's reason, not tested); no gravity (Connect Four) storm yet, a candidate third storm; undo has no redo.
- Next: C12e (Snake and ladder).
