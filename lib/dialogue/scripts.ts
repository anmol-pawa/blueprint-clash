import type { DialogueScript } from "./dialogue";

const ADA = "Ada Lintwell";

/** Old Town dialogue. Original wording; Ada sets the learning stance of the whole game. */
export const SCRIPTS: Readonly<Record<string, DialogueScript>> = {
  "ada-intro": {
    id: "ada-intro",
    start: "hello",
    nodes: {
      hello: { speaker: ADA, text: "Ah, the new apprentice. Mind the blueprints on the floor; every one of them is a promise somebody made to a future maintainer.", next: "why" },
      why: { speaker: ADA, text: "Blueprint City keeps crumbling. Not from storms, from change. A rigid design cracks the first time somebody asks for one more feature.", next: "ask" },
      ask: {
        speaker: ADA,
        text: "Before we draw anything: what do you think makes a design good?",
        choices: [
          { text: "It works for today's requirements.", next: "works" },
          { text: "It stays easy to change.", next: "change", set: ["ada-change"] },
          { text: "I am not sure yet.", next: "unsure" },
        ],
      },
      works: { speaker: ADA, text: "Working is the entry fee, not the prize. Plenty of code works and still fights you on Tuesday. Keep that in mind; we will test it with storms.", next: "bye" },
      change: { speaker: ADA, text: "Exactly the instinct I hoped for. Cheap change is the whole game. We will measure it, too.", next: "bye" },
      unsure: { speaker: ADA, text: "Honest answer. You will have your own by the end of the district.", next: "bye" },
      bye: { speaker: ADA, text: "Take a draftling from the shelf when you are ready. Then step out into the square; the notice boards will tell you what the town needs.", set: ["met-ada"] },
    },
  },
  "sign-welcome": {
    id: "sign-welcome",
    start: "a",
    nodes: { a: { text: "OLD TOWN. Population: classes, objects, and one very patient mentor. Drafting Hall straight ahead." } },
  },
  "board-quest": {
    id: "board-quest",
    start: "a",
    nodes: { a: { text: "NOTICE: Who owns this resource? Please settle ownership before the next release. -- Town Council of Smart Pointers" } },
  },
  "sign-solid-square": {
    id: "sign-solid-square",
    start: "a",
    nodes: { a: { text: "SOLID SQUARE. Five pillars, five habits: one reason to change, open for extension, honest substitutes, small interfaces, depend on abstractions. Old Town is back south; the Creational Foundry is through the east gate." } },
  },
  "sign-bridges": {
    id: "sign-bridges",
    start: "a",
    nodes: { a: { text: "STRUCTURAL BRIDGES. Two parts that do not fit, one part that must look like many, a thing too heavy to build twice. Adapters, bridges, composites, decorators, facades, flyweights, proxies. The Creational Foundry is back west; the Behavioural Theatre is through the east gate." } },
  },
  "sign-theatre": {
    id: "sign-theatre",
    start: "a",
    nodes: { a: { text: "BEHAVIOURAL THEATRE. Objects are cast, cues are passed, scripts are swapped mid-act. Strategy, observer, command, state, and the rest of the cast: who does what, and who tells whom. The Structural Bridges are back west; the Concurrency Docks are through the east gate." } },
  },
  "sign-docks": {
    id: "sign-docks",
    start: "a",
    nodes: { a: { text: "CONCURRENCY DOCKS. Many hands, one quay. Lock the crate, keep the order, wait on the right signal, and never trust a flag nobody published. Mutexes, condition variables, atomics, deadlocks and thread pools. The Behavioural Theatre is back west." } },
  },
  "sign-foundry": {
    id: "sign-foundry",
    start: "a",
    nodes: { a: { text: "CREATIONAL FOUNDRY. Who decides which object gets built, and how? Factories, builders, prototypes, pools. Mind the molten channel. SOLID Square is back west; the Structural Bridges are through the east gate." } },
  },
  "sable-intro": {
    id: "sable-intro",
    start: "a",
    nodes: {
      a: { speaker: "Sable Quill", text: "A class that writes the receipt, stores the receipt and decides the discount has three reasons to change. I count three meetings you will be pulled into.", next: "q" },
      q: {
        speaker: "Sable Quill",
        text: "So: is every class with two methods a violation of the Single Responsibility Principle?",
        choices: [
          { text: "Yes. One method per class, always.", next: "no" },
          { text: "No. It is about reasons to change, not method count.", next: "yes", set: ["sable-srp"] },
        ],
      },
      no: { speaker: "Sable Quill", text: "That road ends in a thousand one-method classes and a reader who cannot find anything. Split along who asks for the change, not along verbs.", next: "bye" },
      yes: { speaker: "Sable Quill", text: "Good. Responsibility means a reason to change, usually one stakeholder. Cohesion is the test; method count is not.", next: "bye" },
      bye: { speaker: "Sable Quill", text: "Want a proper duel? Battle menu: Sable Quill duel. Six cards. After that, the Hall's master will test this properly." },
    },
  },
  "rook-intro": {
    id: "rook-intro",
    start: "a",
    nodes: {
      a: { speaker: "Rook Ferris", text: "My notifier called the email library directly. Then Marketing wanted SMS. I spent a week on a one-line idea.", next: "q" },
      q: {
        speaker: "Rook Ferris",
        text: "Dependency inversion, then. Which way should the arrow between policy and detail point?",
        choices: [
          { text: "Detail depends on an abstraction the policy owns.", next: "yes", set: ["rook-dip"] },
          { text: "Policy depends on the concrete detail.", next: "no" },
        ],
      },
      yes: { speaker: "Rook Ferris", text: "Right. The policy defines the interface it needs and the detail plugs into it. A caution: do not invent an interface for every class. Add one where a second implementation or a test double is real.", next: "bye" },
      no: { speaker: "Rook Ferris", text: "That is how I got my week. Flip it: the high-level code states what it needs, and the low-level code adapts.", next: "bye" },
      bye: { speaker: "Rook Ferris", text: "Fight me from the Battle menu: Rook Ferris duel. I will bring a fake clock." },
    },
  },
  "corvo-intro": {
    id: "corvo-intro",
    start: "a",
    nodes: {
      a: { speaker: "Foreman Corvo", text: "Every pattern on this floor is a tool for one job: deciding who builds, and who knows how it was built. Pick the wrong tool and you pay in tests you cannot write.", next: "q" },
      q: {
        speaker: "Foreman Corvo",
        text: "Your service needs one HTTP client with a base URL and retries. A teammate suggests a Singleton. What do you ask first?",
        choices: [
          { text: "Nothing. One client, so a Singleton is the obvious fit.", next: "no" },
          { text: "Why can't it be created once at startup and passed in? A global hides the dependency and blocks test doubles.", next: "yes", set: ["corvo-singleton"] },
        ],
      },
      no: { speaker: "Foreman Corvo", text: "'Only one exists' is a lifetime fact, not a design reason. A Singleton also hides the dependency and makes every test share state. Inject it, and keep the single instance in main().", next: "bye" },
      yes: { speaker: "Foreman Corvo", text: "Good. Name the pattern, then name what it costs. Interviewers listen for the second half.", next: "bye" },
      bye: { speaker: "Foreman Corvo", text: "When you have trained on the Foundry cards and the six build drills, take my trial from the Battle menu: Foundry master. Three phases, one badge." },
    },
  },
  "dova-intro": {
    id: "dova-intro",
    start: "a",
    nodes: {
      a: { speaker: "Dova Kiln", text: "Every new product used to mean editing the same switch statement in six places. Somebody always missed one.", next: "q" },
      q: {
        speaker: "Dova Kiln",
        text: "Where should the decision of which concrete type to build live?",
        choices: [
          { text: "In one place callers ask, so they depend on the abstract product only.", next: "yes", set: ["dova-factory"] },
          { text: "At every call site, with new next to the code that uses it.", next: "no" },
        ],
      },
      yes: { speaker: "Dova Kiln", text: "Right. A factory keeps the choice in one spot. A switch inside it still grows, so a registry of creators is the next step when types are added often. Do not build one for two types that never change.", next: "bye" },
      no: { speaker: "Dova Kiln", text: "That is my six-place switch. Callers should name what they need, and one creator decides how it is made.", next: "bye" },
      bye: { speaker: "Dova Kiln", text: "Want a duel? Battle menu: Dova Kiln duel. Six cards on factories and builders." },
    },
  },
  "bram-intro": {
    id: "bram-intro",
    start: "a",
    nodes: {
      a: { speaker: "Bram Cask", text: "Our log writer was a global. Tests shared it, ran in a different order, and failed on Tuesdays.", next: "q" },
      q: {
        speaker: "Bram Cask",
        text: "A Singleton guarantees one instance. What is the usual cost?",
        choices: [
          { text: "Hidden global state: callers reach for it, so tests and ownership get hard.", next: "yes", set: ["bram-singleton"] },
          { text: "None. One instance is always cheaper and safer.", next: "no" },
        ],
      },
      yes: { speaker: "Bram Cask", text: "Yes. If you truly need one, use a Meyers singleton, but pass it in as an interface so only the composition root knows it is single.", next: "bye" },
      no: { speaker: "Bram Cask", text: "One instance is not free. Anyone can reach it, so every test inherits its state. Prefer to inject one object you created once.", next: "bye" },
      bye: { speaker: "Bram Cask", text: "Duel me from the Battle menu: Bram Cask duel. Prototypes, pools, singletons and DI." },
    },
  },
  "nerys-intro": {
    id: "nerys-intro",
    start: "a",
    nodes: {
      a: { speaker: "Nerys Quay", text: "A supplier's SDK returns dollars as doubles and error codes as ints. Our code speaks cents and enums. Do I rewrite our code?", next: "q" },
      q: {
        speaker: "Nerys Quay",
        text: "How do you let our code use that SDK without spreading its quirks everywhere?",
        choices: [
          { text: "Wrap it in an adapter that implements our interface and translates at the edge.", next: "yes", set: ["nerys-adapter"] },
          { text: "Call the SDK directly and convert at every call site.", next: "no" },
        ],
      },
      yes: { speaker: "Nerys Quay", text: "Right. One class owns the translation, so the rest of the code never learns the vendor's units. If you only need a simpler front for your own subsystems, that is a facade, not an adapter.", next: "bye" },
      no: { speaker: "Nerys Quay", text: "Then every caller owns a copy of the conversion, and one of them will forget the cents. Translate once, at the boundary.", next: "bye" },
      bye: { speaker: "Nerys Quay", text: "Duel me from the Battle menu: Nerys Quay duel. Six cards on adapters, facades and proxies." },
    },
  },
  "tobin-intro": {
    id: "tobin-intro",
    start: "a",
    nodes: {
      a: { speaker: "Tobin Reef", text: "We ship crates, pallets of crates and containers of pallets. Customs wants the total weight of any of them.", next: "q" },
      q: {
        speaker: "Tobin Reef",
        text: "Which structure lets callers treat one crate and a whole container the same way?",
        choices: [
          { text: "Composite: one interface, with leaves and containers that forward to their children.", next: "yes", set: ["tobin-composite"] },
          { text: "A type check at every call site: crate here, container there.", next: "no" },
        ],
      },
      yes: { speaker: "Tobin Reef", text: "Yes. Callers ask for the weight and the tree does the walking. The cost is that the shared interface can force leaves to carry methods they cannot meaningfully answer.", next: "bye" },
      no: { speaker: "Tobin Reef", text: "Those checks multiply with every new kind of crate. Give both one interface and let each decide how to answer.", next: "bye" },
      bye: { speaker: "Tobin Reef", text: "Duel me from the Battle menu: Tobin Reef duel. Composite, decorator, bridge and flyweight." },
    },
  },
  "vale-intro": {
    id: "vale-intro",
    start: "a",
    nodes: {
      a: { speaker: "Harbourmaster Vale", text: "Nothing on this quay is built for its own sake. Every structure here exists to let two things that were never designed together work side by side.", next: "q" },
      q: {
        speaker: "Harbourmaster Vale",
        text: "A new payment vendor has a different interface from the one your code already calls. You own the call sites, not the vendor. What do you reach for?",
        choices: [
          { text: "Edit every call site to speak the vendor's dialect.", next: "no" },
          { text: "An Adapter: keep our interface, translate inside one class, and keep the vendor out of the rest of the code.", next: "yes", set: ["vale-adapter"] },
        ],
      },
      no: { speaker: "Harbourmaster Vale", text: "Now the vendor's quirks live in forty files, and the next vendor costs forty more edits. Translate in one place instead.", next: "bye" },
      yes: { speaker: "Harbourmaster Vale", text: "Good. Say the cost too: one more class, and a lowest-common-denominator interface if the two models differ a lot.", next: "bye" },
      bye: { speaker: "Harbourmaster Vale", text: "When you have trained on the Bridges cards and the seven structure drills, take my trial from the Battle menu: Bridges master. Three phases, one badge." },
    },
  },
  "ilsa-intro": {
    id: "ilsa-intro",
    start: "a",
    nodes: {
      a: { speaker: "Ilsa Cue", text: "Tonight the venue wants three lighting plans: matinee, gala and rehearsal. The show code is the same; only the plan changes.", next: "q" },
      q: {
        speaker: "Ilsa Cue",
        text: "How do you let the show swap plans without an if-chain on a plan name?",
        choices: [
          { text: "Strategy: put each plan behind one interface and inject the one you want.", next: "yes", set: ["ilsa-strategy"] },
          { text: "A switch on a plan enum inside the show, extended for every new plan.", next: "no" },
        ],
      },
      yes: { speaker: "Ilsa Cue", text: "Right. Adding a plan is a new class, and the show never changes. The cost is more small types and a choice of who picks the plan. For two stable plans, a plain if is fine.", next: "bye" },
      no: { speaker: "Ilsa Cue", text: "That switch grows with every venue and every change reopens the show class. Pull the varying part out behind an interface.", next: "bye" },
      bye: { speaker: "Ilsa Cue", text: "Duel me from the Battle menu: Ilsa Cue duel. Six cards on Strategy, Observer, Command and State." },
    },
  },
  "perrin-intro": {
    id: "perrin-intro",
    start: "a",
    nodes: {
      a: { speaker: "Perrin Wick", text: "Every rehearsal runs the same steps: set the stage, run the scene, strike the set. Only the scene differs between plays.", next: "q" },
      q: {
        speaker: "Perrin Wick",
        text: "How do you fix the order of the steps but let each play supply its own scene?",
        choices: [
          { text: "Template Method: a base class owns the sequence and calls overridable steps.", next: "yes", set: ["perrin-template"] },
          { text: "Copy the whole rehearsal routine into each play and edit the middle.", next: "no" },
        ],
      },
      yes: { speaker: "Perrin Wick", text: "Yes. The skeleton lives once and subclasses fill the gaps. The price is inheritance: if the steps need to change at runtime, a strategy is the better fit.", next: "bye" },
      no: { speaker: "Perrin Wick", text: "Then a fix to the strike step has to be made in every copy, and one will be missed. Keep the sequence in one place.", next: "bye" },
      bye: { speaker: "Perrin Wick", text: "Duel me from the Battle menu: Perrin Wick duel. Template Method, Iterator, Chain of Responsibility and Mediator." },
    },
  },
  "voss-intro": {
    id: "voss-intro",
    start: "a",
    nodes: {
      a: { speaker: "Director Voss", text: "A play runs because nobody on stage needs to know who else is on stage. They respond to cues, not to each other.", next: "q" },
      q: {
        speaker: "Director Voss",
        text: "Your editor must notify the minimap, the status bar and autosave whenever the document changes. Tomorrow there will be a fourth listener. What shape do you give it?",
        choices: [
          { text: "The document calls each of the three directly, and we add a fourth call later.", next: "no" },
          { text: "Observer: listeners subscribe to the document, which publishes changes and never names them.", next: "yes", set: ["voss-observer"] },
        ],
      },
      no: { speaker: "Director Voss", text: "Now every new listener edits the document class, and the document cannot be tested without all of them. Invert the dependency.", next: "bye" },
      yes: { speaker: "Director Voss", text: "Good. Name the cost too: notification order is implicit, and a listener that unsubscribes mid-callback can bite you.", next: "bye" },
      bye: { speaker: "Director Voss", text: "When you have rehearsed the Theatre cards and the eleven pattern drills, take my trial from the Battle menu: Theatre master. Three phases, one badge." },
    },
  },
  "wren-intro": {
    id: "wren-intro",
    start: "a",
    nodes: {
      a: { speaker: "Wren Latch", text: "Four crane crews add crates to one shared tally. Some nights the total comes out short, and never by the same amount.", next: "q" },
      q: {
        speaker: "Wren Latch",
        text: "What is going on, and what is the smallest honest fix?",
        choices: [
          { text: "A data race: two read-modify-writes interleave. Guard the tally with a mutex held by an RAII lock.", next: "yes", set: ["wren-mutex"] },
          { text: "The compiler is dropping writes. Mark the tally volatile.", next: "no" },
        ],
      },
      yes: { speaker: "Wren Latch", text: "Yes. The lost update is the interleaving, not the compiler. A scoped guard also releases on every return path. If it is only a counter, an atomic is lighter; if several fields must agree, keep the mutex.", next: "bye" },
      no: { speaker: "Wren Latch", text: "volatile does not make a read-modify-write atomic or order anything between threads. Use a mutex, or an atomic if one variable is all there is.", next: "bye" },
      bye: { speaker: "Wren Latch", text: "Duel me from the Battle menu: Wren Latch duel. Six cards on threads, mutexes and condition variables." },
    },
  },
  "pike-intro": {
    id: "pike-intro",
    start: "a",
    nodes: {
      a: { speaker: "Pike Tallow", text: "Two cranes each need the same pair of hooks. One grabs hook A then B; the other grabs B then A. At dusk they both stop and neither moves.", next: "q" },
      q: {
        speaker: "Pike Tallow",
        text: "How do you stop the standoff without adding timeouts everywhere?",
        choices: [
          { text: "Make every crane take the hooks in one agreed order, or lock both at once with std::scoped_lock.", next: "yes", set: ["pike-order"] },
          { text: "Sleep a random moment before each grab and hope they miss each other.", next: "no" },
        ],
      },
      yes: { speaker: "Pike Tallow", text: "Right: break the circular wait. A global order is free at run time but needs discipline; scoped_lock does the ordering for you when you can take both together.", next: "bye" },
      no: { speaker: "Pike Tallow", text: "That only makes the standoff rarer, which is worse to debug. Remove the cycle instead of dodging it.", next: "bye" },
      bye: { speaker: "Pike Tallow", text: "Duel me from the Battle menu: Pike Tallow duel. Six cards on atomics, deadlock and thread pools." },
    },
  },
  "halyard-intro": {
    id: "halyard-intro",
    start: "a",
    nodes: {
      a: { speaker: "Dockmaster Halyard", text: "Every crate on this quay is safe if only one person touches it at a time. The hard part is not the lock. It is deciding what the lock is protecting.", next: "q" },
      q: {
        speaker: "Dockmaster Halyard",
        text: "Two threads each do `if (!ready) { ready = true; init(); }` on a plain bool. Both pass the check. What fixes it?",
        choices: [
          { text: "Make the check and the set one atomic step: std::call_once, or a mutex around the whole check-and-init.", next: "yes", set: ["halyard-once"] },
          { text: "Mark the bool volatile so each thread sees the other's write.", next: "no" },
        ],
      },
      no: { speaker: "Dockmaster Halyard", text: "volatile is not synchronisation in C++. The check and the set are still two steps, so both threads can still win. Make them one step.", next: "bye" },
      yes: { speaker: "Dockmaster Halyard", text: "Good. Name the trade-off as well: a mutex is simple but taxes every later read; call_once or an atomic flag with acquire/release makes the fast path cheap and is harder to get right.", next: "bye" },
      bye: { speaker: "Dockmaster Halyard", text: "My formal trial is not ready yet. Rehearse on the Docks cards, Race Hunter and exercises, then return." },
    },
  },
  "board-solid": {
    id: "board-solid",
    start: "a",
    nodes: { a: { text: "NOTICE: A rule used without its trade-off is a superstition. Read the lessons, then argue with them. -- The Pillar Society" } },
  },
  "marlow-intro": {
    id: "marlow-intro",
    start: "a",
    nodes: {
      a: { speaker: "Provost Marlow", text: "Five gems on my staff, one per principle. Every one has a price when you over-apply it, and the price is where most candidates stumble.", next: "q" },
      q: {
        speaker: "Provost Marlow",
        text: "A colleague wraps every class in an interface 'for flexibility' and has one implementation of each. Which principle did they honour?",
        choices: [
          { text: "Dependency Inversion, so it is fine.", next: "no" },
          { text: "None. That is speculative generality; add the seam when a second implementation or a test double is real.", next: "yes", set: ["marlow-yagni"] },
        ],
      },
      no: { speaker: "Provost Marlow", text: "An abstraction with no second user is cost without benefit: more files, more indirection, the same coupling. Principles justify seams; they do not demand them.", next: "bye" },
      yes: { speaker: "Provost Marlow", text: "Well said. In an interview, say the principle and its cost in the same breath. That is the senior signal.", next: "bye" },
      bye: { speaker: "Provost Marlow", text: "When you have trained on the cards and the refactor drills, take my trial from the Battle menu: Principle Hall master. Three phases, one badge." },
    },
  },
  "board-patterns": {
    id: "board-patterns",
    start: "a",
    nodes: { a: { text: "NOTICE: Patterns are names for problems you already have. District of the Pattern Quarter opens later." } },
  },
  "chalkboard-uml": {
    id: "chalkboard-uml",
    start: "a",
    nodes: { a: { text: "A chalk sketch: a box labelled Shape with an arrow from Circle and Square. 'Depend on the box, not the arrows.'" } },
  },
};
