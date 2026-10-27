# Blueprint Clash: Game Design Document

> Build systems that survive. A creature-tactics RPG where you design classes in **C++** that must absorb changing requirements, and architect services that face **live simulated traffic and failures**. It takes you from OOP basics to acing the machine-coding (LLD) round and the system-design (HLD) round at FAANG, big tech, big startups and remote-first companies, from SDE I up to senior/staff signals.

Source of truth for what the game is. `docs/CURRICULUM.md` covers what it teaches and `docs/ARCHITECTURE.md` how it's built. Keep them in sync with the code.

---

## 1. Vision and success criteria

**Player promise.** Finish the story and the Architecture Review Board, and you can:

1. Take a vague LLD prompt ("design a parking lot") and in 90 minutes produce **runnable, extensible C++**: the right entities, clear responsibilities, sensible patterns, and code that survives new requirements with minimal modification.
2. Recognise which design pattern fits a situation, and explain why the alternatives are worse.
3. Run a 45-minute system design interview end to end: clarify, estimate, define APIs, model the data, draw the high-level design, deep-dive the bottlenecks, and defend trade-offs with numbers.
4. Predict how an architecture behaves under load and failure (hot keys, stampedes, retries, partitions, region outages) and fix it.
5. Show level-appropriate signals (SDE II → Senior → Staff).

**Readiness gates** (shown on the Readiness Report):

| Gate | Threshold |
|---|---|
| Pattern recognition | ≥ 90 % on 40 unseen scenarios |
| Machine coding | 3 unseen LLD problems passed within 90 min, each with an OCP score ≥ 0.7 and no "blocker" review findings |
| Estimation | ≥ 85 % of Fermi Forge answers within tolerance |
| Siege | 3 stars on every HLD region's boss level |
| System design mocks | three consecutive Interview Room mocks at *Hire* or better at the chosen level |

**Pillars:**
1. **Designs are tested, not just admired.** LLD code runs against hidden behaviour tests, and architectures run against a simulator.
2. **Change is the enemy, and the teacher.** Every LLD problem has Change Storms. Every HLD level has chaos events.
3. **Trade-offs over answers.** There is rarely one right design. The game scores *reasons, numbers and failure awareness*, and it shows alternatives.
4. **Game first in feel, rigorous in substance.** The simulator is validated against queueing theory, and lessons are principal-engineer accurate.
5. **Spaced mastery.** Patterns, numbers and case studies come back on a schedule.

**Anti-goals:** grading prose with fake AI, "one true architecture" answer keys, copying blog or book content, pay-to-skip.

---

## 2. Player, platforms and sessions

- Same player as Algo Clash: a working engineer, 1–2 hours a day. Desktop is primary for the Workshop (code) and the Siege (canvas). The iPhone handles cards, Fermi Forge, pattern duels, case-study reading and Siege replays (light building).
- Session shapes:
  - 10 min: the Daily Review (spaced cards + one estimation + one pattern duel)
  - 45 min: a story beat, a Workshop phase or a Siege level
  - 90 min: a full machine-coding mock or system design mock

---

## 3. World and story

**Setting:** *Blueprint City*, a living metropolis whose districts are systems. A chaos force, **the Entropy**, makes buildings crumble whenever they can't adapt (rigid code) or can't survive load (fragile architecture).

**Cast** (original):

- **You:** a junior Architect.
- **Mentor:** *Ada Lintwell*, a retired principal engineer who runs the Drafting Hall (hub).
- **Rival:** *Corin*, a fast coder who over-engineers everything (a foil for YAGNI).
- **District Masters:** gym equivalents, one per district.
- **The Entropy's agents:**
  - LLD side: *the God Object*, *Spaghetti Serpent*, *Copy-Paste Twins* and *Leaky Abstraction*
  - HLD side: *Thundering Herd*, *Hot Key Hydra*, *Retry Storm*, *Split-Brain Twins*, *Cascade Golem* and *the Region Kraken*
- **Final:** the **Architecture Review Board**, three Staff/Principal NPCs who run a full mock loop.

**Arc:** Old Town (OOP) → SOLID Square → the Pattern Quarter (Creational Foundry, Structural Bridges, Behavioural Theatre) → Concurrency Docks → Workshop Row (machine coding) → *Act II: the City grows*, the HLD districts (Network Heights → … → Big Data Badlands) → Case Study Skyline → the Review Board → ending "Promotion".

Post-game: the Endless Siege, Staff Track (ambiguous prompts, migrations, multi-region) and Hard Mode.

---

## 4. Core loops

