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
  { href: "/learn", title: "Lessons", blurb: "SOLID in C++: smell, before/after code, interview phrasing, and the cost of overdoing it." },
  { href: "/battle?deck=solid-square", title: "SOLID Square battle", blurb: "43 cards on SRP, OCP, LSP, ISP and DIP, with the over-application costs." },
  { href: "/battle?trainer=sable-quill", title: "Sable Quill duel", blurb: "Six cards on SRP, cohesion, OCP, KISS and DRY." },
  { href: "/battle?trainer=rook-ferris", title: "Rook Ferris duel", blurb: "Six cards on DIP, ISP, LSP and coupling." },
  { href: "/battle?trainer=dova-kiln", title: "Dova Kiln duel", blurb: "Six cards on Factory Method, Abstract Factory and Builder." },
  { href: "/battle?trainer=bram-cask", title: "Bram Cask duel", blurb: "Six cards on Prototype, Singleton, Object Pool and DI." },
  { href: "/review", title: "Daily Review", blurb: "Spaced cards: misses return soon, mastered cards drift away, overdue ones rust." },
  { href: "/party", title: "Party: design battles", blurb: "Match a Patternling to a design smell; super picks befriend it." },
  { href: "/battle/master", title: "Old Town master", blurb: "Warden Hollis Vane: cards, a build and a smell boss." },
  { href: "/battle/master?master=solid-square", title: "Principle Hall master", blurb: "Provost Marlow: concepts, a refactor of your choice and a smell boss." },
];

/** Routes planned in ARCH §7 that are not built yet, shown as locked tiles. */
export const UPCOMING_MODES: readonly string[] = ["Siege case studies", "Interview mocks"];

export function basePathed(path: string, base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
