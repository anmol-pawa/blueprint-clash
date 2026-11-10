import { describe, expect, it } from "vitest";
import { explore, PUZZLES } from "@/lib/concurrency";

describe("Race Hunter puzzles", () => {
  for (const pz of PUZZLES) {
    it(`${pz.id}: buggy program has a counterexample`, () => {
      expect(explore(pz.buggy()).findings.length).toBeGreaterThan(0);
    });
    for (const f of pz.fixes) {
      it(`${pz.id}/${f.id}: verdict matches the explanation`, () => {
        const r = explore(f.build());
        const sound = f.id !== "nothing" && f.id !== "if";
        expect(r.proved).toBe(sound);
      });
    }
  }
});
