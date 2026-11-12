# Blueprint Clash roadmap

Work top to bottom: take the **first unchecked box**, and split big boxes into run-sized sub-boxes when you start them. References: GDD = `docs/GAME_DESIGN.md`, CUR = `docs/CURRICULUM.md`, ARCH = `docs/ARCHITECTURE.md`.

**Definition of done:** works in the static build, has tests, is screenshot-verified if visual, `content:verify` passes for content, and is noted in PROGRESS.md.

---

## Phase A: Foundation

- [x] A1. **Scaffold from Query Clash:** Next.js 16 / React 19 / Pixi 8 / Tailwind 4, PWA + service worker (keep the worker-fragment fix), `ci.yml` + `pages.yml` (basePath `/blueprint-clash`), scripts, `.routine/` lock and README. Remove all Query/SQL/PGlite references. The title screen renders.
- [x] A2. **C++ judge** (split below; algo-clash has no judge yet, so this is the toolchain spike with ADRs).
  - [x] A2a. `bp_test.h` framework (JSON lines, crash attribution), pure `lib/judge/` (project model, clang diagnostics mapped to files, result parser, verdicts), native g++ runner, tests.
  - [x] A2b. Toolchain spike: `@yowasp/clang` compile + link a multi-file project, run via WASI (measured in Node), ADR 0001. Findings: no exceptions, no threads.
  - [x] A2c. Browser Web Worker wrapper around `@yowasp/clang` (lazy load, cache the ~105 MB, `-fno-exceptions`, argv `a.wasm`), measure in Chromium, and the `/dev/judge` page wiring the worker: multi-file compile, run, results, diagnostics.
- [x] A3. **Workshop content pipeline** (ARCH §3): the package format (`brief.md`, `clarify.ts`, `rubric.ts`, `api.h`, `reference/`, `tests/base`, `tests/storm1..3`, `bad/`, `editorial.md`, `followups.ts`), `npm run content:verify` and one sample problem (Library management, base phase only).
- [x] A4. **Multi-file editor:** file tree (create/rename/delete user files; `api.h` read-only), tabs, CodeMirror C++, Run/Submit with test results per test, drafts in IndexedDB.
- [x] A5. **Save system v1**, with migrations and export/import (port from Algo Clash if present).

## Phase B: Vertical slice (Old Town, about 30–40 minutes of play)

- [x] B1. **Art** (split below).
  - [x] B1a. Sprite engine (pixel format, painter, `/dev/sprites`) and the starter *Draftling* front sprite (64×64; idle/attack/hurt/faint/evolve).
  - [x] B1b. Draftling back sprite and its Architect evolution (front + back, full animation set).
  - [x] B1c. The player and Ada Lintwell (overworld walk cycles + portraits).
  - [x] B1d. The Old Town tileset and the Drafting Hall interior.
- [x] B2. **Overworld + dialogue engine** (split below; Algo Clash has no overworld yet, so built fresh).
  - [x] B2a. Pure logic: `lib/world/` (grid maps, collision, warps, NPC/sign interaction, validation) and `lib/dialogue/` (scripts with choices and flags, typewriter), Old Town and Drafting Hall maps, Ada's intro, tests.
  - [x] B2b. Pixi overworld scene and `/play`: render maps via `composeScene` tiles, smooth tile-to-tile walking with the player walk cycles, NPC sprites, camera, dialogue box with portraits and choices, keyboard + touch D-pad/A button, door transitions; Playwright at desktop and iPhone 14.
- [x] B3. **Battle stage and card battles** (MCQ, which-pattern, smell spotter, predict-behaviour; native generation of predict-behaviour outputs). Split below.
  - [x] B3a. Pure `lib/battle/` (card model + validation, deterministic battle state machine with streaks, counters, re-queue of misses, stars), the 12-card Old Town starter deck, predict cards proven by native g++ (`content:verify` + tests).
  - [x] B3b. Pixi battle stage: backdrop, platforms, Draftling back sprite vs a foe, intro transition, attack/hurt animations, shake, hit-stop, damage numbers; card UI (code view, options, explanation) at `/battle`; Playwright desktop + iPhone 14.