```
LLD MICRO:   Brief → Design Board → Code (C++) → Behaviour tests → Change Storm ×2–3 → Senior Review → Debrief
HLD MICRO:   Brief → Estimate → Build (Siege canvas) → Wave (simulated traffic + chaos) → Report → Iterate (≤3) → Debrief
CONCEPT:     Card battles (MCQ, which-pattern, smell-spotting, UML reading, estimation, trade-off duel)
SESSION:     Daily Review → district progress (lesson → battles → master) → rewards
META:        districts & badges → mastery map → Review Board → Promotion → Staff Track
```

---

## 5. Modes in detail

### 5.1 Card battles (concept encounters)
Card types:
- MCQ and multi-select
- **Which pattern?** (a scenario → a pattern creature)
- **Pattern duel** (Strategy vs State, Decorator vs Proxy, Adapter vs Facade, Factory Method vs Abstract Factory, Observer vs Mediator, Template Method vs Strategy)
- **Smell spotter** (C++ snippet → name the smell and the SOLID principle violated)
- **UML reader** (a drawn class diagram → which statement is true)
- **Predict the behaviour** (C++ OOP semantics: slicing, virtual dispatch in constructors, missing virtual destructor, copy vs move), generated by compiling and running natively in tests
- **Estimation snap** (order of magnitude)
- **Trade-off duel** (pick an option and the *best reason*)

The battle wrapper is the same as Query Clash: correct = attack, wrong = the foe's counter plus an explanation.

### 5.2 Pattern creatures (party and type chart)
Your party are **Patternlings**, creatures that embody design patterns:

| Patternling | Pattern |
|---|---|
| *Forgebot* | Factory Method / Abstract Factory |
| *Beaverbuild* | Builder |
| *Solo* | Singleton (lonely, and slightly cursed: overuse is punished) |
| *Clonewisp* | Prototype |
| *Axolink* | Adapter |
| *Bridgeback* | Bridge |
| *Fractree* | Composite |
| *Shellcrab* | Decorator (gains shells) |
| *Facadeon* | Facade |
| *Flytile* | Flyweight |
| *Proxifox* | Proxy |
| *Chamelstrat* | Strategy |
| *Owlserver* | Observer |
| *Commandant* | Command |
| *Shapeshift* | State |
| *Templar* | Template Method |
| *Inchworm* | Iterator |
| *Antchain* | Chain of Responsibility |
| *Mediowl* | Mediator |
| *Mementortoise* | Memento |
| *Visitorb* | Visitor |

- In **design battles** you face a *design problem* (a monster representing a smell or a requirement). Choosing a Patternling whose pattern fits is super effective; a plausible but heavier choice is neutral (YAGNI penalty); a wrong one is not very effective, and the foe explains the failure mode.
- Patternlings level up with mastery and evolve in three stages.
- Overusing *Solo* (Singleton) triggers the "Global State" debuff in later fights, which teaches the cost of singletons.

### 5.3 The Workshop (machine coding, the LLD core)
A problem plays out in phases, each with a timer in Interview mode:

1. **Brief (5 min):** a requirements card, deliberately incomplete. *Clarify* by choosing questions from a menu. Good questions reveal requirements that later Change Storms would otherwise surprise you with. That's the real skill.
2. **Design Board (15 min):** a UML canvas. Create classes and interfaces, add key methods and fields, and draw relationships (inheritance, composition, aggregation, association, dependency) with multiplicities.
   - The board is scored against a **responsibility rubric**, not exact names: each required responsibility ("allocates a spot", "computes a fee", "knows spot occupancy") must be assigned to exactly one class you tag. Duplicate or misplaced responsibilities are flagged.
   - Optional: export the diagram as a C++ skeleton (headers with method stubs) to start coding.
3. **Code (40–60 min):** a multi-file C++ editor (file tree, headers + sources).
   - The hidden behaviour tests call the public API defined in a provided `api.h` (e.g. `ParkingLot::park(Vehicle) -> optional<Ticket>`). Everything behind the API is your design.
   - **Run** compiles and runs the visible tests and your own `main.cpp` demo. **Submit** runs the hidden tests. Damage equals the share of tests passing.
4. **Change Storm (2–3 rounds, 10 min each):** new requirements arrive ("EV charging spots with a different fee", "a monthly-pass discount", "multiple entry gates") with new hidden tests.
   - The game diffs your code before and after each storm and computes an **OCP score** = lines *added* in new or extended units / (lines added + lines *modified or deleted* in pre-existing units). Higher is better. This is a concrete, honest proxy for the Open/Closed Principle.
   - Storm bosses (*the Entropy*) deal extra damage for every pre-existing test that breaks (a regression).
