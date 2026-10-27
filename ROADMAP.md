# Blueprint Clash roadmap

Work top to bottom: take the **first unchecked box**, and split big boxes into run-sized sub-boxes when you start them. References: GDD = `docs/GAME_DESIGN.md`, CUR = `docs/CURRICULUM.md`, ARCH = `docs/ARCHITECTURE.md`.

**Definition of done:** works in the static build, has tests, is screenshot-verified if visual, `content:verify` passes for content, and is noted in PROGRESS.md.

---

## Phase A: Foundation

- [ ] A1. **Scaffold from Query Clash:** Next.js 16 / React 19 / Pixi 8 / Tailwind 4, PWA + service worker (keep the worker-fragment fix), `ci.yml` + `pages.yml` (basePath `/blueprint-clash`), scripts, `.routine/` lock and README. Remove all Query/SQL/PGlite references. The title screen renders.
- [ ] A2. **C++ judge:** port Algo Clash's `lib/judge/` if it exists at `/home/user/algo-clash`, else do the toolchain spike (ARCH §2) with an ADR. A `/dev/judge` page compiles and runs a multi-file project. Add the `bp_test.h` framework with JSON output, verdicts and diagnostics mapped to files.
- [ ] A3. **Workshop content pipeline** (ARCH §3): the package format (`brief.md`, `clarify.ts`, `rubric.ts`, `api.h`, `reference/`, `tests/base`, `tests/storm1..3`, `bad/`, `editorial.md`, `followups.ts`), `npm run content:verify` and one sample problem (Library management, base phase only).
- [ ] A4. **Multi-file editor:** file tree (create/rename/delete user files; `api.h` read-only), tabs, CodeMirror C++, Run/Submit with test results per test, drafts in IndexedDB.
- [ ] A5. **Save system v1**, with migrations and export/import (port from Algo Clash if present).

## Phase B: Vertical slice (Old Town, about 30–40 minutes of play)

- [ ] B1. **Art:** the starter Patternling (*Draftling*, which evolves into an Architect form; original, 64×64, full animation set), the player and Ada Lintwell (overworld + portrait), the Old Town tileset and the Drafting Hall interior.
- [ ] B2. **Overworld + dialogue engine** (port from Algo Clash if present, else build per its GDD §B2 equivalent).
- [ ] B3. **Battle stage and card battles** (MCQ, which-pattern, smell spotter, predict-behaviour; native generation of predict-behaviour outputs).
- [ ] B4. **Old Town lesson** (CUR L1, first half: classes, RAII, ownership, smart pointers), 30 cards and 6 judged class exercises.
- [ ] B5. **Old Town lesson, second half** (polymorphism, virtual destructors, slicing, `variant`), 25 cards and 6 exercises.
- [ ] B6. **The Workshop flow, v1** (GDD §5.3): brief + clarify menu → code → tests → Change Storm 1 → a basic debrief. Use Library management with one storm.
- [ ] B7. **OCP scorer and Senior Review v1:** the AST dump in the worker, the AST model, and 5 rules (virtual destructor, raw `new` ownership, public mutable fields, missing `override`, god class) with fixtures.
- [ ] B8. **Old Town master battle:** the gym leader (96×96), a three-phase fight (cards → a mini Workshop → a smell boss), a badge and an evolution scene.
- [ ] B9. **Audio v1** (port the synth if present) and a theme for Old Town.
- [ ] B10. **Slice polish:** a full Playwright playthrough on desktop and iPhone 14, screenshots, fixes, and a slice review in PROGRESS.md.

## Phase C: LLD systems and districts

- [ ] C1. **Design Board** (GDD §5.3 step 2): the UML canvas (classes, interfaces, members, relationships, multiplicities), responsibility tagging, the rubric scorer with tests, PNG export, and the optional skeleton export to C++ headers.
- [ ] C2. **Patternling party and type chart** (GDD §5.2), plus the Singleton "Global State" debuff.
- [ ] C3. **SRS and mastery with rust; the Daily Review** (GDD §6).
- [ ] C4. **SOLID Square** (CUR L2): art (district tiles, 2 trainers, a master, a backdrop), lessons, 40 cards, 8 refactor exercises, a gym.
- [ ] C5. **Creational Foundry** (L3): Patternling art for 5 patterns, lessons, cards, pattern duels, 6 exercises, a gym.
- [ ] C6. **Structural Bridges** (L4): Patternling art for 7, lessons, cards, 7 exercises, a gym.
- [ ] C7. **Behavioural Theatre** (L5): split across runs (Patternling art for 11 patterns, lessons, cards, 11 exercises, a gym).
- [ ] C8. **Modelling and UML lessons** (L6) and Design Board drills.
- [ ] C9. **Race Hunter engine** (ARCH §5), with the explorer and tests.
- [ ] C10. **Concurrency Docks** (L7): lessons, 12 Race Hunter puzzles, 5 C++ exercises, a gym.
- [ ] C11. **Senior Review v2:** all rules from GDD §5.3 step 5, with fixtures.
- [ ] C12. **Workshop Row**, about 36 problems from CUR L8, **2 problems per box**, each with all storms, bad designs and an editorial. Split into C12a…C12r as you go.
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
