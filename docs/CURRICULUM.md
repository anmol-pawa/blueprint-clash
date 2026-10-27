# Blueprint Clash: Curriculum

What Blueprint Clash teaches, in order. **LLD is taught and coded in C++17/20.** "Language Bridge" cards show Java/Python equivalents, because many LLD rounds accept any OOP language. **HLD is language-agnostic.** All writing is original. Books, blogs and company engineering posts may be named as *further reading* only.

Teaching method: the same as Algo Clash (worked → faded → independent; blocked → interleaved; retrieval; spacing; elaboration; calibration). In addition, **every design topic states the requirements, the numbers, the alternatives, and what breaks at 10×.**

---

## Part I: Low-level design (districts 1–8)

### L1 Old Town: OOP in C++
Classes vs structs, access control, encapsulation and invariants, constructors (default/parameterised/delegating, member initialiser lists), destructors and **RAII**, the rule of 0/3/5, copy vs move semantics (enough to reason about ownership), `const` member functions and const-correctness, `static` members, composition vs inheritance, polymorphism (virtual functions, vtables at a conceptual level, `override`, `final`), **abstract classes as interfaces** (pure virtual), **virtual destructors**, object slicing, `enum class`, operator overloading (when it's appropriate), namespaces, and header/source separation with include guards / `#pragma once`.

Ownership modelling with smart pointers is central to C++ LLD:
- `unique_ptr` for composition
- `shared_ptr` for shared ownership (rare, so justify it)
- `weak_ptr` for back-references and observers
- raw pointers/references as non-owning views

Also: `std::optional` for "maybe" results, `std::variant` + `std::visit` as an alternative to inheritance (closed hierarchies), and error handling (exceptions vs `optional`/`expected`-style results, and when each fits).

Exercises: 12 small judged classes (BankAccount with invariants, Matrix with operators, a Shape hierarchy, an RAII FileHandle, an Inventory with ownership). Cards: about 50, including predict-behaviour cards generated natively.

### L2 SOLID Square: principles
SRP, OCP, LSP (with the classic rectangle/square trap, explained via contracts: preconditions, postconditions, invariants), ISP and DIP (dependency injection via constructor interfaces). Also DRY, KISS, YAGNI, the Law of Demeter, tell-don't-ask, cohesion and coupling, composition over inheritance, programming to interfaces, and immutability. For each principle: a smell, a C++ before/after refactor, how to spot it in an interview, and the cost of over-applying it. Exercises: 8 refactors judged by tests plus Senior Review rules.

### L3 Creational Foundry
Factory Method, Abstract Factory, Builder (fluent and step builders), Prototype (clone with `unique_ptr` covariance issues), Singleton (Meyers singleton, thread-safety guarantees, why it hurts testability, and alternatives via DI), plus Object Pool and Dependency Injection containers (conceptual). Each pattern covers: intent, the problem it solves, the C++ structure, a minimal example, when *not* to use it, related patterns, and a duel card.

### L4 Structural Bridges
Adapter (object vs class adapter), Bridge, Composite, Decorator (vs inheritance explosion), Facade, Flyweight (shared intrinsic state), and Proxy (virtual/protection/remote/caching). The same structure as L3.

### L5 Behavioural Theatre
Strategy, Observer (with `weak_ptr` to avoid dangling observers and leaks), Command (undo/redo), State (vs a switch, vs Strategy), Template Method (vs Strategy), Iterator (custom C++ iterators for range-for), Chain of Responsibility, Mediator, Memento, Visitor (double dispatch and the expression-problem trade-off), and Interpreter (light). Plus event-driven designs, the Specification pattern, and the Null Object pattern.

### L6 Modelling and UML
Requirements to entities (noun/verb analysis, then the responsibilities and CRC cards technique), class diagrams (relationship types and multiplicities, and when composition vs aggregation matters in C++ ownership terms), sequence diagrams, state diagrams (for elevators, vending machines and orders), and **identifying extension points from requirements** (what's likely to change?). Exercises: Design Board drills with rubrics.

### L7 Concurrency Docks
Threads, data races vs race conditions, critical sections, `std::mutex`, `lock_guard`/`unique_lock`/`scoped_lock`, deadlock (the four Coffman conditions, lock ordering, `std::lock`), condition variables (predicate loops, spurious wake-ups, lost wake-ups), atomics and memory ordering (conceptual: acquire/release vs seq_cst), the producer-consumer bounded buffer, thread pools, reader-writer locks (`shared_mutex`), futures/promises/async, idempotency and retries in concurrent code, the double-checked locking pitfall, and the ABA problem (conceptual). Taught through Race Hunter (GDD §5.4). Exercises: a thread-safe bounded queue, a token bucket, a connection pool, an LRU with a lock, and a thread pool.

### L8 Workshop Row: machine-coding problems
Each problem is a full Workshop package (GDD §5.3): brief, clarification menu, responsibility rubric, `api.h`, reference design (UML + C++), behaviour tests, 2–3 Change Storms with tests, known-bad designs that must fail specific storms, Senior Review expectations, follow-up questions and an editorial. Target set (about 36), in rough order:

1. Library management
2. Parking lot (State, Strategy for fees)
3. Vending machine (State)
4. Elevator system (State, scheduling Strategy)
5. Tic-tac-toe → Connect-N (extensible board and rules)
6. Snake and ladder
7. Logger framework (Chain of Responsibility, sinks, levels)
8. LRU/LFU cache with pluggable eviction (Strategy)
9. In-memory key-value store with TTL and nested transactions (begin/commit/rollback, Memento/Command)
10. Rate limiter library (token bucket / sliding window via Strategy)
11. Pub-sub / event bus (Observer, topics, filters)
12. Notification service (channels via Strategy, templates, retries)
13. Splitwise (expense splitting strategies, simplified debts)
14. ATM (State + Chain of Responsibility for note dispensing)
15. Movie ticket booking with seat holds (concurrency, timeouts)
16. Hotel booking
17. Car rental
18. Ride sharing (matching Strategy, trip state machine)
19. Food delivery order lifecycle
20. Shopping cart + inventory + discount engine (Decorator/Specification for coupons)
21. Payment processor with retries and idempotency keys
22. Text editor with undo/redo (Command, Memento)
23. In-memory file system (Composite, path resolution)
24. Spreadsheet with formulas and dependency recalculation (graph + topological order)
25. Task scheduler / cron (priority queue, recurring jobs)
26. Job queue with retries, backoff and a dead-letter queue
27. Chess (move validation per piece via polymorphism, check detection)
28. Card game framework (deck, rules via Template Method)
29. Order book / matching engine (price-time priority)
30. Stock brokerage portfolio
31. Meeting room scheduler
32. Stack Overflow-lite (posts, votes, reputation rules)
33. Cricket/football scoreboard (event-driven updates)
34. Circuit breaker library (State)
35. Connection pool
36. Workflow engine (DAG of steps, retries)

### L9 Refactor Arena
About 12 legacy modules to refactor towards a goal with the tests kept green (GDD §5.5), e.g. a 600-line `OrderProcessor` god class, a type-switch payment module, copy-paste report generators, a singleton-riddled config, an inheritance explosion in notifications.

---

## Part II: High-level design (districts 9–21)

Each district covers: lesson screens, about 40 cards, 3–5 Siege levels, a boss wave, Fermi Forge sets, and links to the case studies that use it.

### H1 Requirements and estimation (Fermi Forge district)
Functional vs non-functional requirements, SLAs/SLOs/SLIs and error budgets, availability nines → downtime per year/month, durability, consistency needs, and read/write ratios. Estimation method: DAU → actions → average QPS → peak factor; storage (item size × count × retention × replication); bandwidth; cache sizing via the hot set (80/20 as a heuristic, with Zipf as the real model); per-server capacity → fleet size; shard count. Also powers of two and approximate latency numbers (labelled approximate, with the date checked).

### H2 Network Heights
DNS (resolution, TTLs, GeoDNS), TCP vs UDP, TLS handshake costs, HTTP/1.1 vs 2 vs 3 (QUIC), keep-alive and connection pooling, WebSockets vs SSE vs long polling, REST vs gRPC vs GraphQL (with trade-offs), CDNs (push vs pull, cache keys, invalidation), anycast, forward/reverse proxies, and API gateways.

### H3 Load Balancer Junction
L4 vs L7, algorithms (round robin, weighted, least connections, least response time, consistent hashing, power of two choices), health checks, connection draining, sticky sessions and why to avoid them, global vs regional LB, and autoscaling (metrics, warm-up, cooldown, predictive). Simulator-verified outcomes.

### H4 Cache Caverns
Where to cache (client, CDN, edge, app, DB buffer), patterns (cache-aside, read-through, write-through, write-back, write-around), eviction (LRU, LFU, FIFO, TTL, ARC concept), invalidation strategies, consistency issues, **stampede/dog-piling** (locks, request coalescing, probabilistic early expiration), hot keys, negative caching, Redis vs Memcached features, and hit-ratio maths (Zipf + LRU via simulation and the Che approximation, solver-checked).

### H5 Data Vaults (storage engines and data modelling)
Relational vs document vs key-value vs wide-column vs graph vs time-series vs search vs vector stores (with selection criteria). Also indexes (B-tree vs LSM tree: write amplification, read amplification, compaction), transactions and isolation levels (anomalies), normalisation vs denormalisation, modelling access patterns first (NoSQL single-table thinking), secondary indexes, and **pgvector** and vector search basics (a bridge to AI systems).

### H6 Shard Archipelago (partitioning)
Range vs hash vs directory vs geo partitioning, choosing partition keys (cardinality, skew, query patterns), **consistent hashing** with virtual nodes (a ring simulator; solver-checked placement), rebalancing and data movement, hot partitions, cross-shard queries and transactions, global secondary indexes, and resharding without downtime.

### H7 Replication Mirrors
Leader-follower (sync, async, semi-sync), multi-leader (conflicts, LWW, CRDTs at a conceptual level), leaderless (Dynamo-style N/R/W quorums, sloppy quorums, hinted handoff, read repair, anti-entropy with Merkle trees), replication lag anomalies (read-your-writes, monotonic reads, consistent prefix) and fixes, failover (detection, split-brain, fencing), **CAP** (precisely stated) and **PACELC**, and consistency models (linearisable → eventual), all with worked scenarios.

### H8 Message Harbor
Queues vs logs, Kafka-style partitions, offsets and consumer groups, ordering guarantees (per partition), delivery semantics (at-most / at-least / effectively-once with idempotent consumers), backpressure, DLQs, retries with backoff, the **outbox pattern**, CDC, event sourcing, CQRS, sagas (orchestration vs choreography) vs 2PC, and stream processing basics (windows, watermarks).

### H9 API Forge (API design)
Resource modelling, HTTP semantics and status codes, versioning, pagination (offset vs cursor; consistency under writes), filtering and sorting, **idempotency keys**, rate limiting (token bucket, leaky bucket, fixed and sliding window log/counter; simulator-checked), authentication (sessions vs tokens), OAuth 2.0 / OIDC flows, JWT pitfalls, webhooks (signing, retries), bulk/batch APIs, long-running operations, and error models.

### H10 Consensus Citadel (distributed systems core)
Failure models (crash, omission, Byzantine at a conceptual level), timeouts and failure detectors, clocks (physical, NTP skew, Lamport and vector clocks, hybrid logical clocks), ordering, leader election, **Raft** (a toy trace simulator: elections, log replication, commit index; solver-checked), Paxos (overview), ZooKeeper/etcd use cases, distributed locks and **fencing tokens**, gossip/membership, unique ID generation (Snowflake, UUIDv4/v7, ULID; trade-offs), and exactly-once myths.

### H11 Reliability Ramparts
Redundancy, failover, multi-AZ and multi-region (active-passive vs active-active, RPO/RTO), timeouts, **retries with exponential backoff + jitter** and retry budgets, circuit breakers, bulkheads, load shedding and admission control, graceful degradation, idempotency, chaos engineering, deployments (rolling, blue-green, canary, feature flags), rollbacks, disaster recovery and backups, and capacity planning.

### H12 Observatory and Security Gate
Observability (metrics, logs, traces; RED/USE methods; SLO-based alerting; cardinality costs) and incident response basics. Security: threat modelling (STRIDE-lite), authN/authZ (RBAC/ABAC), encryption in transit and at rest, KMS and secret management, zero trust, DDoS and abuse mitigation, multi-tenancy isolation, PII handling, audit logs and GDPR basics.

### H13 Platform Port and Big Data Badlands
Monolith vs modular monolith vs microservices (and when each wins), service discovery, service mesh (conceptual), containers and Kubernetes basics (pods, deployments, services, HPA), CI/CD, infrastructure as code, cost optimisation (right-sizing, spot instances, storage tiers), object storage and blob design, search (inverted index, ranking basics), geospatial indexing (geohash, quadtree, S2/H3), probabilistic structures (Bloom filter, HyperLogLog, count-min sketch; maths solver-checked), batch vs stream (MapReduce, Spark, Flink concepts), and data warehouse vs lake vs lakehouse.

---

## Part III: Case Study Skyline (system design problems)

Each is a full Interview Room scenario plus a Siege level, with requirements variants, numbers, a reference design *with alternatives*, deep-dive banks and "what breaks at 10×". Delivered about 2 per run:

1. URL shortener
2. Pastebin
3. Rate limiter service
4. Distributed key-value store
5. Distributed cache
6. Unique ID generator
7. News feed (fan-out on write vs read vs hybrid; the celebrity problem)
8. Notification system
9. Real-time leaderboard
10. Chat / messaging (1:1, groups, presence, delivery receipts, offline)
11. Video streaming (upload pipeline, transcoding, ABR, CDN)
12. Image hosting
13. File sync and storage (chunking, dedup, conflict resolution)
14. Collaborative editor (OT vs CRDT trade-offs)
15. Search autocomplete / typeahead
16. Web crawler
17. Search engine (basic)
18. Ride hailing (geo-indexing, matching, surge)
19. Proximity / nearby places
20. Food delivery
21. Ticket booking / flash sale (inventory contention, queues, fairness)
22. E-commerce checkout
23. Payment system (ledger, double-entry, idempotency, reconciliation)
24. Digital wallet
25. Fraud detection pipeline
26. Metrics and monitoring platform
27. Distributed logging
28. Ad-click aggregation (stream processing, exactly-once-ish counting)
29. Distributed message queue
30. Distributed job scheduler
31. Workflow engine
32. Social graph and friend recommendations
33. Recommendation system (high level)
34. Ads serving
35. Multi-region active-active architecture
36. Zero-downtime database migration
37. Monolith → microservices strangler migration
38. **AI-era:** a RAG-backed support assistant and an LLM gateway (cross-links to Neural Clash)

---

## Part IV: Interview craft

- The **45-minute system design framework** (GDD §5.8) and the **90-minute machine-coding framework** (clarify → model → code core → test → extend → review).
- **Level calibration:** what SDE II / Senior / Staff answers sound like, with an annotated example for each on the same prompt.
- **Communication:** driving the conversation, signposting, checking in with the interviewer, handling "what if…" pushback, admitting unknowns well.
- **Common failure modes** recruiters see: jumping into a solution, no numbers, buzzword architecture, ignoring failure modes, no data model, over-engineering (YAGNI), not answering the question asked.
- **Behavioural adjacency** (Story Forge): design leadership stories, incident stories, trade-off and disagreement stories (STAR, metrics, reflection).