5. **Senior Review:** an automated reviewer reads your code's **clang AST** (`-Xclang -ast-dump=json -fsyntax-only`, run in-browser) and raises findings:
   - **Blockers:** a polymorphic base without a virtual destructor, raw `new` without ownership, public mutable fields on domain entities, object slicing (pass by value of a polymorphic type).
   - **Majors:** a god class (> 12 methods or > 300 lines), switching on a type tag where polymorphism fits, `dynamic_cast` chains, very long functions (> 40 lines), deep inheritance (> 3).
   - **Minors:** non-const getters, missing `override`, magic numbers, unclear names (a heuristic list).

   Each finding links to the lesson that explains it. Every rule is tested on positive and negative fixtures.
6. **Debrief:** a reference design (UML + code) with commentary, *alternatives and when they're better*, a diff of yours vs the reference, the follow-up questions interviewers ask, and a short "how this is scored in real interviews" section.

**Scoring:**

`Workshop score = 40 % behaviour tests + 20 % change-storm survival (tests + OCP) + 15 % design board rubric + 15 % review findings + 10 % time vs par`

Stars: 1 (passes the base tests), 2 (survives all storms), 3 (OCP ≥ 0.7 and no blocker or major findings).

### 5.4 Concurrency Docks: Race Hunter
Threads in the browser are restricted, so concurrency is taught with a **deterministic interleaving explorer** (`lib/concurrency/`):

- Programs are small C++-style snippets (shown as C++) backed by a TS step model. The player **schedules threads step by step** to break an invariant (find the race, deadlock, lost wake-up, ABA), then **picks or edits the fix** (mutex scope, lock ordering, `atomic`, condition variable with a predicate loop, RAII locks).
- The explorer then checks *all* interleavings (bounded model checking) to prove the fix.
- Coding problems (thread-safe bounded queue, token-bucket rate limiter, connection pool, reader-writer lock, thread pool) are written in C++ against `std::mutex`/`std::condition_variable` and compile-checked. Behaviour is tested single-threaded, plus with the explorer's model of the same algorithm.
- Using real pthreads in WASM (needs cross-origin isolation) is an optional ADR to investigate later, never a dependency.

### 5.5 Refactor Arena
You get legacy C++ (a smelly but working module) with a green test suite. Refactor towards a stated goal (introduce Strategy, extract an interface, remove the god class) while the tests stay green. It's scored by Senior Review findings removed, tests still passing, and a smaller diff. This trains the "improve existing code" skill that AI-era interviews increasingly test.

### 5.6 The Siege (HLD core): architecture under fire
A strategy/tower-defence-style simulation on a city-grid canvas.

- **Component creatures** (*Systemlings*) are placed and wired:

| Systemling | Component |
|---|---|
| *Splitter* | load balancer (L4/L7; RR, least-conn, consistent hash, P2C) |
| *Workerbee* | stateless app tier (instances, autoscaling) |
| *Hoardling* | cache (size, eviction, TTL, write policy) |
| *Vaultoise* | relational DB (primary/replicas, sync/async replication, read/write capacity) |
| *Shardstar* | sharded store (shard key, count) |
| *Quorumite* | leaderless KV (N/R/W) |
| *Couriel* | queue/log (partitions, consumers, retention, DLQ) |
| *Mirrorfly* | CDN |
| *Silowhale* | object storage |
| *Indexer* | search |
| *Gatekeeper* | rate limiter |
| *Fusesprite* | circuit breaker |
| *Retrybird* | retry policy (backoff + jitter) |
| *Geodove* | DNS / GeoDNS |
| *Cronoid* | scheduler/workers |

- **A level brief** gives the traffic profile (QPS curve, read/write mix, key skew as Zipf s, payload sizes), data size and growth, SLOs (p99 latency, availability, durability, staleness budget) and a **budget**.
- **Build phase:** place, wire and configure components, with the cost per hour shown live.
- **Wave phase:** traffic runs through the simulator (§ARCH) with scripted **chaos events**: node crash, AZ or region outage, network partition, latency injection, ×10 spike, celebrity hot key, cache flush, rolling deploy, a slow dependency, a clock-skewed node.
- Components visibly strain (sweat, then red glow) and faint (crash), and requests are animated as particles along the wires.
- **Report:** throughput, p50/p95/p99, error rate, availability, stale-read %, lost writes, backlog, cost, and **bottleneck analysis** in plain language ("DB primary at ρ = 0.97 dominated p99; reads are 90 %; consider replicas or a cache-aside layer"). Three iterations are allowed.
- **Boss waves** are the Entropy's HLD agents, each teaching one phenomenon:
  - *Thundering Herd:* cache stampede → request coalescing / probabilistic early refresh
  - *Hot Key Hydra:* Zipf hot keys → key splitting / local caches / replication of hot shards
  - *Retry Storm:* retry amplification → budgets, backoff + jitter, circuit breakers
  - *Split-Brain Twins:* partitions → quorum, fencing
  - *Cascade Golem:* overload propagation → load shedding, bulkheads, timeouts
  - *Region Kraken:* region loss → multi-region active-passive vs active-active, RPO/RTO
