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

/** Routes planned in ARCH §7 that are not built yet, shown as locked tiles. */
export const UPCOMING_MODES: readonly string[] = ["Old Town lessons", "Workshop problems", "Siege case studies", "Interview mocks"];

export function basePathed(path: string, base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
