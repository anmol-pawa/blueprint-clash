import { describe, expect, it } from "vitest";
import { SOLID_LESSONS } from "@/content/lessons/solid-square";
import { compileAndRun } from "@/lib/judge/native";

describe("SOLID Square lessons", () => {
  it("covers the five principles plus heuristics, each with the full teaching shape", () => {
    expect(SOLID_LESSONS.map((l) => l.id)).toEqual(["srp", "ocp", "lsp", "isp", "dip", "heuristics"]);
    for (const l of SOLID_LESSONS) for (const f of ["smell", "idea", "before", "after", "interview", "overApply"] as const) expect(l[f].length, `${l.id}.${f}`).toBeGreaterThan(40);
  });
  for (const l of SOLID_LESSONS) {
    for (const part of ["before", "after"] as const) {
      it(`${l.id} ${part} compiles and runs`, async () => {
        const r = await compileAndRun(`${l[part]}\nint main() { return 0; }\n`, { std: "c++20" });
        expect(r.stderr).toBe("");
        expect(r.ok).toBe(true);
      });
    }
  }
});