- [x] B4. **Old Town lesson** (CUR L1, first half: classes, RAII, ownership, smart pointers), 30 cards and 6 judged class exercises. Split below.
  - [x] B4a. Grow the Old Town deck to 30 cards (classes/structs, invariants, constructors, const, static, copy vs move, smart pointers, `optional`), with predict cards proven natively.
  - [x] B4b. Six judged class exercises (BankAccount, RAII FileHandle, Inventory ownership, Stack<T>, Counter with static, Temperature `enum class`) as small packages run through the judge, with tests.
- [x] B5. **Old Town lesson, second half** (polymorphism, virtual destructors, slicing, `variant`), 25 cards and 6 exercises. Split below.
  - [x] B5a. 26 cards in `content/cards/old-town-poly.ts` (dispatch, virtual destructors, slicing, override, abstract/interface, clone, final, LSP, ISP, composition, Strategy, Template Method, NVI, `variant`, cost of virtual), predict cards proven natively.
  - [x] B5b. Six judged exercises (Shape hierarchy with virtual destructor, polymorphic `clone`, Strategy pricing, interface segregation, `variant` + `visit` evaluator, NVI wrapper), full packages with wrong solutions.
- [x] B6. **The Workshop flow, v1** (GDD §5.3): brief + clarify menu → code → tests → Change Storm 1 → a basic debrief. Use Library management with one storm. Split below.
  - [x] B6a. Content: Library management Storm 1 (premium tier, per-phase `api_storm1.h`, cumulative tests, reference update, two bad designs that fail it, rubric/clarify/editorial/follow-ups updated), proven by `content:verify`.
  - [x] B6b. Pure `lib/workshop/` flow: phase state machine (brief → clarify → code → submit → storm → debrief), clarify scoring, per-phase scoring, OCP score from a before/after diff, with tests.
  - [x] B6c. `/workshop` UI: brief + clarify menu, multi-file editor, Run/Submit through the browser judge, storm arrival, debrief; Playwright desktop + iPhone 14.
