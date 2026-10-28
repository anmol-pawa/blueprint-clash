import { describe, expect, it } from "vitest";
import { TRACKS } from "@/lib/tracks";

describe("title screen tracks", () => {
  it("offers exactly the LLD and HLD tracks with distinct colours", () => {
    expect(TRACKS.map((t) => t.id)).toEqual(["lld", "hld"]);
    expect(new Set(TRACKS.map((t) => t.color)).size).toBe(TRACKS.length);
  });
});
