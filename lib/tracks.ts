/** The two learning tracks shown on the title screen (GDD §1, CUR Parts I–II). */
export interface Track {
  id: "lld" | "hld";
  title: string;
  blurb: string;
  color: string;
  glyph: string;
}

export const TRACKS: readonly Track[] = [
  {
    id: "lld",
    title: "Old Town: Low-Level Design",
    blurb: "Classes, SOLID, design patterns and concurrency. Write C++ by hand; hidden tests and Change Storms judge your design.",
    color: "#7dd3fc",
    glyph: "◫",
  },
  {
    id: "hld",
    title: "The Siege: System Design",
    blurb: "Estimate, cache, shard, replicate and survive chaos. Wire an architecture and watch it handle real traffic.",
    color: "#fbbf24",
    glyph: "⌖",
  },
];