- **Stars:** 1 (SLOs met in the normal wave), 2 (+ chaos survived), 3 (+ under budget).

### 5.7 Fermi Forge (estimation)
Guided back-of-envelope chains: DAU → QPS (average and peak), storage over N years with replication, bandwidth, cache size (hot set), server count, shard count. Answers are accepted within a tolerance (e.g. ±2× for order-of-magnitude questions, ±25 % for computed ones). Every number is computed by `lib/estimation/` solvers under test. It also includes spaced **numbers cards**: powers of two, approximate latency numbers (labelled approximate, with the date checked) and availability nines → downtime.

### 5.8 The Interview Room (system design mock)
A 45-minute timed, structured interview with an NPC interviewer:

1. **Requirements (5 min):** choose clarifying questions, which reveal scale and features. Choose the functional and non-functional requirements to commit to.
2. **Estimation (5 min):** Fermi Forge inline.
3. **API (5 min):** compose endpoints from parts (method, path, params, response, idempotency key, pagination style). Checked against a rubric of required capabilities and anti-patterns (verbs in paths, unbounded lists).
4. **Data model (5 min):** entities, store choice per entity with a reason, primary key, **partition key**, indexes.
5. **High-level design (10 min):** build on the Siege canvas. The interviewer's load profile then runs as a quick wave.
6. **Deep dives (10 min):** the interviewer picks 2 of the 6 areas where your design is weakest (from the report and your choices) and asks branching follow-ups ("Your cache node dies at peak, what happens?").
7. **Wrap-up (5 min):** pick the top risks and next steps.

**Scorecard:** dimensions are *Requirements & scoping, Estimation, API & data, Architecture, Scalability & reliability, Trade-off reasoning, Communication*. The player chooses a target level, and the rubric shows which **level signals** you showed:
- **SDE II:** sound HLD and basics
- **Senior:** deep dives, failure modes, quantitative trade-offs
- **Staff:** ambiguity handling, evolution and migration, cost, org/ownership boundaries

Outcome: Strong Hire → No Hire, with "what a strong candidate said" notes.

### 5.9 Machine-coding mock
A 90-minute Workshop in Interview mode (no hints, a hidden-only test summary, two Change Storms), followed by a **review conversation**: 5 probing questions from the interviewer about your code ("Why is `Spot` an abstract class?", "How would you make `park` thread-safe?"), answered by choosing from options. Graded on design quality, extensibility, code quality, testing and communication.

### 5.10 Design Doc Studio and Story Forge (side quests)
- **Design Doc Studio:** write a one-page design doc or ADR using a template. It's self-assessed against a detailed rubric checklist, then compared with a reference doc. Nothing is AI-graded.
- **Story Forge:** structure 6 STAR stories commonly probed alongside design rounds ("a system you designed", "a trade-off you regret", "a production incident", "disagreeing with a design") with prompts, a rubric and recruiter tips. All text is written by the player and stays local.

---

## 6. Progression

- **Mastery** per pattern, principle, LLD problem, HLD concept and case study, using the same states as Algo Clash (Seen → Learning → Practiced → Mastered → Ingrained) with spaced intervals. Assisted completions (reference viewed) never advance mastery. Rust appears on overdue Patternlings and Systemlings.
- **Badges:** one per district (8 LLD + 13 HLD + Case Study Skyline).
- **Bits** currency buys hints (Workshop: "reveal one responsibility"; Siege: "highlight the bottleneck"), cosmetics and city decorations. **Never mastery.**
- **City growth:** your hub city visibly grows as districts are restored. Buildings you "designed" (solved problems) appear on the skyline as trophies.
- **Daily Review:** spaced cards, one estimation, one pattern duel, one micro-Siege (2 minutes) and one review question on a past LLD problem ("how would you add X to your Splitwise design?").

---

## 7. Presentation

- Same art bar as the series (see `CLAUDE.md`).
  - Patternlings and Systemlings are 64×64 creatures with full animation sets.
  - Bosses are 96×96.
  - The city overworld is in pixel art with a distinct look per district.
  - The Siege canvas is a pixel city grid with animated request particles, sweating or red-glowing components and fainting animations.
- **UML** is drawn in a pixel-flavoured but crisp vector style (it must stay readable). Diagrams export as PNG.
- **Audio:** original WebAudio chiptune per district, tension music during chaos events, verdict stingers.
- Accessibility, offline and budgets are the same as Algo Clash.