- [x] B7. **OCP scorer and Senior Review v1:** the AST dump in the worker, the AST model, and 5 rules (virtual destructor, raw `new` ownership, public mutable fields, missing `override`, god class) with fixtures. Split below.
  - [x] B7a. Pure `lib/review/` (tokenizer, declaration parser, model, the 5 rules with positive/negative fixtures, clang-AST cross-check, reference passes via `content:verify`). The clang JSON dump is ~226 MB, so a declaration parser replaced it (ADR 0002).
  - [x] B7b. Wire Senior Review into `/workshop` (review the player's files at debrief, findings list with fix + lesson, feed `workshopScore` review weight and the third star), Playwright desktop + iPhone 14.
- [x] B8. **Old Town master battle:** the gym leader (96×96), a three-phase fight (cards → a mini Workshop → a smell boss), a badge and an evolution scene.  Split below.
  - [x] B8a. Pure `lib/battle/master.ts` (three-phase fight with one HP pool: cards, judged mini Workshop, smell boss; stars, badge), the Old Town master profile and six dedicated smell cards, with tests.
  - [x] B8b. Warden Hollis Vane 96×96 front sprite with idle/attack/hurt/faint frames, reviewed on `/dev/sprites`.
  - [x] B8c. `/battle/master` UI: phase banners, master HP bar, phase 2 through the browser judge (`file-handle` exercise), win/lose dialogue, badge saved.
  - [x] B8d. Draftling evolution scene (white-silhouette morph) after the badge.
- [x] B9. **Audio v1** (port the synth if present) and a theme for Old Town.
- [x] B10. **Slice polish:** a full Playwright playthrough on desktop and iPhone 14, screenshots, fixes, and a slice review in PROGRESS.md.

## Phase C: LLD systems and districts

- [x] C1. **Design Board** (GDD §5.3 step 2): the UML canvas (classes, interfaces, members, relationships, multiplicities), responsibility tagging, the rubric scorer with tests, PNG export, and the optional skeleton export to C++ headers.
  - [x] C1a. Pure `lib/board/`: board model and validation, responsibility-rubric scorer (missing / misplaced / duplicated, god-class and orphan flags), C++ skeleton export (compiles under g++), with tests.
  - [x] C1b. `/workshop` Design Board UI: SVG canvas (add class/interface, members, drag, relationships with multiplicities, responsibility tags), feed `boardScore` into the debrief, Playwright desktop + iPhone 14.
  - [x] C1c. PNG export, skeleton download/insert into the code editor, board saved with the draft.
- [x] C2. **Patternling party and type chart** (GDD §5.2), plus the Singleton "Global State" debuff.
  - [x] C2a. Pure `lib/patterns/`: 21-creature roster, type chart (super/neutral-with-YAGNI/weak) with starter design problems, party state, mastery levels and stages, Global State debuff, with tests.
  - [x] C2b. Save wiring (`party` in the save schema with migration), `/party` page, and a design-battle mode using `matchup` (art arrives per district in C4 to C7).
- [x] C3. **SRS and mastery with rust; the Daily Review** (GDD §6).
  - [x] C3a. Pure `lib/srs/` scheduler, mastery states, rust, queue builder, with tests.
  - [x] C3b. `/review` page (spaced cards, mastery summary, rust), battle misses feed the SRS.
  - [ ] C3c. Daily Review extras once their modes exist: one estimation (Fermi Forge), one micro-Siege, one past-LLD review question; rust on Patternling sprites.
- [x] C4. **SOLID Square** (CUR L2): art (district tiles, 2 trainers, a master, a backdrop), lessons, 40 cards, 8 refactor exercises, a gym.
  - [x] C4a. 43-card SOLID Square deck (`content/cards/solid-square.ts`) verified by `content:verify` (predict cards run natively).
  - [x] C4b. Wire the deck: district battle route, SRS deck selection on `/review`, tests.
  - [x] C4c. Lessons (SRP, OCP, LSP, ISP, DIP, heuristics) with smell, before/after C++ and over-application cost.
  - [x] C4d. 8 refactor exercises judged by tests plus Senior Review rules (`content:verify` packages). Split below.
    - [x] C4d1. srp-invoice, dip-notifier, lsp-account (and a Senior Review check on every exercise reference).
    - [x] C4d2. Five more: OCP (shipping rules via a registry), ISP (split a fat `Machine`), DIP with owning injection (`unique_ptr` + a clock), Demeter/tell-don't-ask, composition over inheritance.
  - [x] C4e. District art (tiles, 2 trainers, master, backdrop), then the district master/gym. Split below.
    - [x] C4e1. SOLID Square tileset (marble plaza, animated fountain, columns, banners, copper roofs), map + warps from Old Town, signs, `/dev/sprites` scene.
    - [x] C4e2. Two trainers + the district master, SOLID Square battle backdrop. Split below.
      - [x] C4e2a. Two trainers (Sable Quill, Rook Ferris): overworld walkers, portraits, map placement, dialogue.
      - [x] C4e2b. District master (96×96 battle sprite, overworld walker, portrait) and the SOLID Square battle backdrop.
    - [x] C4e3. Principle Hall interior, trainer duels and the master/gym fight wired to the SOLID deck and the 8 refactor exercises. Split below.
      - [x] C4e3a. Principle Hall interior map (SOLID Square tiles), the plaza arch door becomes a warp, Provost Marlow placed with an intro dialogue, scene on `/dev/sprites`, tests.
      - [x] C4e3b. Marlow master fight: SOLID master profile, master deck (cards + dedicated smell cards), phase-2 exercise choice from the 8, `/battle/master?master=solid-square`, badge saved.
      - [x] C4e3c. Trainer duels (Sable, Rook) as short concept battles with flags.
- [x] C5. **Creational Foundry** (L3): Patternling art for 5 patterns, lessons, cards, pattern duels, 6 exercises, a gym. Split below.
  - [x] C5a. 41-card Creational Foundry deck (`content/cards/creational-foundry.ts`, 7 predict cards proven natively), registered as `?deck=creational-foundry`.
  - [x] C5b. Lessons (Factory Method, Abstract Factory, Builder, Prototype, Singleton, Object Pool, DI) with smell, C++ structure, when not to use it, over-application cost.
  - [x] C5c. Six judged exercises as `content:verify` packages with wrong solutions. Split below.
    - [x] C5c1. `factory-registry` (registry of factories, lazy, first registration wins) and `builder-request` (validating builder, immutable value, case-insensitive headers).
    - [x] C5c2. `abstract-factory-family` (a family of products that must match) and `prototype-clone` (`unique_ptr` clone with deep copy).
    - [x] C5c3. `singleton-meyers` (thread-safe Meyers singleton plus the injected alternative) and `pool-lease` (RAII object pool).
  - [x] C5d. Foundry art. Split below.
    - [x] C5d1. Patternling sprites for Forgebot, Beaverbuild, Solo, Clonewisp (64x64, idle/attack/hurt/faint/evolve), on `/dev/sprites`.
    - [x] C5d2. Foundry tileset and battle backdrop.
  - [x] C5e. Foundry map, trainers, pattern duels and the district master/gym. Split below.
    - [x] C5e1. Foundry overworld map (from `FOUNDRY_ROWS`), east gate warp from SOLID Square, sign, tileset wiring, tests.
    - [x] C5e2. Two trainers (walkers, portraits, dialogue, placement) and their pattern duels.
    - [x] C5e3. Foundry hall, master and badge. Split below.
      - [x] C5e3a. Foundry Hall interior map, roller-door warp, Foreman Corvo placed (walker, portrait, intro dialogue), scene on `/dev/sprites`, tests.
      - [x] C5e3b. Corvo master fight: 96x96 master sprite, profile, deck, phase-2 exercise choice from the 6, `/battle/master?master=creational-foundry`, badge saved, Foundry battle backdrop for deck battles.
- [x] C6. **Structural Bridges** (L4): Patternling art for 7, lessons, cards, 7 exercises, a gym. Split below.
  - [x] C6a. 41-card Structural Bridges deck (`content/cards/structural-bridges.ts`, 9 predict cards proven natively), registered as `?deck=structural-bridges`.
  - [x] C6b. Lessons (Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy) with smell, C++ structure, when not to use it, over-application cost.
  - [x] C6c. Seven judged exercises as `content:verify` packages with wrong solutions. Split below.
    - [x] C6c1. `adapter-payments` (legacy bank behind a gateway), `bridge-renderer` (shapes x renderers, runtime switch) and `composite-fs` (files and folders).
    - [x] C6c2. `decorator-stream` (stackable wrappers, order matters) and `facade-checkout` (one entry point over subsystems).
    - [x] C6c3. `flyweight-glyphs` (shared immutable state) and `proxy-cache` (lazy/caching proxy with the same interface).
  - [x] C6d. Bridges art. Split below.
    - [x] C6d1. Patternling sprites for Axolink, Bridgeback, Fractree, Shellcrab (64x64, full animation set), on `/dev/sprites`.
    - [x] C6d2. Patternling sprites for Facadeon, Flytile, Proxifox.
    - [x] C6d3. Bridges tileset and battle backdrop.
  - [x] C6e. Bridges map, trainers, pattern duels, hall, master and badge. Split below.
    - [x] C6e1. Bridges overworld map (from `BRIDGES_ROWS`), gate warp from the Foundry, sign, tileset wiring, tests.
    - [x] C6e2. Two trainers (walkers, portraits, dialogue, placement) and their pattern duels.
    - [x] C6e3. Bridges hall, master and badge. Split below.
      - [x] C6e3a. Bridges Hall interior map, warehouse-door warp, Harbourmaster Vale placed (walker, portrait, intro dialogue), scene on `/dev/sprites`, tests.
      - [x] C6e3b. Vale master fight: 96x96 master sprite, profile, deck, phase-2 exercise choice from the 7, `/battle/master?master=structural-bridges`, badge saved.
- [x] C7. **Behavioural Theatre** (L5): Patternling art for 11 patterns, lessons, cards, 11 exercises, a gym. Split below.
  - [x] C7a. Behavioural Theatre deck, part 1 (`content/cards/behavioural-theatre.ts`): cards for Strategy, Observer, Command, State, Template Method, Iterator; predict cards proven natively; registered as `?deck=behavioural-theatre`.
  - [x] C7a2. Deck part 2: Chain of Responsibility, Mediator, Memento, Visitor, Interpreter, plus Null Object and Specification cards.
  - [x] C7b. Lessons (11 patterns + Null Object, Specification, event-driven) with smell, C++ structure, when not to use it, over-application cost. Split by 4 patterns per run.
    - [x] C7b1. Lessons: Strategy, Observer, Command, State (`content/lessons/behavioural-theatre.ts`).
    - [x] C7b2. Lessons: Template Method, Iterator, Chain of Responsibility, Mediator.
    - [x] C7b3. Lessons: Memento, Visitor, Interpreter, Null Object.
    - [x] C7b4. Lessons: Specification and event-driven design (Observer vs queue vs event sourcing).
  - [x] C7c. Eleven judged exercises as `content:verify` packages with wrong solutions (3-4 per run). Split below.
    - [x] C7c1. `strategy-ranker`, `observer-topic`, `command-undo`, `state-document`.
    - [x] C7c2. Template Method, Iterator, Chain of Responsibility, Mediator.
    - [x] C7c3. Memento, Visitor, Interpreter (`memento-editor`, `visitor-basket`, `interpreter-calc`).
  - [x] C7d. Theatre art: 11 Patternling sprites (3-4 per run), tileset and battle backdrop. Split below.
    - [x] C7d1. Sprites: Chamelstrat, Owlserver, Commandant (`scripts/art/theatre1.mjs`).
    - [x] C7d2. Sprites: Shapeshift, Templar, Inchworm, Antchain (`scripts/art/theatre2.mjs`).
    - [x] C7d3. Sprites: Mediowl, Mementortoise, Visitorb (`scripts/art/theatre3.mjs`).
    - [x] C7d4. Theatre tileset and battle backdrop (`scripts/art/theatre-tiles.mjs`).
  - [x] C7e. Theatre map, trainers, duels, hall, master and badge. Split below.
    - [x] C7e1. Theatre overworld map (from `THEATRE_ROWS`), east-gate warp from the Bridges, sign, tileset wiring, tests.
    - [x] C7e2. Two trainers (walkers, portraits, dialogue, placement) and their pattern duels.
    - [x] C7e3. Theatre hall interior, master fight and badge. Split below.
      - [x] C7e3a. Theatre Hall interior map, playhouse-door warp, Director Voss placed (walker, portrait, intro dialogue), scene on `/dev/sprites`, tests.
      - [x] C7e3b. Voss master fight: 96x96 master sprite, profile, deck, phase-2 exercise choice from the 11, `/battle/master?master=behavioural-theatre`, badge saved.
- [x] C8. **Modelling and UML lessons** (L6) and Design Board drills. Split below.
  - [x] C8a. Lessons: requirements to entities (noun/verb, CRC), class-diagram relationships as C++ ownership, state diagrams (`content/lessons/modelling.ts`), plus a 12-card `modelling` deck (Drafting Studio).
  - [x] C8b. Lessons: sequence diagrams, and identifying extension points from requirements; 10 more cards (UML-reading cards need C8c).
  - [x] C8c. Design Board engine (GDD 5.3 step 2): pure-logic UML model, rubric scorer, tests. (Found already built in `lib/board/`: model, edit, persist, rubric, skeleton; 28 tests incl. g++-compiled skeletons. Verified this run.)
  - [x] C8d. Design Board UI (vector canvas, in `components/DesignBoard.tsx` since C6) and 4 drills with rubrics at `/board` (parking lot, elevator, vending machine, notification service).
- [x] C9. **Race Hunter engine** (ARCH §5), with the explorer and tests.
  - [x] C9a. Pure-logic IR, step engine, manual scheduler and exhaustive explorer in `lib/concurrency/` with `tests/concurrency.test.ts` (counter, AB-BA, condvar samples).
  - [x] C9b. Race Hunter UI at `/race`: code panel with per-thread step buttons, state view, "explore all" counterexample replay, one sample puzzle, home tile.
- [x] C10. **Concurrency Docks** (L7): lessons, 12 Race Hunter puzzles, 5 C++ exercises, a gym. Split below.
  - [x] C10a. Race Hunter puzzles 3-6: check-then-act, two-variable invariant, CAS slot claim, condvar handshake (6 of 12).
  - [x] C10b. Six more puzzles (ABA, bounded queue, reader-writer, double-checked locking, atomic flag publication, livelock): 12 of 12.
  - [x] C10c. L7 lessons (threads, mutex, condvar, atomics, deadlock, thread pool) and a 12-card Concurrency Docks deck.
  - [x] C10d. Five judged C++ exercises and a gym. Split below. Exercises use an injected `Lock` seam (abstract class in `api.h`, spy in the tests) instead of real threads, so they are deterministic natively and in the browser (DECISIONS #2).
    - [x] C10d1. `locked-stats` (RAII guard, atomic batch, no leak on early return) and `ordered-transfer` (lock ordering, self-lock, release on every path).
    - [x] C10d2. Three more: bounded blocking queue with a spy condition variable (`while` predicate loop), thread-safe lazy init / once, cooperative task queue with clean shutdown.
    - [x] C10d3. Docks gym: map/trainers/master wired to the Concurrency deck and the five exercises (follow the C7e pattern). Split below.
      - [x] C10d3a. Concurrency Docks tileset (`scripts/art/docks-tiles.mjs`), harbour scene rows and `/dev/sprites` scene, tests.
      - [x] C10d3b. Docks overworld map, warp from the Theatre east gate, sign, tileset wiring, tests.
      - [x] C10d3c. Two trainers (walkers, portraits, dialogue) and their duels on the Concurrency deck.
      - [x] C10d3d. Docks hall interior, master fight (exercise choice from the five) and badge. Split below.
        - [x] C10d3d1. Docks Hall interior, cargo-door warp, Dockmaster Halyard (walker, portrait, intro dialogue).
        - [x] C10d3d2. Halyard 96x96 master sprite, master profile (phases, exercise choice from the five, smell cards), `?master=concurrency-docks` and the Docks Badge.
- [x] C11. **Senior Review v2:** all rules from GDD §5.3 step 5, with fixtures. Split below.
  - [x] C11a. Blocker and major rules: object slicing, deep inheritance (> 3), long function (> 40 lines), type-tag switch, `dynamic_cast` chain; positive and negative fixtures.
  - [x] C11b. Minor rules: non-const getter, magic numbers, unclear names; fixtures; show the new rules in the debrief and update GDD/ARCH rule tables.
- [ ] C12. **Workshop Row**, about 36 problems from CUR L8, each with all storms, bad designs and an editorial. One problem per run now (a full package is a whole run); the list below follows CUR L8 order.
  - [x] C12a. Library management (B-phase) and Parking lot (State/Strategy: fit rules, best fit, pricing storm).
  - [x] C12b. Vending machine (State).
  - [x] C12c. Elevator system (State, scheduling Strategy).
  - [x] C12d. Tic-tac-toe to Connect-N.
  - [x] C12e. Snake and ladder.
  - [ ] C12f onward: Logger framework (next), LRU/LFU, KV store with TTL and transactions, ... (CUR L8 items 6 to 36, one per box as reached).
- [ ] C13. **Refactor Arena** (L9): the mode, plus 12 legacy modules (split across runs).
- [ ] C14. **Machine-coding mock** (GDD §5.9) with the review conversation.

## Phase D: HLD engine

- [ ] D1. **Simulator core** (ARCH §4): topology, traffic, the fluid tick model, M/M/c latency, backlog, errors, and the full set of validation tests (queueing, Little's law, determinism). Add the `/dev/sim` playground with charts.
- [ ] D2. **Simulator components, part 1:** LB algorithms, app tier + autoscaling, cache (Che approximation + validation), DB primary/replicas with lag and stale reads.
- [ ] D3. **Simulator components, part 2:** sharding + consistent hashing (with validation), leaderless N/R/W, queues + DLQ, CDN, rate limiter, circuit breaker, retries (amplification validation).
- [ ] D4. **Chaos scheduler and bottleneck analyser.**
- [ ] D5. **Siege UI:** the pixel city grid canvas, component palette, wiring, config panels, live cost, wave playback with request particles and component strain/faint animations, the report screen, 3 iterations and stars.
- [ ] D6. **Systemling art:** 15 component creatures (64×64, full animation sets), in batches of 4–5 per run.
- [ ] D7. **Fermi Forge** (GDD §5.7) with estimation solvers and tests, plus numbers cards.

## Phase E: HLD districts (district recipe for each)

**District recipe:** art (tiles, trainers, master, backdrop, boss 96×96) → lessons → about 40 cards → 3–5 Siege levels → boss wave → Fermi sets → district music.

- [ ] E1. Requirements and estimation (CUR H1)
- [ ] E2. Network Heights (H2)
- [ ] E3. Load Balancer Junction (H3)
- [ ] E4. Cache Caverns (H4), with the *Thundering Herd* boss
- [ ] E5. Data Vaults (H5)
- [ ] E6. Shard Archipelago (H6), with the *Hot Key Hydra* boss
- [ ] E7. Replication Mirrors (H7), with the *Split-Brain Twins* boss
- [ ] E8. Message Harbor (H8)
- [ ] E9. API Forge (H9)
- [ ] E10. Consensus Citadel (H10), with the Raft trace simulator
- [ ] E11. Reliability Ramparts (H11), with the *Retry Storm* and *Cascade Golem* bosses
- [ ] E12. Observatory and Security Gate (H12)
- [ ] E13. Platform Port and Big Data Badlands (H13), with the *Region Kraken* boss

## Phase F: Interview transfer

- [ ] F1. **Interview Room engine** (GDD §5.8): the phases, timer, clarify menu, API composer with rubric, data-model picker, a quick wave on the canvas, the deep-dive selector driven by weaknesses, and a scorecard with level signals.
- [ ] F2. **Case Study Skyline:** 38 case studies (CUR Part III), **2 per box** (C1…C19), each with an Interview Room script, Siege level, reference design + alternatives, deep-dive bank and "what breaks at 10×".
- [ ] F3. **Level calibration content** (CUR Part IV), with annotated SDE II / Senior / Staff answers for 3 prompts.
- [ ] F4. **Design Doc Studio and Story Forge** (GDD §5.10).
- [ ] F5. **Architecture Review Board finale:** a full loop (machine-coding mock + system design mock + review), the ending "Promotion" and credits.
- [ ] F6. **Post-game:** the Staff Track (ambiguous prompts, migrations, multi-region), the Endless Siege and Hard Mode.

## Phase G: Polish (ongoing)

- [ ] G1. Accessibility audit and fixes.
- [ ] G2. Performance (bundle, simulator worker, canvas).
- [ ] G3. README with screenshots, plus an authoring guide for Workshop problems and Siege levels.
- [ ] G4. Depth: more storms, more bad designs, more case-study variants, guided by weak-area stats.
