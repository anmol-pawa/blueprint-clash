/** Static facts shown on the title screen. Pure data, no DOM. */

export interface Pillar {
  id: "lld" | "hld";
  title: string;
  blurb: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    id: "lld",
    title: "The Workshop",
    blurb: "Write C++ by hand. Hidden behaviour tests judge it, then Change Storms test whether your design bends or breaks.",
  },
  {
    id: "hld",
    title: "The Siege",
    blurb: "Draw an architecture and watch it face real traffic and chaos in a simulator you can reason about.",
  },
];

export interface PlayableMode {
  href: string;
  title: string;
  blurb: string;
}

/** Routes that exist today, shown as live tiles on the title screen (paths are base-path relative). */
export const PLAYABLE_MODES: readonly PlayableMode[] = [
  { href: "/battle", title: "Concept battle", blurb: "Patternling cards: name the smell, pick the principle." },
  { href: "/workshop/library-management", title: "Workshop: Library", blurb: "Write C++ against hidden tests, then survive a Change Storm." },
  { href: "/workshop/parking-lot", title: "Workshop: Parking lot", blurb: "Fit rules, best-fit allocation and a pricing Change Storm." },
  { href: "/workshop/vending-machine", title: "Workshop: Vending machine", blurb: "The State pattern: coins, refusals that change nothing, and a maintenance-mode Change Storm." },
  { href: "/workshop/elevator-system", title: "Workshop: Elevator system", blurb: "State and Strategy: sweeping cars, a dispatch policy, and an out-of-service Change Storm." },
  { href: "/workshop/tic-tac-toe", title: "Workshop: Tic-tac-toe to Connect-N", blurb: "A small rules engine that must survive two Change Storms: any board size and line length, then undo." },
  { href: "/workshop/snake-and-ladder", title: "Workshop: Snake and Ladder", blurb: "An injected dice, links that must not chain, and two Change Storms: house rules for the end of the board, then players who leave." },
  { href: "/workshop/logger-framework", title: "Workshop: Logger framework", blurb: "Sinks and levels, a chain of handlers per sink, and two Change Storms: levels per category, then collapsing repeated lines." },
  { href: "/workshop/kv-store", title: "Workshop: Key-value store with TTL", blurb: "Expiry against an injected clock, then nested transactions with an undo journal and ordered prefix scans across two Change Storms." },
  { href: "/workshop/lru-lfu-cache", title: "Workshop: LRU / LFU cache", blurb: "Hash map plus recency list, then a pluggable eviction Strategy and a removal listener across two Change Storms." },
  { href: "/board", title: "Design Board drills", blurb: "Draw the classes for a short brief, tag who owns each responsibility, then compare with a reference." },
  { href: "/race", title: "Race Hunter", blurb: "Schedule threads step by step to break a program, then let the explorer check every interleaving of the fix." },
  { href: "/learn", title: "Lessons", blurb: "SOLID in C++: smell, before/after code, interview phrasing, and the cost of overdoing it." },
  { href: "/battle?deck=solid-square", title: "SOLID Square battle", blurb: "43 cards on SRP, OCP, LSP, ISP and DIP, with the over-application costs." },
  { href: "/battle?trainer=sable-quill", title: "Sable Quill duel", blurb: "Six cards on SRP, cohesion, OCP, KISS and DRY." },
  { href: "/battle?trainer=rook-ferris", title: "Rook Ferris duel", blurb: "Six cards on DIP, ISP, LSP and coupling." },
  { href: "/battle?trainer=dova-kiln", title: "Dova Kiln duel", blurb: "Six cards on Factory Method, Abstract Factory and Builder." },
  { href: "/battle?trainer=bram-cask", title: "Bram Cask duel", blurb: "Six cards on Prototype, Singleton, Object Pool and DI." },
  { href: "/battle?trainer=nerys-quay", title: "Nerys Quay duel", blurb: "Six cards on Adapter, Facade and Proxy." },
  { href: "/battle?trainer=tobin-reef", title: "Tobin Reef duel", blurb: "Six cards on Composite, Decorator, Bridge and Flyweight." },
  { href: "/battle?trainer=ilsa-cue", title: "Ilsa Cue duel", blurb: "Six cards on Strategy, Observer, Command and State." },
  { href: "/battle?trainer=perrin-wick", title: "Perrin Wick duel", blurb: "Six cards on Template Method, Iterator, Chain of Responsibility and Mediator." },
  { href: "/battle?trainer=wren-latch", title: "Wren Latch duel", blurb: "Six cards on threads, mutexes and condition variables." },
  { href: "/battle?trainer=pike-tallow", title: "Pike Tallow duel", blurb: "Six cards on atomics, deadlock and thread pools." },
  { href: "/review", title: "Daily Review", blurb: "Spaced cards: misses return soon, mastered cards drift away, overdue ones rust." },
  { href: "/party", title: "Party: design battles", blurb: "Match a Patternling to a design smell; super picks befriend it." },
  { href: "/battle/master", title: "Old Town master", blurb: "Warden Hollis Vane: cards, a build and a smell boss." },
  { href: "/battle/master?master=solid-square", title: "Principle Hall master", blurb: "Provost Marlow: concepts, a refactor of your choice and a smell boss." },
  { href: "/battle/master?master=creational-foundry", title: "Foundry master", blurb: "Foreman Corvo: concepts, one of six builds and a smell boss." },
  { href: "/battle/master?master=structural-bridges", title: "Bridges master", blurb: "Harbourmaster Vale: concepts, one of seven structures and a smell boss." },
  { href: "/battle/master?master=behavioural-theatre", title: "Theatre master", blurb: "Director Voss: concepts, one of eleven patterns and a smell boss." },
  { href: "/battle/master?master=concurrency-docks", title: "Docks master", blurb: "Dockmaster Halyard: concepts, one of five concurrency builds and a smell boss." },
  { href: "/battle?deck=behavioural-theatre", title: "Behavioural Theatre battle", blurb: "30 cards on Strategy, Observer, Command, State, Template Method and Iterator." },
];

/** Routes planned in ARCH §7 that are not built yet, shown as locked tiles. */
export const UPCOMING_MODES: readonly string[] = ["Siege case studies", "Interview mocks"];

export function basePathed(path: string, base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
